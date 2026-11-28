import mongoose, { Schema } from 'mongoose';

export type ImportCategory =
  | 'banners'
  | 'quick_access'
  | 'study_resources'
  | 'upcoming_exams'
  | 'admin_notices'
  | 'home_config';

export type ImportStatus =
  | 'issued'
  | 'processing'
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'rolled_back'
  | 'recovery_required';

export interface IImportToken extends mongoose.Document {
  jti: string;
  userId: mongoose.Types.ObjectId;
  category: ImportCategory;
  summaryHash: string;
  normalizedPayload: unknown[];
  status: ImportStatus;
  batchId?: mongoose.Types.ObjectId | null;
  startedAt?: Date | null;
  expiresAt: Date;
  completedAt?: Date | null;
  leaseUntil?: Date | null;
  leaseBy?: string | null;
  lastError?: string | null;
}

const schema = new Schema<IImportToken>({
  jti: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, required: true },
  summaryHash: { type: String, required: true },
  normalizedPayload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['issued', 'processing', 'completed', 'partially_completed', 'failed', 'rolled_back', 'recovery_required'], default: 'issued', index: true },
  batchId: { type: Schema.Types.ObjectId, default: null },
  startedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
  completedAt: { type: Date, default: null },
  leaseUntil: { type: Date, default: null },
  leaseBy: { type: String, default: null },
  lastError: { type: String, default: null }
}, { timestamps: true });

schema.index({ userId: 1, status: 1 });
schema.index({ status: 1, startedAt: 1 });
// No TTL index: recovery_required records must never be auto-deleted.

export const ImportToken = mongoose.model<IImportToken>('ImportToken', schema);
