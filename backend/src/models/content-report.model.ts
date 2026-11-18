import mongoose, { Schema } from 'mongoose';

export interface IContentReport extends mongoose.Document {
  materialId: mongoose.Types.ObjectId;
  reporterId: mongoose.Types.ObjectId;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  resolutionNote?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  deletedAt?: Date;
}

const schema = new Schema<IContentReport>({
  materialId: { type: Schema.Types.ObjectId, ref: 'StudyMaterial', required: true, index: true },
  reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, required: true, trim: true, minlength: 5, maxlength: 1000 },
  status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
  resolutionNote: { type: String, maxlength: 1000 },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ status: 1, createdAt: -1 });

export const ContentReport = mongoose.model<IContentReport>('ContentReport', schema);
