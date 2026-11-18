import mongoose, { Schema } from 'mongoose';

export type NotificationCategory = 'material' | 'exam' | 'academic' | 'community' | 'announcement' | 'system';

export interface INotification extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  category: NotificationCategory;
  title: string;
  body: string;
  link?: string;
  readAt?: Date;
  deletedAt?: Date;
}

const schema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, enum: ['material', 'exam', 'academic', 'community', 'announcement', 'system'], required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 300 },
  body: { type: String, required: true, maxlength: 5000 },
  link: { type: String, maxlength: 500 },
  readAt: Date,
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, readAt: 1 });

export const Notification = mongoose.model<INotification>('Notification', schema);
