import mongoose, { Schema } from 'mongoose';

export type RegulationStatus = 'draft' | 'verification' | 'testing' | 'approved' | 'published' | 'retired';

const nameBn = { type: String, trim: true, maxlength: 200 };

export interface IEducationProgram extends mongoose.Document {
  deletedAt?: Date;
  name: string; nameBn?: string; code: string; durationSemesters: number; isActive: boolean;
}

const educationProgramSchema = new Schema<IEducationProgram>({
  name: { type: String, required: true, trim: true },
  nameBn,
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  durationSemesters: { type: Number, required: true, min: 1, max: 12, default: 8 },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export interface IRegulation extends mongoose.Document {
  deletedAt?: Date;
  programId: mongoose.Types.ObjectId; year: number; name: string;
  status: RegulationStatus; officialRefs: { title: string; url?: string; note?: string }[];
}

const regulationSchema = new Schema<IRegulation>({
  programId: { type: Schema.Types.ObjectId, ref: 'EducationProgram', required: true, index: true },
  year: { type: Number, required: true, min: 2000, max: 2100 },
  name: { type: String, required: true, trim: true },
  status: { type: String, enum: ['draft', 'verification', 'testing', 'approved', 'published', 'retired'], default: 'draft', index: true },
  officialRefs: [{
    title: { type: String, required: true },
    url: String,
    note: String
  }],
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

regulationSchema.index({ programId: 1, year: 1 }, { unique: true });

export interface IInstitute extends mongoose.Document {
  deletedAt?: Date;
  name: string; nameBn?: string; code: string; district?: string; type: string;
}

const instituteSchema = new Schema<IInstitute>({
  name: { type: String, required: true, trim: true },
  nameBn,
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  district: { type: String, index: true },
  type: { type: String, default: 'polytechnic' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export interface IAcademicSession extends mongoose.Document {
  deletedAt?: Date;
  programId: mongoose.Types.ObjectId; regulationId: mongoose.Types.ObjectId;
  startYear: number; label: string;
}

const academicSessionSchema = new Schema<IAcademicSession>({
  programId: { type: Schema.Types.ObjectId, ref: 'EducationProgram', required: true, index: true },
  regulationId: { type: Schema.Types.ObjectId, ref: 'Regulation', required: true, index: true },
  startYear: { type: Number, required: true },
  label: { type: String, required: true, trim: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

academicSessionSchema.index({ programId: 1, regulationId: 1, startYear: 1 }, { unique: true });

export interface ITechnology extends mongoose.Document {
  deletedAt?: Date;
  programId: mongoose.Types.ObjectId; name: string; nameBn?: string; code: string;
}

const technologySchema = new Schema<ITechnology>({
  programId: { type: Schema.Types.ObjectId, ref: 'EducationProgram', required: true, index: true },
  name: { type: String, required: true, trim: true },
  nameBn,
  code: { type: String, required: true, uppercase: true, trim: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

technologySchema.index({ programId: 1, code: 1 }, { unique: true });

export interface ISemester extends mongoose.Document {
  deletedAt?: Date;
  programId: mongoose.Types.ObjectId; regulationId: mongoose.Types.ObjectId;
  number: number; cgpaWeightPercent: number; isIndustrial: boolean;
}

const semesterSchema = new Schema<ISemester>({
  programId: { type: Schema.Types.ObjectId, ref: 'EducationProgram', required: true, index: true },
  regulationId: { type: Schema.Types.ObjectId, ref: 'Regulation', required: true, index: true },
  number: { type: Number, required: true, min: 1, max: 12 },
  cgpaWeightPercent: { type: Number, required: true, min: 0, max: 100 },
  isIndustrial: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

semesterSchema.index({ programId: 1, regulationId: 1, number: 1 }, { unique: true });

export interface ISubject extends mongoose.Document {
  deletedAt?: Date;
  programId: mongoose.Types.ObjectId; regulationId: mongoose.Types.ObjectId;
  technologyId: mongoose.Types.ObjectId; semesterId: mongoose.Types.ObjectId;
  code: string; name: string; nameBn?: string; credits: number; isElective: boolean;
}

const subjectSchema = new Schema<ISubject>({
  programId: { type: Schema.Types.ObjectId, ref: 'EducationProgram', required: true, index: true },
  regulationId: { type: Schema.Types.ObjectId, ref: 'Regulation', required: true, index: true },
  technologyId: { type: Schema.Types.ObjectId, ref: 'Technology', required: true, index: true },
  semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true, index: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  nameBn,
  credits: { type: Number, required: true, min: 0.5, max: 20 },
  isElective: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

subjectSchema.index({ regulationId: 1, code: 1 }, { unique: true });
subjectSchema.index({ programId: 1, regulationId: 1, technologyId: 1, semesterId: 1 });

export interface IChapter extends mongoose.Document {
  deletedAt?: Date;
  subjectId: mongoose.Types.ObjectId; number: number; name: string; nameBn?: string;
}

const chapterSchema = new Schema<IChapter>({
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  number: { type: Number, required: true, min: 1 },
  name: { type: String, required: true, trim: true },
  nameBn,
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

chapterSchema.index({ subjectId: 1, number: 1 }, { unique: true });

export const EducationProgram = mongoose.model<IEducationProgram>('EducationProgram', educationProgramSchema);
export const Regulation = mongoose.model<IRegulation>('Regulation', regulationSchema);
export const Institute = mongoose.model<IInstitute>('Institute', instituteSchema);
export const AcademicSession = mongoose.model<IAcademicSession>('AcademicSession', academicSessionSchema);
export const Technology = mongoose.model<ITechnology>('Technology', technologySchema);
export const Semester = mongoose.model<ISemester>('Semester', semesterSchema);
export const Subject = mongoose.model<ISubject>('Subject', subjectSchema);
export const Chapter = mongoose.model<IChapter>('Chapter', chapterSchema);
