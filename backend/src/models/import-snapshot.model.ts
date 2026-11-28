import mongoose, { Schema } from 'mongoose';

export interface ISnapshotEntry {
  slug: string;
  op: 'create' | 'update' | 'skip';
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  docId?: mongoose.Types.ObjectId | null;
  expectedVersion?: number | null;
  expectedUpdatedAt?: Date | null;
}

export interface IImportSnapshot extends mongoose.Document {
  batchId: mongoose.Types.ObjectId;
  category: string;
  docs: ISnapshotEntry[];
  sizeBytes: number;
  docCount: number;
  expiresAt: Date;
}

const schema = new Schema<IImportSnapshot>({
  batchId: { type: Schema.Types.ObjectId, required: true, unique: true },
  category: { type: String, required: true, index: true },
  docs: { type: Schema.Types.Mixed, required: true },
  sizeBytes: { type: Number, required: true },
  docCount: { type: Number, required: true },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

export const ImportSnapshot = mongoose.model<IImportSnapshot>('ImportSnapshot', schema);
