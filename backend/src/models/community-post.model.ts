import mongoose, { Schema } from 'mongoose';

export interface ICommunityPost extends mongoose.Document {
  authorId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  tags: string[];
  type: 'question' | 'discussion';
  likeCount: number;
  likes: mongoose.Types.ObjectId[];
  commentCount: number;
  status: 'visible' | 'hidden' | 'removed';
  isAnswered: boolean;
  featured: boolean;
  featuredAt?: Date | null;
  featuredBy?: mongoose.Types.ObjectId | null;
  reports: { reporterId: mongoose.Types.ObjectId; reason: string; status: 'open' | 'resolved' | 'dismissed'; at: Date }[];
  deletedAt?: Date;
}

const schema = new Schema<ICommunityPost>({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 300 },
  body: { type: String, required: true, maxlength: 10000 },
  tags: { type: [String], default: [] },
  type: { type: String, enum: ['question', 'discussion'], default: 'discussion', index: true },
  likeCount: { type: Number, default: 0 },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  commentCount: { type: Number, default: 0 },
  status: { type: String, enum: ['visible', 'hidden', 'removed'], default: 'visible', index: true },
  isAnswered: { type: Boolean, default: false },
  featured: { type: Boolean, default: false, index: true },
  featuredAt: { type: Date, default: null },
  featuredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  reports: [{
    reporterId: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, maxlength: 500 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
    at: { type: Date, default: Date.now }
  }],
  deletedAt: { type: Date, default: null }
}, { timestamps: true, optimisticConcurrency: true });

schema.index({ status: 1, createdAt: -1 });
schema.index({ 'reports.status': 1 });

export const CommunityPost = mongoose.model<ICommunityPost>('CommunityPost', schema);
