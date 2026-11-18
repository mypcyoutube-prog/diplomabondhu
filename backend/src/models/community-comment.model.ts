import mongoose, { Schema } from 'mongoose';

export interface ICommunityComment extends mongoose.Document {
  postId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  text: string;
  status: 'visible' | 'hidden' | 'removed';
  deletedAt?: Date;
}

const schema = new Schema<ICommunityComment>({
  postId: { type: Schema.Types.ObjectId, ref: 'CommunityPost', required: true, index: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'CommunityComment' },
  text: { type: String, required: true, trim: true, minlength: 1, maxlength: 5000 },
  status: { type: String, enum: ['visible', 'hidden', 'removed'], default: 'visible', index: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ postId: 1, createdAt: 1 });

export const CommunityComment = mongoose.model<ICommunityComment>('CommunityComment', schema);
