import mongoose, { Schema } from 'mongoose';

export type ExportDataset = 'notes' | 'bookmarks' | 'collections' | 'tasks' | 'goals' | 'calculation-history';
export type ExportFormat = 'json' | 'csv';
export type ExportStatus = 'processing' | 'ready' | 'failed' | 'expired';

export interface IExportJob extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  datasets: ExportDataset[];
  format: ExportFormat;
  status: ExportStatus;
  fileName: string;
  content: string;
  error?: string;
  expiresAt: Date;
}

const schema = new Schema<IExportJob>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  datasets: { type: [String], required: true },
  format: { type: String, enum: ['json', 'csv'], required: true },
  status: { type: String, enum: ['processing', 'ready', 'failed', 'expired'], default: 'processing', index: true },
  fileName: { type: String, default: '' },
  content: { type: String, default: '' },
  error: String,
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

schema.index({ userId: 1, createdAt: -1 });

export const ExportJob = mongoose.model<IExportJob>('ExportJob', schema);
