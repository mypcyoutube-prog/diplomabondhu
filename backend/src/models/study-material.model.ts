import mongoose, { Schema } from 'mongoose';

export interface IStudyMaterial extends mongoose.Document {
  type: 'book' | 'note' | 'video' | 'past_question' | 'subject_material';
  title: string;
  titleBn?: string;
  description?: string;
  hierarchyRefs: {
    programId?: mongoose.Types.ObjectId;
    regulationId?: mongoose.Types.ObjectId;
    technologyId?: mongoose.Types.ObjectId;
    semesterId?: mongoose.Types.ObjectId;
    subjectId?: mongoose.Types.ObjectId;
    chapterId?: mongoose.Types.ObjectId;
  };
  payload: {
    fileUrl?: string; externalUrl?: string; examYear?: number; sizeBytes?: number; pageCount?: number;
    thumbnailUrl?: string; author?: string; edition?: string; durationSec?: number;
  };
  status: 'draft' | 'published' | 'unpublished';
  downloadAllowed: boolean;
  previewAllowed: boolean;
  uploadedBy?: mongoose.Types.ObjectId;
  viewCount: number;
  deletedAt?: Date;
}

const schema = new Schema<IStudyMaterial>({
  type: { type: String, enum: ['book', 'note', 'video', 'past_question', 'subject_material'], required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 300 },
  titleBn: { type: String, trim: true, maxlength: 300 },
  description: { type: String, maxlength: 5000 },
  hierarchyRefs: {
    programId: { type: Schema.Types.ObjectId, ref: 'EducationProgram' },
    regulationId: { type: Schema.Types.ObjectId, ref: 'Regulation' },
    technologyId: { type: Schema.Types.ObjectId, ref: 'Technology' },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester' },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' }
  },
  payload: {
    fileUrl: String,
    externalUrl: String,
    examYear: Number,
    sizeBytes: Number,
    pageCount: Number,
    thumbnailUrl: { type: String, maxlength: 1000 },
    author: { type: String, maxlength: 200 },
    edition: { type: String, maxlength: 60 },
    durationSec: { type: Number, min: 0 }
  },
  status: { type: String, enum: ['draft', 'published', 'unpublished'], default: 'draft', index: true },
  downloadAllowed: { type: Boolean, default: false },
  previewAllowed: { type: Boolean, default: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  viewCount: { type: Number, default: 0 },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ type: 1, 'hierarchyRefs.subjectId': 1, status: 1 });
schema.index({ title: 'text', titleBn: 'text', description: 'text' });

export const StudyMaterial = mongoose.model<IStudyMaterial>('StudyMaterial', schema);
