import mongoose, { Schema } from 'mongoose';

export interface IGoal extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  targetDate?: Date;
  progressPercent: number;
  status: 'active' | 'achieved' | 'abandoned';
  deletedAt?: Date;
}

const schema = new Schema<IGoal>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 2, maxlength: 300 },
  description: { type: String, maxlength: 5000 },
  targetDate: Date,
  progressPercent: { type: Number, min: 0, max: 100, default: 0 },
  status: { type: String, enum: ['active', 'achieved', 'abandoned'], default: 'active', index: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export const Goal = mongoose.model<IGoal>('Goal', schema);
