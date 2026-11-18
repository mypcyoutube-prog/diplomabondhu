import { Types } from 'mongoose';
import { conflict, notFound, validationError } from '../../core/errors';
import { CalculationProfile, type ICalculationProfile } from '../../models/calculation-profile.model';
import { CalculationHistory } from '../../models/calculation-history.model';
import { writeAudit } from '../../models/audit-log.model';
import {
  computeCgpa, computeSemester, computeTargetCgpa,
  type CalculationProfileData, type CgpaInput, type SemesterResult, type SubjectInput
} from './gpa.engine';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['verification', 'retired'],
  verification: ['testing', 'draft', 'retired'],
  testing: ['approved', 'verification', 'retired'],
  approved: ['published', 'retired'],
  published: ['retired'],
  retired: []
};

export async function getPublishedProfile(profileId: string): Promise<ICalculationProfile> {
  if (!Types.ObjectId.isValid(profileId)) throw notFound('Profile not found');
  const profile = await CalculationProfile.findOne({
    _id: new Types.ObjectId(profileId),
    status: 'published',
    deletedAt: null
  });
  if (!profile) throw notFound('Calculation profile not found or not yet published');
  return profile;
}

export async function calculateSemester(
  profile: ICalculationProfile,
  inputMode: 'marks' | 'grades',
  subjects: SubjectInput[]
): Promise<{ result: SemesterResult; profile: ICalculationProfile }> {
  const normalized = subjects.map((s) => ({ ...s, inputMode }));
  const result = computeSemester(profile.data as CalculationProfileData, normalized);
  return { result, profile };
}

export async function calculateCgpa(profile: ICalculationProfile, semesterGpas: CgpaInput[]) {
  return computeCgpa(profile.data as CalculationProfileData, semesterGpas);
}

export async function saveResult(
  userId: string,
  input: { kind: 'semester' | 'cgpa'; profileId: string; inputs: unknown; output: unknown; label?: string }
) {
  const profile = await getPublishedProfile(input.profileId);
  const doc = await CalculationHistory.create({
    userId: new Types.ObjectId(userId),
    kind: input.kind,
    regulationId: profile.regulationId,
    profileId: profile._id,
    profileVersion: profile.version,
    inputs: input.inputs,
    output: input.output,
    label: input.label
  });
  return doc;
}

export async function listHistory(userId: string, page: number, limit: number) {
  const filter = { userId: new Types.ObjectId(userId), deletedAt: null };
  const [items, total] = await Promise.all([
    CalculationHistory.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    CalculationHistory.countDocuments(filter)
  ]);
  return { items, meta: { page, limit, total } };
}

export async function getHistoryItem(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  const item = await CalculationHistory.findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId), deletedAt: null }).lean();
  if (!item) throw notFound('Result not found');
  return item;
}

