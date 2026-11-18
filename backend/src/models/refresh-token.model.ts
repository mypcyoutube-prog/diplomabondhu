import mongoose, { Schema } from 'mongoose';

export interface IRefreshToken extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  deviceInfo?: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByHash?: string;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  deviceInfo: String,
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
  replacedByHash: String
}, { timestamps: { createdAt: true, updatedAt: false } });

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);
