import mongoose, { Schema } from 'mongoose';

export interface IBanner extends mongoose.Document {
  title: string;
  imageUrl: string;
  linkUrl: string;
  ctaLabel: string;
  status: 'draft' | 'published';
  priority: number;
  startsAt?: Date;
  endsAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
}

const schema = new Schema<IBanner>({
  title: { type: String, default: '', trim: true, maxlength: 120 },
  imageUrl: { type: String, required: true, maxlength: 1000 },
  linkUrl: { type: String, default: '', maxlength: 1000 },
  ctaLabel: { type: String, default: '', maxlength: 40 },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  priority: { type: Number, default: 0, min: 0, max: 1000 },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ status: 1, priority: -1, createdAt: -1 });

export const Banner = mongoose.model<IBanner>('Banner', schema);
