import { Router } from 'express';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import { PERMISSIONS } from '../../core/permissions';
import * as svc from './exam.service';
import {
  adminListQuerySchema, answerBodySchema, examBodySchema, idParam,
  listExamsQuerySchema, questionBodySchema, updateExamSchema, updateQuestionSchema
} from './exam.schemas';

type Validated<T> = { validatedQuery?: T; validatedParams?: T };

function attemptParams() {
  return validate({ params: idParam });
}

export function examRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET));

  router.get('/', validate({ query: listExamsQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as Validated<svc.ListExamsOptions>).validatedQuery!;
      const { items, meta } = await svc.listPublishedExams(query);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  router.get('/history', async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const { items, meta } = await svc.listMyAttempts(req.auth!.id, page, limit);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  router.get('/stats', async (req, res, next) => {
    try {
      return ok(res, await svc.myStats(req.auth!.id));
    } catch (err) { next(err); }
  });

  router.get('/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      return ok(res, await svc.getExamWithQuestions(params.id));
    } catch (err) { next(err); }
  });

  router.post('/:id/attempts', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const { attempt, questions, resumed } = await svc.startAttempt(params.id, req.auth!.id);
      return ok(res, {
        attemptId: String(attempt._id),
        startedAt: attempt.startedAt,
        deadlineAt: attempt.deadlineAt,
        questions,
        resumed
      }, resumed ? 200 : 201);
    } catch (err) { next(err); }
  });

  router.patch('/attempts/:id/answer', attemptParams(), validate({ body: answerBodySchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      return ok(res, await svc.saveAnswer(req.auth!.id, params.id, req.body.questionId, req.body.selectedKey));
    } catch (err) { next(err); }
  });

  router.post('/attempts/:id/submit', attemptParams(), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const { attempt, alreadySubmitted } = await svc.submitAttempt(req.auth!.id, params.id);
      return ok(res, { attemptId: String(attempt._id), status: attempt.status, scoring: attempt.scoring, alreadySubmitted });
    } catch (err) { next(err); }
  });

  router.get('/attempts/:id/result', attemptParams(), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      return ok(res, await svc.getAttemptResult(req.auth!.id, params.id));
    } catch (err) { next(err); }
  });

  const admin = Router();
  admin.use(requirePermission(PERMISSIONS.EXAM_MANAGE));

  admin.get('/questions', validate({ query: adminListQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as Validated<{ subjectId?: string; status?: string; q?: string; page: number; limit: number }>).validatedQuery!;
      const { items, meta } = await svc.adminListQuestions(query);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  admin.post('/questions', validate({ body: questionBodySchema }), async (req, res, next) => {
    try {
      const question = await svc.adminCreateQuestion(req.body, req.auth!.id);
      return ok(res, { item: question }, 201);
    } catch (err) { next(err); }
  });

  admin.put('/questions/:id', validate({ params: idParam, body: updateQuestionSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const question = await svc.adminUpdateQuestion(params.id, req.body, req.auth!.id);
      return ok(res, { item: question });
    } catch (err) { next(err); }
  });

  admin.delete('/questions/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      await svc.adminDeleteQuestion(params.id, req.auth!.id);
      return ok(res, { deleted: true });
    } catch (err) { next(err); }
  });

  admin.post('/questions/:id/publish', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const question = await svc.adminSetQuestionStatus(params.id, 'published', req.auth!.id);
      return ok(res, { id: String(question._id), status: question.status });
    } catch (err) { next(err); }
  });

  admin.post('/questions/:id/unpublish', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const question = await svc.adminSetQuestionStatus(params.id, 'draft', req.auth!.id);
      return ok(res, { id: String(question._id), status: question.status });
    } catch (err) { next(err); }
  });

  admin.get('/exams', validate({ query: adminListQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as Validated<{ status?: string; type?: string; q?: string; page: number; limit: number }>).validatedQuery!;
      const { items, meta } = await svc.adminListExams(query);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  admin.post('/exams', validate({ body: examBodySchema }), async (req, res, next) => {
    try {
      const exam = await svc.adminCreateExam(req.body, req.auth!.id);
      return ok(res, { item: exam }, 201);
    } catch (err) { next(err); }
  });

  admin.get('/exams/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const { items, meta } = await svc.adminListAttempts(params.id, 1, 50);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  admin.put('/exams/:id', validate({ params: idParam, body: updateExamSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const exam = await svc.adminUpdateExam(params.id, req.body, req.auth!.id);
      return ok(res, { item: exam });
    } catch (err) { next(err); }
  });

  admin.post('/exams/:id/publish', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const exam = await svc.adminSetExamStatus(params.id, 'published', req.auth!.id);
      return ok(res, { id: String(exam._id), status: exam.status });
    } catch (err) { next(err); }
  });

  admin.post('/exams/:id/close', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const exam = await svc.adminSetExamStatus(params.id, 'closed', req.auth!.id);
      return ok(res, { id: String(exam._id), status: exam.status });
    } catch (err) { next(err); }
  });

  admin.delete('/exams/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      await svc.adminDeleteExam(params.id, req.auth!.id);
      return ok(res, { deleted: true });
    } catch (err) { next(err); }
  });

  router.use('/admin', admin);
  return router;
}
