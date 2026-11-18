export interface GradeEntry { minPercent: number; maxPercent: number; grade: string; point: number }
export interface AssessmentComponent { key: string; label: string; maxMarks: number; weightPercent: number; minPercent?: number }
export interface PassRules { minSubjectGrade: string; semesterMinGpa?: number }
export interface CgpaRule { strategy: 'semester_weighted' | 'credit_weighted'; semesterWeights: { semesterNumber: number; percent: number }[]; classBands: { minCgpa: number; label: string }[] }
export interface SpecialRules { allowIncompleteProvisional?: boolean; referredCapGrade?: string; improvementCapGrade?: string }

export interface CalculationProfileData {
  grading: { scale: number; table: GradeEntry[] };
  assessments: Record<string, AssessmentComponent[]>;
  passRules: PassRules;
  cgpa: CgpaRule;
  special: SpecialRules;
}

export type SubjectType = 'theory' | 'practical' | 'theory_practical' | 'project' | 'industrial_training';

export interface SubjectInput {
  subjectId: string;
  code: string;
  name: string;
  credits: number;
  subjectType: SubjectType;
  inputMode: 'marks' | 'grades';
  marks?: Record<string, number>;
  grade?: string;
}

export interface SubjectResult {
  subjectId: string;
  code: string;
  name: string;
  credits: number;
  inputMode: 'marks' | 'grades';
  status: 'passed' | 'failed' | 'incomplete';
  computedPercent?: number;
  grade: string;
  point: number;
  creditPoints: number;
  breakdown: string[];
  failureReasons?: string[];
}

export interface SemesterResult {
  subjects: SubjectResult[];
  gpa: number | null;
  status: 'complete' | 'incomplete';
  totalCredits: number;
  earnedCreditPoints: number;
  notes: string[];
}

import { AppError } from '../../core/errors';

export class GpaValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'GpaValidationError';
  }
}

function findGradeEntry(profile: CalculationProfileData, percent: number): GradeEntry {
  const entry = profile.grading.table.find((e) => percent >= e.minPercent && percent <= e.maxPercent);
  if (!entry) throw new GpaValidationError(`No grade rule found for ${percent}% in this regulation profile`);
  return entry;
}

