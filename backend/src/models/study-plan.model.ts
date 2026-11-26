import mongoose, { Schema } from 'mongoose';

export interface IStudyPlan extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  input: {
    subjects: string[];
    availableHoursPerDay: number;
    goal: string;
    days: number;
  };
  plan: unknown;
  status: 'draft' | 'saved';
  deletedAt?: Date;
}

const schema = new Schema<IStudyPlan>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  input: {
    subjects: { type: [String], default: [] },
    availableHoursPerDay: { type: Number, required: true, min: 0.5, max: 16 },
    goal: { type: String, default: '', maxlength: 500 },
    days: { type: Number, required: true, min: 1, max: 30 }
  },
  plan: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['draft', 'saved'], default: 'draft', index: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ userId: 1, createdAt: -1 });

export const StudyPlan = mongoose.model<IStudyPlan>('StudyPlan', schema);
