import mongoose, { Schema } from 'mongoose';

export interface IImportHistory extends mongoose.Document {
  batchId: mongoose.Types.ObjectId;
  tokenJti: string;
  category: string;
  status: string;
  report: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    restored?: number;
    kept_modified?: { slug: string; reason: string }[];
    conflicts?: { slug: string; reason: string }[];
    startedAt?: Date;
    finishedAt?: Date;
  };
  snapshotId?: mongoose.Types.ObjectId | null;
  createdByUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  finishedAt?: Date | null;
}

const schema = new Schema<IImportHistory>({
  batchId: { type: Schema.Types.ObjectId, required: true, unique: true },
  tokenJti: { type: String, required: true, index: true },
  category: { type: String, required: true },
  status: { type: String, required: true, index: true },
  report: {
    created: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    restored: { type: Number, default: 0 },
    kept_modified: [{ slug: String, reason: String }],
    conflicts: [{ slug: String, reason: String }],
    startedAt: Date,
    finishedAt: Date
  },
  snapshotId: { type: Schema.Types.ObjectId, default: null },
  createdByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  finishedAt: { type: Date, default: null }
}, { timestamps: true });

export const ImportHistory = mongoose.model<IImportHistory>('ImportHistory', schema);
