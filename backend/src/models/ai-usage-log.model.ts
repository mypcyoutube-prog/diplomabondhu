import mongoose, { Schema } from 'mongoose';

export type AiFeature = 'study-plan' | 'document-qa';

export interface IAiUsageLog extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  feature: AiFeature;
  tokensUsed: number;
  success: boolean;
  createdAt: Date;
}

const schema = new Schema<IAiUsageLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  feature: { type: String, enum: ['study-plan', 'document-qa'], required: true },
  tokensUsed: { type: Number, default: 0 },
  success: { type: Boolean, default: true }
}, { timestamps: true });

schema.index({ userId: 1, feature: 1, createdAt: -1 });

export const AiUsageLog = mongoose.model<IAiUsageLog>('AiUsageLog', schema);
