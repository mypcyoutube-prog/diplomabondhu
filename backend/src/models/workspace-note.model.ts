import mongoose, { Schema } from 'mongoose';

export interface IWorkspaceNote extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  pinned: boolean;
  archived: boolean;
  collectionId?: mongoose.Types.ObjectId;
  deletedAt?: Date;
}

const schema = new Schema<IWorkspaceNote>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  body: { type: String, required: true, maxlength: 20000 },
  pinned: { type: Boolean, default: false, index: true },
  archived: { type: Boolean, default: false, index: true },
  collectionId: { type: Schema.Types.ObjectId, ref: 'WorkspaceCollection', default: null },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ userId: 1, updatedAt: -1 });
schema.index({ userId: 1, title: 'text', body: 'text' });

export const WorkspaceNote = mongoose.model<IWorkspaceNote>('WorkspaceNote', schema);
