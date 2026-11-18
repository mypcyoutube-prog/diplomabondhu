import mongoose, { Schema } from 'mongoose';

export interface ICalculationHistory extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  kind: 'semester' | 'cgpa';
  regulationId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  profileVersion: number;
  inputs: unknown;
  output: unknown;
  label?: string;
  deletedAt?: Date;
  createdAt: Date;
}

const schema = new Schema<ICalculationHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['semester', 'cgpa'], required: true },
  regulationId: { type: Schema.Types.ObjectId, ref: 'Regulation', required: true },
  profileId: { type: Schema.Types.ObjectId, ref: 'CalculationProfile', required: true },
  profileVersion: { type: Number, required: true },
  inputs: Schema.Types.Mixed,
  output: Schema.Types.Mixed,
  label: { type: String, maxlength: 200 },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ userId: 1, createdAt: -1 });

export const CalculationHistory = mongoose.model<ICalculationHistory>('CalculationHistory', schema);
