import mongoose, { Schema } from 'mongoose';
import type { CalculationProfileData } from '../modules/gpa/gpa.engine';

export type ProfileStatus = 'draft' | 'verification' | 'testing' | 'approved' | 'published' | 'retired';

export interface ICalculationProfile extends mongoose.Document {
  regulationId: mongoose.Types.ObjectId;
  version: number;
  status: ProfileStatus;
  data: CalculationProfileData;
  verification: {
    sourceRefs: { title: string; url?: string; note?: string }[];
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
  };
  testRun: { passed: boolean; runAt?: Date; results?: unknown };
  publishedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
}

const gradeEntrySchema = new Schema({
  minPercent: { type: Number, required: true, min: 0, max: 100 },
  maxPercent: { type: Number, required: true, min: 0, max: 100 },
  grade: { type: String, required: true, trim: true, maxlength: 4 },
  point: { type: Number, required: true, min: 0, max: 5 }
}, { _id: false });

const componentSchema = new Schema({
  key: { type: String, required: true, trim: true, maxlength: 50 },
  label: { type: String, required: true, trim: true, maxlength: 100 },
  maxMarks: { type: Number, required: true, min: 1 },
  weightPercent: { type: Number, required: true, min: 0, max: 100 },
  minPercent: { type: Number, min: 0, max: 100 }
}, { _id: false });

const profileDataSchema = new Schema({
  grading: {
    scale: { type: Number, required: true, min: 1, max: 5 },
    table: { type: [gradeEntrySchema], required: true }
  },
  assessments: { type: Schema.Types.Mixed, required: true },
  passRules: {
    minSubjectGrade: { type: String, required: true, maxlength: 4 },
    semesterMinGpa: Number
  },
  cgpa: {
    strategy: { type: String, enum: ['semester_weighted', 'credit_weighted'], required: true },
    semesterWeights: [{ semesterNumber: { type: Number, min: 1 }, percent: { type: Number, min: 0, max: 100 } }],
    classBands: [{ minCgpa: Number, label: String }]
  },
  special: {
    allowIncompleteProvisional: Boolean,
    referredCapGrade: String,
    improvementCapGrade: String
  }
}, { _id: false });

const calculationProfileSchema = new Schema<ICalculationProfile>({
  regulationId: { type: Schema.Types.ObjectId, ref: 'Regulation', required: true, index: true },
  version: { type: Number, required: true, min: 1, default: 1 },
  status: { type: String, enum: ['draft', 'verification', 'testing', 'approved', 'published', 'retired'], default: 'draft', index: true },
  data: { type: profileDataSchema, required: true },
  verification: {
    sourceRefs: [{ title: String, url: String, note: String }],
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date
  },
  testRun: {
    passed: { type: Boolean, default: false },
    runAt: Date,
    results: Schema.Types.Mixed
  },
  publishedAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

calculationProfileSchema.index({ regulationId: 1, version: -1 }, { unique: true });

export const CalculationProfile = mongoose.model<ICalculationProfile>('CalculationProfile', calculationProfileSchema);
