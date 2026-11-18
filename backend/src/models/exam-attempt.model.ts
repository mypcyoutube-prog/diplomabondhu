import mongoose, { Schema } from 'mongoose';

export interface AttemptPerQuestion {
  questionId: mongoose.Types.ObjectId;
  selectedKey?: string;
  correctKey: string;
  isCorrect: boolean;
  marks: number;
}

export interface IExamAttempt extends mongoose.Document {
  examId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  questionOrder: mongoose.Types.ObjectId[];
  startedAt: Date;
  deadlineAt: Date;
  answers: Map<string, string>;
  status: 'active' | 'submitted';
  submittedAt?: Date;
  scoring?: {
    totalMarks: number;
    marksObtained: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    percent: number;
  };
  perQuestion?: AttemptPerQuestion[];
  deletedAt?: Date;
}

const schema = new Schema<IExamAttempt>({
  examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  questionOrder: [{ type: Schema.Types.ObjectId, ref: 'Question', required: true }],
  startedAt: { type: Date, default: Date.now },
  deadlineAt: { type: Date, required: true },
  answers: { type: Map, of: String, default: {} },
  status: { type: String, enum: ['active', 'submitted'], default: 'active', index: true },
  submittedAt: Date,
  scoring: {
    totalMarks: Number,
    marksObtained: Number,
    correctCount: Number,
    wrongCount: Number,
    unansweredCount: Number,
    percent: Number
  },
  perQuestion: [{
    questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
    selectedKey: String,
    correctKey: String,
    isCorrect: Boolean,
    marks: Number
  }],
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ examId: 1, userId: 1, status: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'active' }
});
schema.index({ userId: 1, createdAt: -1 });

export const ExamAttempt = mongoose.model<IExamAttempt>('ExamAttempt', schema);
