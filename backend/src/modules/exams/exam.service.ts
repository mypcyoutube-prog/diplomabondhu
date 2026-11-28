import { Types } from 'mongoose';
import { conflict, notFound, validationError } from '../../core/errors';
import { withVersionBump } from '../../core/with-version-bump';
import { Exam, type IExam } from '../../models/exam.model';
import { Question, type IQuestion } from '../../models/question.model';
import { ExamAttempt, type IExamAttempt } from '../../models/exam-attempt.model';
import { writeAudit } from '../../models/audit-log.model';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripQuestion(q: IQuestion | Record<string, unknown>) {
  const doc = q as Record<string, unknown>;
  return {
    _id: doc._id, type: doc.type, subjectId: doc.subjectId, chapterId: doc.chapterId,
    text: doc.text, textBn: doc.textBn, options: doc.options, marks: doc.marks
  };
}

async function publishedQuestionsOf(exam: IExam): Promise<IQuestion[]> {
  const questions = await Question.find({
    _id: { $in: exam.questionIds }, status: 'published', deletedAt: null
  }).lean();
  if (questions.length === 0) throw conflict('Exam has no published questions yet');
  return questions as unknown as IQuestion[];
}

export type ListExamsOptions = { type?: string; subjectId?: string; chapterId?: string; semesterId?: string; page: number; limit: number };

export async function listPublishedExams(query: ListExamsOptions) {
  const filter: Record<string, unknown> = { status: 'published', deletedAt: null };
  if (query.type) filter.type = query.type;
  if (query.subjectId) filter['hierarchyRefs.subjectId'] = new Types.ObjectId(query.subjectId);
  if (query.chapterId) filter['hierarchyRefs.chapterId'] = new Types.ObjectId(query.chapterId);
  if (query.semesterId) filter['hierarchyRefs.semesterId'] = new Types.ObjectId(query.semesterId);
  const [items, total] = await Promise.all([
    Exam.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Exam.countDocuments(filter)
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total } };
}

export async function getPublishedExam(examId: string): Promise<IExam> {
  if (!Types.ObjectId.isValid(examId)) throw notFound('Exam not found');
  const exam = await Exam.findOne({ _id: new Types.ObjectId(examId), status: 'published', deletedAt: null });
  if (!exam) throw notFound('Exam not found');
  return exam;
}

export async function getExamWithQuestions(examId: string) {
  const exam = await getPublishedExam(examId);
  const questions = await Question.find({
    _id: { $in: exam.questionIds }, status: 'published', deletedAt: null
  }).lean();
  return {
    exam: {
      _id: exam._id, title: exam.title, description: exam.description, type: exam.type,
      durationSec: exam.durationSec, marksPerQuestion: exam.marksPerQuestion,
      negativeMarkPercent: exam.negativeMarkPercent, shuffle: exam.shuffle,
      scheduledAt: exam.scheduledAt, questionCount: questions.length
    },
    questions: questions.map(stripQuestion)
  };
}

export async function startAttempt(examId: string, userId: string) {
  const exam = await getPublishedExam(examId);
  if (exam.scheduledAt && exam.scheduledAt.getTime() > Date.now()) {
    throw conflict('Exam is not open yet');
  }

  const existing = await ExamAttempt.findOne({
    examId: exam._id, userId: new Types.ObjectId(userId), status: 'active', deletedAt: null
  });
  if (existing) {
    const questions = await Question.find({ _id: { $in: existing.questionOrder } }).lean();
    return { attempt: existing, questions: questions.map(stripQuestion), resumed: true };
  }

  const questions = await publishedQuestionsOf(exam);
  let order = questions.map((q) => q._id as Types.ObjectId);
  if (exam.shuffle) order = order.slice().sort(() => Math.random() - 0.5);

  const now = new Date();
  const attempt = await ExamAttempt.create({
    examId: exam._id,
    userId: new Types.ObjectId(userId),
    questionOrder: order,
    startedAt: now,
    deadlineAt: new Date(now.getTime() + exam.durationSec * 1000),
    answers: {}
  });
  const ordered = order.map((id) => questions.find((q) => String(q._id) === String(id))!) as IQuestion[];
  return { attempt, questions: ordered.map(stripQuestion), resumed: false };
}

export async function saveAnswer(userId: string, attemptId: string, questionId: string, selectedKey: string) {
  if (!Types.ObjectId.isValid(attemptId)) throw notFound('Attempt not found');
  const attempt = await ExamAttempt.findOne({
    _id: new Types.ObjectId(attemptId), userId: new Types.ObjectId(userId), status: 'active', deletedAt: null
  });
  if (!attempt) throw notFound('Active attempt not found');
  if (attempt.deadlineAt.getTime() < Date.now()) {
    throw conflict('Attempt deadline has passed; answers are no longer accepted');
  }
  if (!attempt.questionOrder.some((id) => String(id) === questionId)) {
    throw validationError('Question is not part of this attempt');
  }
  await ExamAttempt.updateOne(
    { _id: attempt._id },
    { $set: { [`answers.${questionId}`]: selectedKey } }
  );
  return { saved: true };
}