function gradePointFor(profile: CalculationProfileData, grade: string): GradeEntry {
  const entry = profile.grading.table.find((e) => e.grade === grade);
  if (!entry) throw new GpaValidationError(`Grade "${grade}" does not exist in this regulation's grading table`);
  return entry;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeSemester(profile: CalculationProfileData, subjects: SubjectInput[]): SemesterResult {
  if (subjects.length === 0) throw new GpaValidationError('At least one subject is required');
  const results: SubjectResult[] = [];
  const notes: string[] = [];
  let hasIncomplete = false;

  for (const subject of subjects) {
    const components = profile.assessments[subject.subjectType];
    if (subject.inputMode === 'grades') {
      const entry = gradePointFor(profile, subject.grade ?? '');
      const passed = entry.point > 0 && entry.point >= (profile.passRules.minSubjectGrade ? gradePointFor(profile, profile.passRules.minSubjectGrade).point : 0);
      results.push({
        subjectId: subject.subjectId, code: subject.code, name: subject.name, credits: subject.credits,
        inputMode: 'grades', status: passed ? 'passed' : 'failed',
        grade: entry.grade, point: entry.point,
        creditPoints: round2(subject.credits * entry.point),
        breakdown: [`Grade input "${entry.grade}" -> point ${entry.point.toFixed(2)} [grading table]`, `Credit points: ${subject.credits} x ${entry.point.toFixed(2)} = ${round2(subject.credits * entry.point).toFixed(2)}`],
        failureReasons: passed ? undefined : ['Grade below minimum pass grade']
      });
      continue;
    }

    if (!components || components.length === 0) {
      throw new GpaValidationError(`Subject ${subject.code} (${subject.subjectType}) has no assessment components defined in this profile`);
    }

    const marks = subject.marks ?? {};
    const missing = components.filter((c) => marks[c.key] === undefined || marks[c.key] === null);
    if (missing.length > 0) {
      if (profile.special.allowIncompleteProvisional) {
        hasIncomplete = true;
        notes.push(`${subject.code}: missing components (${missing.map((m) => m.key).join(', ')}) -> marked incomplete`);
        results.push({
          subjectId: subject.subjectId, code: subject.code, name: subject.name, credits: subject.credits,
          inputMode: 'marks', status: 'incomplete', grade: 'I', point: 0, creditPoints: 0,
          breakdown: [`Missing components: ${missing.map((m) => m.label).join(', ')}`],
          failureReasons: ['Missing marks']
        });
        continue;
      }
      throw new GpaValidationError(`${subject.code}: missing marks for ${missing.map((m) => m.label).join(', ')}`);
    }

    let percent = 0;
    const breakdown: string[] = [];
    const failureReasons: string[] = [];
    for (const c of components) {
      const mark = marks[c.key];
      if (typeof mark !== 'number' || Number.isNaN(mark) || mark < 0) {
        throw new GpaValidationError(`${subject.code}: invalid mark for ${c.label}`);
      }
      if (mark > c.maxMarks) {
        throw new GpaValidationError(`${subject.code}: ${c.label} mark ${mark} exceeds maximum ${c.maxMarks}`);
      }
      const componentPercent = (mark / c.maxMarks) * 100;
      if (c.minPercent !== undefined && componentPercent < c.minPercent) {
        failureReasons.push(`${c.label} below minimum (${componentPercent.toFixed(1)}% < ${c.minPercent}%)`);
      }
      percent += (componentPercent * c.weightPercent) / 100;
      breakdown.push(`${c.label}: ${mark}/${c.maxMarks} (${componentPercent.toFixed(1)}%, weight ${c.weightPercent}%)`);
    }

    const roundedPercent = round2(percent);
    const entry = findGradeEntry(profile, roundedPercent);
    breakdown.push(`Total: ${roundedPercent.toFixed(2)}% -> grade ${entry.grade} (point ${entry.point.toFixed(2)}) [grading table]`);
    breakdown.push(`Credit points: ${subject.credits} x ${entry.point.toFixed(2)} = ${round2(subject.credits * entry.point).toFixed(2)}`);

    const passed = entry.point > 0 && failureReasons.length === 0;
    if (!passed && failureReasons.length === 0) failureReasons.push('Grade F');
    results.push({
      subjectId: subject.subjectId, code: subject.code, name: subject.name, credits: subject.credits,
      inputMode: 'marks', status: passed ? 'passed' : 'failed',
      computedPercent: roundedPercent, grade: entry.grade, point: entry.point,
      creditPoints: round2(subject.credits * entry.point), breakdown,
      failureReasons: passed ? undefined : failureReasons
    });
  }

  const totalCredits = results.reduce((s, r) => s + r.credits, 0);
  const graded = results.filter((r) => r.status !== 'incomplete');
  const gradedCredits = graded.reduce((s, r) => s + r.credits, 0);
  const earnedCreditPoints = graded.reduce((s, r) => s + r.creditPoints, 0);

  let gpa: number | null = null;
  if (gradedCredits > 0 && !hasIncomplete) {
    gpa = round2(earnedCreditPoints / gradedCredits);
    if (results.some((r) => r.status === 'failed')) {
      notes.push('One or more subjects failed -> GPA shown is provisional until cleared');
    }
  } else if (hasIncomplete) {
    notes.push('Semester incomplete: missing marks. GPA withheld.');
  }

  return { subjects: results, gpa, status: hasIncomplete ? 'incomplete' : 'complete', totalCredits, earnedCreditPoints, notes };
}

export interface CgpaInput { semesterNumber: number; gpa: number; credits?: number }

export interface CgpaResult {
  cgpa: number | null;
  strategy: string;
  appliedWeights: { semesterNumber: number; percent: number; gpa: number; contribution: number }[];
  totalWeight: number;
  classBand?: string;
  notes: string[];
}

export function computeCgpa(profile: CalculationProfileData, inputs: CgpaInput[]): CgpaResult {
  if (inputs.length === 0) throw new GpaValidationError('At least one semester GPA is required');
  const notes: string[] = [];
  const appliedWeights: CgpaResult['appliedWeights'] = [];

  for (const input of inputs) {
    if (typeof input.gpa !== 'number' || input.gpa < 0 || input.gpa > profile.grading.scale) {
      throw new GpaValidationError(`Semester ${input.semesterNumber}: GPA must be between 0 and ${profile.grading.scale}`);
    }
  }

  let totalWeight: number;
  let cgpa: number | null;

  if (profile.cgpa.strategy === 'credit_weighted') {
    for (const input of inputs) {
      if (typeof input.credits !== 'number' || input.credits <= 0) {
        throw new GpaValidationError(`Semester ${input.semesterNumber}: total credits are required for credit-weighted CGPA`);
      }
    }
    totalWeight = inputs.reduce((s, i) => s + i.credits!, 0);
    const weightedSum = inputs.reduce((s, i) => s + i.gpa * i.credits!, 0);
    cgpa = totalWeight > 0 ? round2(weightedSum / totalWeight) : null;
    for (const input of inputs) {
      appliedWeights.push({
        semesterNumber: input.semesterNumber,
        percent: round2((input.credits! / totalWeight) * 100),
        gpa: input.gpa,
        contribution: round2((input.gpa * input.credits!) / totalWeight)
      });
    }
  } else if (profile.cgpa.strategy === 'semester_weighted') {
    for (const input of inputs) {
      const weight = profile.cgpa.semesterWeights.find((w) => w.semesterNumber === input.semesterNumber);
      if (!weight) throw new GpaValidationError(`Semester ${input.semesterNumber} is not defined in this regulation's CGPA weights`);
      const rawContribution = (input.gpa * weight.percent) / 100;
      appliedWeights.push({
        semesterNumber: input.semesterNumber,
        percent: weight.percent,
        gpa: input.gpa,
        contribution: round2(rawContribution)
      });
    }
    totalWeight = appliedWeights.reduce((s, w) => s + w.percent, 0);
    const weightedSum = appliedWeights.reduce((s, w, i) => s + (inputs[i].gpa * w.percent) / 100, 0);
    cgpa = totalWeight > 0 ? round2((weightedSum * 100) / totalWeight) : null;
  } else {
    throw new GpaValidationError(`CGPA strategy "${profile.cgpa.strategy}" is not supported by this engine build yet`);
  }

  const notesPrefix = totalWeight < 100 ? [`Partial completion: normalized over ${totalWeight}% of total weight (current CGPA)`] : [];
  notes.push(...notesPrefix);

  const definedSemesters = new Set(profile.cgpa.semesterWeights.map((w) => w.semesterNumber));
  const completeCoverage = inputs.every((i) => definedSemesters.has(i.semesterNumber)) &&
    definedSemesters.size > 0 && inputs.length === definedSemesters.size;

  let classBand: string | undefined;
  if (cgpa !== null && (profile.cgpa.strategy === 'credit_weighted' ? completeCoverage : totalWeight === 100)) {
    const band = [...profile.cgpa.classBands].sort((a, b) => b.minCgpa - a.minCgpa).find((b) => cgpa >= b.minCgpa);
    classBand = band?.label;
  }

  return { cgpa, strategy: profile.cgpa.strategy, appliedWeights, totalWeight, classBand, notes };
}

export function computeTargetCgpa(profile: CalculationProfileData, completed: CgpaInput[], targetCgpa: number, remainingSemesters: number[]): { requiredAverageGpa: number | null; feasible: boolean; notes: string[] } {
  const notes: string[] = ['This is an ESTIMATE only - not an official result.'];

  if (remainingSemesters.length === 0) throw new GpaValidationError('At least one remaining semester is required');
  if (targetCgpa > profile.grading.scale) throw new GpaValidationError(`Target CGPA cannot exceed ${profile.grading.scale}`);

  const weightOf = (semesterNumber: number): number => {
    const w = profile.cgpa.semesterWeights.find((x) => x.semesterNumber === semesterNumber);
    if (!w) throw new GpaValidationError(`Semester ${semesterNumber} is not defined in this regulation's CGPA weights`);
    return w.percent;
  };

  const remainingWeight = remainingSemesters.reduce((s, n) => s + weightOf(n), 0);
  const completedWeight = completed.reduce((s, c) => s + weightOf(c.semesterNumber), 0);
  const completedWeightedSum = completed.reduce((s, c) => s + c.gpa * weightOf(c.semesterNumber), 0);

  const totalRelevantWeight = completedWeight + remainingWeight;
  const required = round2((targetCgpa * totalRelevantWeight - completedWeightedSum) / remainingWeight);
  const feasible = required <= profile.grading.scale;
  if (!feasible) {
    notes.push('Target not achievable with remaining semesters even with maximum GPA.');
  } else if (required < 0) {
    notes.push('Target already met based on completed semesters.');
  }
  return { requiredAverageGpa: required, feasible, notes };
}