export async function deleteHistoryItem(userId: string, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  const result = await CalculationHistory.updateOne(
    { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId), deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
  if (result.matchedCount === 0) throw notFound('Result not found');
}

export async function targetEstimate(profileId: string, targetCgpa: number, completed: CgpaInput[], remainingSemesters: number[]) {
  const profile = await getPublishedProfile(profileId);
  return computeTargetCgpa(profile.data as CalculationProfileData, completed, targetCgpa, remainingSemesters);
}

export async function transitionProfile(profileId: string, to: string, actorId: string, note?: string) {
  if (!Types.ObjectId.isValid(profileId)) throw notFound('Profile not found');
  const profile = await CalculationProfile.findOne({ _id: new Types.ObjectId(profileId), deletedAt: null });
  if (!profile) throw notFound('Profile not found');

  const allowed = ALLOWED_TRANSITIONS[profile.status] ?? [];
  if (!allowed.includes(to)) {
    throw conflict(`Cannot transition from "${profile.status}" to "${to}"`);
  }
  if (to === 'published' && !(profile.testRun.passed)) {
    throw conflict('Profile cannot be published until its test suite has passed');
  }
  if (to === 'published' && profile.verification.sourceRefs.length === 0) {
    throw conflict('Profile cannot be published without official document references');
  }
  if (to === 'verification' && profile.verification.sourceRefs.length === 0) {
    throw validationError('Official document references are required before verification');
  }

  profile.status = to as ICalculationProfile['status'];
  if (to === 'published') profile.publishedAt = new Date();
  await profile.save();
  await writeAudit({ actorId, action: `gpa.profile.${to}`, targetType: 'CalculationProfile', targetId: profileId, after: { version: profile.version, status: to, note } });
  return profile;
}

export interface ProfileIntegrityCheck { name: string; passed: boolean; detail?: string }

export function runProfileIntegrityChecks(data: CalculationProfileData): ProfileIntegrityCheck[] {
  const checks: ProfileIntegrityCheck[] = [];

  const table = [...data.grading.table].sort((a, b) => a.minPercent - b.minPercent);
  checks.push({ name: 'grading table not empty', passed: table.length > 0 });
  checks.push({
    name: 'grading table covers 0-100 without gaps/overlaps',
    passed: table.length > 0 && table[0].minPercent <= 0.01 && table[table.length - 1].maxPercent >= 99.99 &&
      table.every((e, i) => i === 0 || (e.minPercent > table[i - 1].maxPercent - 0.001 && e.minPercent <= table[i - 1].maxPercent + 1.001)),
    detail: table.map((e) => `${e.minPercent}-${e.maxPercent}:${e.grade}`).join(' ')
  });
  checks.push({
    name: 'grade points strictly increasing with marks',
    passed: table.every((e, i) => i === 0 || e.point >= table[i - 1].point)
  });

  for (const [type, components] of Object.entries(data.assessments)) {
    const sum = components.reduce((s, c) => s + c.weightPercent, 0);
    checks.push({ name: `assessment weights sum to 100 for "${type}"`, passed: Math.abs(sum - 100) < 0.001, detail: `sum=${sum}` });
  }

  if (data.cgpa.strategy === 'credit_weighted') {
    const numbers = data.cgpa.semesterWeights.map((w) => w.semesterNumber);
    const allPositive = data.cgpa.semesterWeights.every((w) => w.percent > 0);
    const unique = new Set(numbers).size === numbers.length;
    checks.push({ name: 'CGPA credit weights defined and positive', passed: allPositive && unique && numbers.length > 0, detail: `semesters=${numbers.length}` });
  } else {
    const weightSum = data.cgpa.semesterWeights.reduce((s, w) => s + w.percent, 0);
    checks.push({ name: 'CGPA semester weights sum to 100', passed: Math.abs(weightSum - 100) < 0.001, detail: `sum=${weightSum}` });
  }
  checks.push({ name: 'minimum pass grade exists in grading table', passed: data.grading.table.some((e) => e.grade === data.passRules.minSubjectGrade) });

  return checks;
}

export async function runProfileTestSuite(profileId: string, actorId: string) {
  const profile = await CalculationProfile.findOne({ _id: new Types.ObjectId(profileId), deletedAt: null });
  if (!profile) throw notFound('Profile not found');

  const checks = runProfileIntegrityChecks(profile.data as CalculationProfileData);

  const boundaryFailures: string[] = [];
  const table = profile.data.grading.table;
  for (const entry of table) {
    if (entry.minPercent > entry.maxPercent) boundaryFailures.push(`${entry.grade}: min>max`);
  }
  checks.push({ name: 'grade ranges valid (min<=max)', passed: boundaryFailures.length === 0, detail: boundaryFailures.join('; ') || undefined });

  const passed = checks.every((c) => c.passed);
  profile.testRun = { passed, runAt: new Date(), results: checks };
  await profile.save();
  await writeAudit({ actorId, action: 'gpa.profile.test_run', targetType: 'CalculationProfile', targetId: profileId, after: { passed, version: profile.version } });
  return { passed, checks };
}

export async function listProfilesForStudent(programId?: string, regulationId?: string) {
  const filter: Record<string, unknown> = { status: 'published', deletedAt: null };
  if (regulationId) filter.regulationId = new Types.ObjectId(regulationId);
  const profiles = await CalculationProfile.find(filter).sort({ version: -1 }).lean();
  const latestByRegulation = new Map<string, (typeof profiles)[number]>();
  for (const p of profiles) {
    const key = String(p.regulationId);
    if (!latestByRegulation.has(key)) latestByRegulation.set(key, p);
  }
  return [...latestByRegulation.values()];
}

export { ALLOWED_TRANSITIONS };