export async function submitAttempt(userId: string, attemptId: string) {
  if (!Types.ObjectId.isValid(attemptId)) throw notFound('Attempt not found');
  const attempt = await ExamAttempt.findOne({
    _id: new Types.ObjectId(attemptId), userId: new Types.ObjectId(userId), deletedAt: null
  });
  if (!attempt) throw notFound('Attempt not found');
  if (attempt.status === 'submitted') return { attempt, alreadySubmitted: true };

  const exam = await Exam.findById(attempt.examId);
  if (!exam) throw notFound('Exam not found');

  const questions = await Question.find({ _id: { $in: attempt.questionOrder } }).lean() as unknown as IQuestion[];
  const byId = new Map(questions.map((q) => [String(q._id), q]));

  let correctCount = 0, wrongCount = 0, unansweredCount = 0, marksObtained = 0;
  const perQuestion = attempt.questionOrder.map((qid) => {
    const q = byId.get(String(qid));
    const selectedKey = attempt.answers?.get(String(qid));
    if (!q) return { questionId: qid, correctKey: '', isCorrect: false, marks: 0 };
    if (!selectedKey) { unansweredCount += 1; return { questionId: qid, correctKey: q.correctKey, isCorrect: false, marks: 0 }; }
    const isCorrect = selectedKey === q.correctKey;
    if (isCorrect) { correctCount += 1; marksObtained += q.marks; }
    else {
      wrongCount += 1;
      marksObtained -= (q.marks * exam.negativeMarkPercent) / 100;
    }
    return { questionId: qid, selectedKey, correctKey: q.correctKey, isCorrect, marks: q.marks };
  });

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
  marksObtained = Math.max(0, Math.round(marksObtained * 100) / 100);
  const percent = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 10000) / 100 : 0;

  attempt.status = 'submitted';
  attempt.submittedAt = new Date();
  attempt.scoring = {
    totalMarks: Math.round(totalMarks * 100) / 100,
    marksObtained, correctCount, wrongCount, unansweredCount, percent
  };
  attempt.perQuestion = perQuestion as never;
  await attempt.save();
  return { attempt, alreadySubmitted: false };
}

export async function getAttemptResult(userId: string, attemptId: string) {
  if (!Types.ObjectId.isValid(attemptId)) throw notFound('Attempt not found');
  const attempt = await ExamAttempt.findOne({
    _id: new Types.ObjectId(attemptId), userId: new Types.ObjectId(userId), deletedAt: null
  });
  if (!attempt) throw notFound('Attempt not found');
  if (attempt.status !== 'submitted') throw conflict('Attempt has not been submitted yet');
  const exam = await Exam.findById(attempt.examId).lean();
  const questions = await Question.find({ _id: { $in: attempt.questionOrder } }).lean();
  const explanationById = new Map(questions.map((q) => [String(q._id), (q as unknown as IQuestion).explanation]));
  return {
    attemptId: attempt._id,
    examTitle: exam?.title,
    submittedAt: attempt.submittedAt,
    scoring: attempt.scoring,
    perQuestion: (attempt.perQuestion ?? []).map((p) => ({
      questionId: String(p.questionId),
      selectedKey: p.selectedKey,
      correctKey: p.correctKey,
      isCorrect: p.isCorrect,
      marks: p.marks,
      explanation: explanationById.get(String(p.questionId))
    }))
  };
}

export async function listMyAttempts(userId: string, page: number, limit: number) {
  const filter = { userId: new Types.ObjectId(userId), deletedAt: null };
  const [items, total] = await Promise.all([
    ExamAttempt.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('examId', 'title type').lean(),
    ExamAttempt.countDocuments(filter)
  ]);
  return { items, meta: { page, limit, total } };
}

export async function myStats(userId: string) {
  const attempts = await ExamAttempt.find({
    userId: new Types.ObjectId(userId), status: 'submitted', deletedAt: null
  }).select('scoring').lean();
  const scored = attempts.map((a) => (a as unknown as IExamAttempt).scoring).filter(Boolean);
  const count = scored.length;
  const avgPercent = count ? Math.round((scored.reduce((s, x) => s + (x?.percent ?? 0), 0) / count) * 100) / 100 : 0;
  const bestPercent = count ? Math.max(...scored.map((x) => x?.percent ?? 0)) : 0;
  const totalCorrect = scored.reduce((s, x) => s + (x?.correctCount ?? 0), 0);
  const totalWrong = scored.reduce((s, x) => s + (x?.wrongCount ?? 0), 0);
  return { attempts: count, avgPercent, bestPercent, totalCorrect, totalWrong };
}

