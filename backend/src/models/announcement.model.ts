import mongoose, { Schema } from 'mongoose';

export interface IAnnouncement extends mongoose.Document {
  title: string;
  body: string;
  category: 'announcement' | 'academic' | 'exam' | 'material' | 'system';
  source: 'admin' | 'bteb';
  pdfUrl?: string;
  targeting: {
    all: boolean;
    programIds: mongoose.Types.ObjectId[];
    technologyIds: mongoose.Types.ObjectId[];
    semesterIds: mongoose.Types.ObjectId[];
  };
  status: 'draft' | 'published';
  visible: boolean;
  scheduledAt?: Date;
  publishedAt?: Date;
  recipientCount: number;
  createdBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
}

const schema = new Schema<IAnnouncement>({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 300 },
  body: { type: String, required: true, maxlength: 5000 },
  category: { type: String, enum: ['announcement', 'academic', 'exam', 'material', 'system'], default: 'announcement' },
  source: { type: String, enum: ['admin', 'bteb'], default: 'admin', index: true },
  pdfUrl: { type: String, maxlength: 1000 },
  targeting: {
    all: { type: Boolean, default: true },
    programIds: [{ type: Schema.Types.ObjectId, ref: 'EducationProgram' }],
    technologyIds: [{ type: Schema.Types.ObjectId, ref: 'Technology' }],
    semesterIds: [{ type: Schema.Types.ObjectId, ref: 'Semester' }]
  },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  visible: { type: Boolean, default: true },
  scheduledAt: Date,
  publishedAt: Date,
  recipientCount: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true, optimisticConcurrency: true });

export const Announcement = mongoose.model<IAnnouncement>('Announcement', schema);
