import { Types } from 'mongoose';
import { notFound } from '../../core/errors';
import { Routine, type IRoutine } from '../../models/routine.model';
import { Task, type ITask } from '../../models/task.model';
import { Goal, type IGoal } from '../../models/goal.model';
import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const taskListQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['todo', 'done']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
}).strict();

export type TaskListOptions = z.infer<typeof taskListQuerySchema>;

export const goalUpdateSchemaPublic = z.object({
  title: z.string().trim().min(2).max(300).optional(),
  description: z.string().max(5000).optional(),
  targetDate: z.coerce.date().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  status: z.enum(['active', 'achieved', 'abandoned']).optional()
}).strict();

export async function getRoutine(userId: string): Promise<IRoutine> {
  const routine = await Routine.findOne({ userId: new Types.ObjectId(userId), deletedAt: null });
  return routine ?? ({ userId, slots: [] } as unknown as IRoutine);
}

export async function saveRoutine(userId: string, slots: IRoutine['slots']): Promise<IRoutine> {
  const routine = await Routine.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { $set: { slots } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return routine as IRoutine;
}

export async function listTasks(userId: string, query: TaskListOptions) {
  const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId), deletedAt: null };
  if (query.status) filter.status = query.status;
  if (query.date) {
    const start = new Date(`${query.date}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    filter.dueAt = { $gte: start, $lt: end };
  }
  const [items, total] = await Promise.all([
    Task.find(filter).sort({ dueAt: 1, createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Task.countDocuments(filter)
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total } };
}

export async function createTask(userId: string, body: { title: string; description?: string; dueAt?: Date; reminderAt?: Date }) {
  return Task.create({ ...body, userId: new Types.ObjectId(userId) });
}

async function findOwnTask(userId: string, id: string): Promise<ITask> {
  if (!Types.ObjectId.isValid(id)) throw notFound('Task not found');
  const task = await Task.findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId), deletedAt: null });
  if (!task) throw notFound('Task not found');
  return task;
}

export async function updateTask(userId: string, id: string, body: Record<string, unknown>) {
  const task = await findOwnTask(userId, id);
  Object.assign(task, body);
  if (body.status === 'done') task.status = 'done';
  await task.save();
  return task;
}

export async function deleteTask(userId: string, id: string) {
  const task = await findOwnTask(userId, id);
  task.deletedAt = new Date();
  await task.save();
}

export async function listGoals(userId: string) {
  return Goal.find({ userId: new Types.ObjectId(userId), deletedAt: null }).sort({ createdAt: -1 }).lean();
}

export async function createGoal(userId: string, body: { title: string; description?: string; targetDate?: Date; progressPercent?: number }) {
  return Goal.create({ ...body, userId: new Types.ObjectId(userId) });
}

async function findOwnGoal(userId: string, id: string): Promise<IGoal> {
  if (!Types.ObjectId.isValid(id)) throw notFound('Goal not found');
  const goal = await Goal.findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId), deletedAt: null });
  if (!goal) throw notFound('Goal not found');
  return goal;
}

export async function updateGoal(userId: string, id: string, body: Record<string, unknown>) {
  const goal = await findOwnGoal(userId, id);
  Object.assign(goal, body);
  if (body.progressPercent === 100) goal.status = 'achieved';
  await goal.save();
  return goal;
}

export async function deleteGoal(userId: string, id: string) {
  const goal = await findOwnGoal(userId, id);
  goal.deletedAt = new Date();
  await goal.save();
}

export async function getCalendar(userId: string, month: string) {
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  const tasks = await Task.find({
    userId: new Types.ObjectId(userId), deletedAt: null,
    $or: [
      { dueAt: { $gte: start, $lt: end } },
      { reminderAt: { $gte: start, $lt: end } }
    ]
  }).sort({ dueAt: 1 }).lean();
  return { month, tasks };
}