export async function adminCreateQuestion(body: Record<string, unknown>, actorId: string) {
  const question = await Question.create({ ...(body as object), createdBy: new Types.ObjectId(actorId) });
  await writeAudit({ actorId, action: 'question.create', targetType: 'Question', targetId: String(question._id) });
  return question;
}

export async function adminUpdateQuestion(id: string, body: Record<string, unknown>, actorId: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Question not found');
  const question = await Question.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!question) throw notFound('Question not found');
  Object.assign(question, body);
  await question.save();
  await writeAudit({ actorId, action: 'question.update', targetType: 'Question', targetId: id });
  return question;
}

export async function adminDeleteQuestion(id: string, actorId: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Question not found');
  const result = await Question.updateOne(
    { _id: new Types.ObjectId(id), deletedAt: null },
    withVersionBump({ $set: { deletedAt: new Date(), status: 'draft' } })
  );
  if (result.matchedCount === 0) throw notFound('Question not found');
  await writeAudit({ actorId, action: 'question.delete', targetType: 'Question', targetId: id });
}

export async function adminListQuestions(query: { subjectId?: string; status?: string; q?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (query.subjectId) filter.subjectId = new Types.ObjectId(query.subjectId);
  if (query.status) filter.status = query.status;
  if (query.q) filter.text = { $regex: escapeRegex(query.q), $options: 'i' };
  const [items, total] = await Promise.all([
    Question.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Question.countDocuments(filter)
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total } };
}

export async function adminCreateExam(body: Record<string, unknown>, actorId: string) {
  const questionIds = (body.questionIds as string[]) ?? [];
  const validCount = await Question.countDocuments({
    _id: { $in: questionIds.map((i) => new Types.ObjectId(i)) }, deletedAt: null
  });
  if (validCount !== questionIds.length) throw validationError('One or more questionIds do not exist');
  const exam = await Exam.create({ ...(body as object), createdBy: new Types.ObjectId(actorId) });
  await writeAudit({ actorId, action: 'exam.create', targetType: 'Exam', targetId: String(exam._id), after: { title: exam.title } });
  return exam;
}

export async function adminUpdateExam(id: string, body: Record<string, unknown>, actorId: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Exam not found');
  const exam = await Exam.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!exam) throw notFound('Exam not found');
  Object.assign(exam, body);
  await exam.save();
  await writeAudit({ actorId, action: 'exam.update', targetType: 'Exam', targetId: id });
  return exam;
}

export async function adminSetQuestionStatus(id: string, status: 'published' | 'draft', actorId: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Question not found');
  const question = await Question.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!question) throw notFound('Question not found');
  question.status = status;
  await question.save();
  await writeAudit({ actorId, action: `question.${status}`, targetType: 'Question', targetId: id, after: { status } });
  return question;
}

export async function adminSetExamStatus(id: string, status: 'published' | 'closed' | 'draft', actorId: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Exam not found');
  const exam = await Exam.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!exam) throw notFound('Exam not found');
  if (status === 'published') {
    const count = await Question.countDocuments({
      _id: { $in: exam.questionIds }, status: 'published', deletedAt: null
    });
    if (count === 0) throw conflict('Exam has no published questions; publish questions first');
  }
  exam.status = status;
  await exam.save();
  await writeAudit({ actorId, action: `exam.${status}`, targetType: 'Exam', targetId: id, after: { status } });
  return exam;
}

export async function adminDeleteExam(id: string, actorId: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Exam not found');
  const result = await Exam.updateOne(
    { _id: new Types.ObjectId(id), deletedAt: null },
    withVersionBump({ $set: { deletedAt: new Date(), status: 'closed' } })
  );
  if (result.matchedCount === 0) throw notFound('Exam not found');
  await writeAudit({ actorId, action: 'exam.delete', targetType: 'Exam', targetId: id });
}

export async function adminListExams(query: { status?: string; type?: string; q?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  if (query.q) filter.title = { $regex: escapeRegex(query.q), $options: 'i' };
  const [items, total] = await Promise.all([
    Exam.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Exam.countDocuments(filter)
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total } };
}

export async function adminListAttempts(examId: string, page: number, limit: number) {
  if (!Types.ObjectId.isValid(examId)) throw notFound('Exam not found');
  const filter = { examId: new Types.ObjectId(examId), deletedAt: null };
  const [items, total] = await Promise.all([
    ExamAttempt.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('userId', 'name email').select('-questionOrder -answers -perQuestion').lean(),
    ExamAttempt.countDocuments(filter)
  ]);
  return { items, meta: { page, limit, total } };
}
