import mongoose, { Schema } from 'mongoose';

export interface IMaterialView extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  viewedAt: Date;
}

const schema = new Schema<IMaterialView>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  materialId: { type: Schema.Types.ObjectId, ref: 'StudyMaterial', required: true },
  viewedAt: { type: Date, default: Date.now }
}, { timestamps: true });

schema.index({ userId: 1, materialId: 1 }, { unique: true });
schema.index({ userId: 1, viewedAt: -1 });

export const MaterialView = mongoose.model<IMaterialView>('MaterialView', schema);
