import mongoose, { Schema } from 'mongoose';

export interface ISyncDevice extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  platform: string;
  name: string;
  lastSyncAt?: Date;
  revokedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const schema = new Schema<ISyncDevice>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceId: { type: String, required: true, trim: true, maxlength: 128 },
  platform: { type: String, default: 'android', maxlength: 40 },
  name: { type: String, default: '', maxlength: 120 },
  lastSyncAt: Date,
  revokedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const SyncDevice = mongoose.model<ISyncDevice>('SyncDevice', schema);
