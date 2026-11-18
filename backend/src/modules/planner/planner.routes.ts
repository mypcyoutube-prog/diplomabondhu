import { Router } from 'express';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import * as svc from './planner.service';
import {
  goalBodySchema, idParam, routineSchema, taskBodySchema, taskUpdateSchema, monthQuerySchema
} from './planner.schemas';

type V<T> = { validatedQuery?: T; validatedParams?: T; validatedBody?: T };

export function plannerRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET));

  router.get('/routine', async (req, res, next) => {
    try { return ok(res, { routine: await svc.getRoutine(req.auth!.id) }); }
    catch (err) { next(err); }
  });

  router.put('/routine', validate({ body: routineSchema }), async (req, res, next) => {
    try { return ok(res, { routine: await svc.saveRoutine(req.auth!.id, req.body.slots) }); }
    catch (err) { next(err); }
  });

  router.get('/tasks', validate({ query: svc.taskListQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as V<svc.TaskListOptions>).validatedQuery!;
      const { items, meta } = await svc.listTasks(req.auth!.id, query);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  router.post('/tasks', validate({ body: taskBodySchema }), async (req, res, next) => {
    try {
      const task = await svc.createTask(req.auth!.id, req.body);
      return ok(res, { item: task }, 201);
    } catch (err) { next(err); }
  });

  router.patch('/tasks/:id', validate({ params: idParam, body: taskUpdateSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const task = await svc.updateTask(req.auth!.id, params.id, req.body);
      return ok(res, { item: task });
    } catch (err) { next(err); }
  });

  router.delete('/tasks/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      await svc.deleteTask(req.auth!.id, params.id);
      return ok(res, { deleted: true });
    } catch (err) { next(err); }
  });

  router.get('/goals', async (req, res, next) => {
    try { return ok(res, { items: await svc.listGoals(req.auth!.id) }); }
    catch (err) { next(err); }
  });

  router.post('/goals', validate({ body: goalBodySchema }), async (req, res, next) => {
    try {
      const goal = await svc.createGoal(req.auth!.id, req.body);
      return ok(res, { item: goal }, 201);
    } catch (err) { next(err); }
  });

  router.patch('/goals/:id', validate({ params: idParam, body: svc.goalUpdateSchemaPublic }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const goal = await svc.updateGoal(req.auth!.id, params.id, req.body);
      return ok(res, { item: goal });
    } catch (err) { next(err); }
  });

  router.delete('/goals/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      await svc.deleteGoal(req.auth!.id, params.id);
      return ok(res, { deleted: true });
    } catch (err) { next(err); }
  });

  router.get('/calendar', validate({ query: monthQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as V<{ month: string }>).validatedQuery!;
      return ok(res, await svc.getCalendar(req.auth!.id, query.month));
    } catch (err) { next(err); }
  });

  return router;
}
