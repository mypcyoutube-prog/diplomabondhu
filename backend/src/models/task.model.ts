import mongoose, { Schema } from 'mongoose';

export interface ITask extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  dueAt?: Date;
  reminderAt?: Date;
  status: 'todo' | 'done';
  deletedAt?: Date;
}

const schema = new Schema<ITask>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 2, maxlength: 300 },
  description: { type: String, maxlength: 5000 },
  dueAt: Date,
  reminderAt: Date,
  status: { type: String, enum: ['todo', 'done'], default: 'todo', index: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ userId: 1, dueAt: 1 });
schema.index({ userId: 1, reminderAt: 1 });

export const Task = mongoose.model<ITask>('Task', schema);
