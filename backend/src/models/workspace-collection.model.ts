import mongoose, { Schema } from 'mongoose';

export type WorkspaceRefType = 'material' | 'note';

export interface ICollectionItem {
  refType: WorkspaceRefType;
  refId: mongoose.Types.ObjectId;
  addedAt: Date;
}

export interface IWorkspaceCollection extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  items: ICollectionItem[];
  deletedAt?: Date;
}

const itemSchema = new Schema<ICollectionItem>({
  refType: { type: String, enum: ['material', 'note'], required: true },
  refId: { type: Schema.Types.ObjectId, required: true },
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const schema = new Schema<IWorkspaceCollection>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  items: { type: [itemSchema], default: [] },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ userId: 1, name: 1 }, { unique: true });

export const WorkspaceCollection = mongoose.model<IWorkspaceCollection>('WorkspaceCollection', schema);
