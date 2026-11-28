import mongoose, { Schema } from 'mongoose';

export interface IQuickAccessItem extends mongoose.Document {
  slug: string;
  titleEn: string;
  titleBn: string;
  subtitleEn?: string;
  subtitleBn?: string;
  icon: string;
  route: string;
  bgColor: string;
  fgColor: string;
  displayOrder: number;
  status: 'draft' | 'published' | 'scheduled';
  scheduledAt?: Date;
  visibility: boolean;
  archived: boolean;
  deletedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdByBatch?: mongoose.Types.ObjectId;
}

const schema = new Schema<IQuickAccessItem>({
  slug: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  titleEn: { type: String, required: true, trim: true, maxlength: 60 },
  titleBn: { type: String, required: true, trim: true, maxlength: 60 },
  subtitleEn: { type: String, trim: true, maxlength: 120 },
  subtitleBn: { type: String, trim: true, maxlength: 120 },
  icon: { type: String, required: true, maxlength: 80 },
  route: { type: String, required: true, maxlength: 120 },
  bgColor: { type: String, default: '#E0F2F1', maxlength: 20 },
  fgColor: { type: String, default: '#00695C', maxlength: 20 },
  displayOrder: { type: Number, default: 0, min: 0, max: 10000 },
  status: { type: String, enum: ['draft', 'published', 'scheduled'], default: 'draft', index: true },
  scheduledAt: { type: Date, default: null },
  visibility: { type: Boolean, default: true },
  archived: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdByBatch: { type: Schema.Types.ObjectId, default: null }
}, { timestamps: true, optimisticConcurrency: true });

schema.index({ slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
schema.index({ status: 1, visibility: 1, displayOrder: 1 });

export const QuickAccessItem = mongoose.model<IQuickAccessItem>('QuickAccessItem', schema);
