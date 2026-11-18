import mongoose, { Schema } from 'mongoose';

export interface IExam extends mongoose.Document {
  title: string;
  description?: string;
  type: 'chapter' | 'subject' | 'semester' | 'model' | 'previous';
  hierarchyRefs: {
    programId?: mongoose.Types.ObjectId;
    regulationId?: mongoose.Types.ObjectId;
    technologyId?: mongoose.Types.ObjectId;
    semesterId?: mongoose.Types.ObjectId;
    subjectId?: mongoose.Types.ObjectId;
    chapterId?: mongoose.Types.ObjectId;
  };
  questionIds: mongoose.Types.ObjectId[];
  durationSec: number;
  marksPerQuestion: number;
  negativeMarkPercent: number;
  status: 'draft' | 'scheduled' | 'published' | 'closed';
  scheduledAt?: Date;
  shuffle: boolean;
  createdBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
}

const schema = new Schema<IExam>({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  description: { type: String, maxlength: 5000 },
  type: { type: String, enum: ['chapter', 'subject', 'semester', 'model', 'previous'], required: true, index: true },
  hierarchyRefs: {
    programId: { type: Schema.Types.ObjectId, ref: 'EducationProgram' },
    regulationId: { type: Schema.Types.ObjectId, ref: 'Regulation' },
    technologyId: { type: Schema.Types.ObjectId, ref: 'Technology' },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester' },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' }
  },
  questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  durationSec: { type: Number, required: true, min: 60, max: 14400 },
  marksPerQuestion: { type: Number, required: true, min: 0.25, max: 100 },
  negativeMarkPercent: { type: Number, default: 0, min: 0, max: 100 },
  status: { type: String, enum: ['draft', 'scheduled', 'published', 'closed'], default: 'draft', index: true },
  scheduledAt: Date,
  shuffle: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export const Exam = mongoose.model<IExam>('Exam', schema);
