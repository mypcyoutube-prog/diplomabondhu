import mongoose, { Schema } from 'mongoose';

export interface IQuestion extends mongoose.Document {
  type: 'mcq';
  subjectId?: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId;
  text: string;
  textBn?: string;
  options: { key: string; text: string }[];
  correctKey: string;
  explanation?: string;
  marks: number;
  status: 'draft' | 'published';
  createdBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
}

const schema = new Schema<IQuestion>({
  type: { type: String, enum: ['mcq'], default: 'mcq' },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', index: true },
  chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', index: true },
  text: { type: String, required: true, trim: true, minlength: 3, maxlength: 2000 },
  textBn: { type: String, trim: true, maxlength: 2000 },
  options: [{
    key: { type: String, required: true, trim: true, minlength: 1, maxlength: 4 },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 500 }
  }],
  correctKey: { type: String, required: true, trim: true, minlength: 1, maxlength: 4 },
  explanation: { type: String, trim: true, maxlength: 3000 },
  marks: { type: Number, required: true, min: 0.25, max: 100, default: 1 },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true, optimisticConcurrency: true });

schema.index({ subjectId: 1, status: 1 });

export const Question = mongoose.model<IQuestion>('Question', schema);
