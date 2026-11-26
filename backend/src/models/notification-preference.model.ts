import mongoose, { Schema } from 'mongoose';
import type { NotificationCategory } from './notification.model';

export interface INotificationPreference extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  categories: Record<NotificationCategory, boolean>;
  quietHours: { enabled: boolean; start: string; end: string };
}

export const DEFAULT_QUIET_HOURS = { enabled: false, start: '22:00', end: '07:00' };

export const DEFAULT_NOTIFICATION_PREFS: Record<NotificationCategory, boolean> = {
  material: true, exam: true, academic: true, community: true, announcement: true, system: true
};

const schema = new Schema<INotificationPreference>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  categories: {
    material: { type: Boolean, default: true },
    exam: { type: Boolean, default: true },
    academic: { type: Boolean, default: true },
    community: { type: Boolean, default: true },
    announcement: { type: Boolean, default: true },
    system: { type: Boolean, default: true }
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: '22:00' },
    end: { type: String, default: '07:00' }
  }
}, { timestamps: true });

export const NotificationPreference = mongoose.model<INotificationPreference>('NotificationPreference', schema);
