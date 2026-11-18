import mongoose, { Schema } from 'mongoose';

export interface IBtebSubject extends mongoose.Document {
  technology: string;
  technologySlug: string;
  regulation: number;
  semester: number;
  groupCode?: string | null;
  groupLabel?: string | null;
  code: string;
  name: string;
  credits?: number | null;
  theoryMaxMarks?: number | null;
  practicalMaxMarks?: number | null;
  ppwTheory?: number | null;
  ppwPractical?: number | null;
  type?: string | null;
  updatedAt: Date;
  createdAt: Date;
}

const btebSubjectSchema = new Schema<IBtebSubject>({
  technology: { type: String, required: true, trim: true, index: true },
  technologySlug: { type: String, required: true, trim: true, lowercase: true, index: true },
  regulation: { type: Number, required: true, min: 2000, max: 2100, index: true },
  semester: { type: Number, required: true, min: 1, max: 12, index: true },
  groupCode: { type: String, trim: true, uppercase: true, default: null },
  groupLabel: { type: String, trim: true, default: null },
  code: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  credits: { type: Number, default: null },
  theoryMaxMarks: { type: Number, default: null },
  practicalMaxMarks: { type: Number, default: null },
  ppwTheory: { type: Number, default: null },
  ppwPractical: { type: Number, default: null },
  type: { type: String, enum: ['theory', 'practical', 'theory_practical', null], default: null }
}, { timestamps: true });

btebSubjectSchema.index(
  { regulation: 1, technologySlug: 1, semester: 1, code: 1 },
  { unique: true }
);
btebSubjectSchema.index({ code: 1 });

export const BtebSubject = mongoose.model<IBtebSubject>('BtebSubject', btebSubjectSchema, 'bteb_subjects');
