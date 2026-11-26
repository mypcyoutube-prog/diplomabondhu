import mongoose, { Schema } from 'mongoose';

export interface IBookmark extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const schema = new Schema<IBookmark>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  materialId: { type: Schema.Types.ObjectId, ref: 'StudyMaterial', required: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ userId: 1, materialId: 1 }, { unique: true });

export const Bookmark = mongoose.model<IBookmark>('Bookmark', schema);
