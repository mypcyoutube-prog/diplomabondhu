import mongoose, { Schema } from 'mongoose';

export interface IHomeConfiguration extends mongoose.Document {
  key: string;
  visible: boolean;
  displayOrder: number;
  maxItems: number;
  archived: boolean;
  deletedAt?: Date;
  updatedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdByBatch?: mongoose.Types.ObjectId;
}

const schema = new Schema<IHomeConfiguration>({
  key: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  visible: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0, min: 0, max: 10000 },
  maxItems: { type: Number, default: 10, min: 1, max: 100 },
  archived: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdByBatch: { type: Schema.Types.ObjectId, default: null }
}, { timestamps: true, optimisticConcurrency: true });

schema.index({ key: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const HomeConfiguration = mongoose.model<IHomeConfiguration>('HomeConfiguration', schema);
