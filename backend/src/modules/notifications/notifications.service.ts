import { Types } from 'mongoose';
import { conflict, notFound } from '../../core/errors';
import { Notification, type NotificationCategory } from '../../models/notification.model';
import { NotificationPreference, DEFAULT_QUIET_HOURS, DEFAULT_NOTIFICATION_PREFS } from '../../models/notification-preference.model';
import { Announcement, type IAnnouncement } from '../../models/announcement.model';
import { User } from '../../models/user.model';
import { writeAudit } from '../../models/audit-log.model';
import { dispatchPush } from '../../core/fcm';

export async function listInbox(userId: string, page: number, limit: number) {
  const filter = { userId: new Types.ObjectId(userId), deletedAt: null };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, readAt: null })
  ]);
  return { items, meta: { page, limit, total, unread } };
}

export async function markRead(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Notification not found');
  const result = await Notification.updateOne(
    { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId), deletedAt: null, readAt: null },
    { $set: { readAt: new Date() } }
  );
  if (result.matchedCount === 0) throw notFound('Unread notification not found');
  return { read: true };
}

export async function markAllRead(userId: string) {
  const result = await Notification.updateMany(
    { userId: new Types.ObjectId(userId), deletedAt: null, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return { read: result.modifiedCount };
}

export async function getPreferences(userId: string) {
  let pref = await NotificationPreference.findOne({ userId: new Types.ObjectId(userId) });
  if (!pref) {
    pref = await NotificationPreference.create({ userId: new Types.ObjectId(userId) });
  }
  const raw = (pref.categories as unknown as { toObject?: () => Record<string, boolean> }).toObject?.() ?? (pref.categories as unknown as Record<string, boolean>);
  return { categories: { ...raw }, quietHours: pref.quietHours ?? DEFAULT_QUIET_HOURS };
}

export async function updatePreferences(
  userId: string,
  categories: Partial<Record<NotificationCategory, boolean>>,
  quietHours?: { enabled: boolean; start: string; end: string }
) {
  await getPreferences(userId);
  const set: Record<string, unknown> = Object.fromEntries(
    Object.entries(categories).map(([k, v]) => [`categories.${k}`, v])
  );
  if (quietHours) {
    set['quietHours.enabled'] = quietHours.enabled;
    set['quietHours.start'] = quietHours.start;
    set['quietHours.end'] = quietHours.end;
  }
  const pref = await NotificationPreference.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { $set: set },
    { new: true }
  );
  return { categories: pref?.categories, quietHours: pref?.quietHours ?? DEFAULT_QUIET_HOURS };
}

async function resolveRecipients(announcement: IAnnouncement): Promise<Types.ObjectId[]> {
  if (announcement.targeting.all) {
    const users = await User.find({ role: 'student', status: 'active', deletedAt: null }).select('_id').lean();
    return users.map((u) => u._id as Types.ObjectId);
  }
  const filter: Record<string, unknown> = { role: 'student', status: 'active', deletedAt: null };
  const or: Record<string, unknown>[] = [];
  if (announcement.targeting.programIds.length) or.push({ 'profile.programId': { $in: announcement.targeting.programIds } });
  if (announcement.targeting.technologyIds.length) or.push({ 'profile.technologyId': { $in: announcement.targeting.technologyIds } });
  if (announcement.targeting.semesterIds.length) or.push({ 'profile.currentSemesterId': { $in: announcement.targeting.semesterIds } });
  if (or.length) filter.$or = or;
  else return [];
  const users = await User.find(filter).select('_id').lean();
  return users.map((u) => u._id as Types.ObjectId);
}

export async function createAnnouncement(body: Record<string, unknown>, actorId: string) {
  return Announcement.create({ ...(body as object), createdBy: new Types.ObjectId(actorId) });
}

export async function updateAnnouncement(id: string, body: Record<string, unknown>) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Announcement not found');
  const announcement = await Announcement.findOne({ _id: new Types.ObjectId(id), status: 'draft', deletedAt: null });
  if (!announcement) throw notFound('Draft announcement not found');
  Object.assign(announcement, body);
  await announcement.save();
  return announcement;
}

export async function listAnnouncements(query: { status?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    Announcement.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Announcement.countDocuments(filter)
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total } };
}

export async function deleteAnnouncement(id: string, actorId: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Announcement not found');
  const result = await Announcement.updateOne(
    { _id: new Types.ObjectId(id), deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
  if (result.matchedCount === 0) throw notFound('Announcement not found');
  await writeAudit({ actorId, action: 'announcement.delete', targetType: 'Announcement', targetId: id });
}

export async function publishAnnouncement(id: string, actorId: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Announcement not found');
  const announcement = await Announcement.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!announcement) throw notFound('Announcement not found');
  if (announcement.status === 'published') throw conflict('Announcement is already published');
  if (announcement.scheduledAt && announcement.scheduledAt.getTime() > Date.now()) {
    throw conflict('Announcement is scheduled for a future time and cannot be published early');
  }

  const recipients = await resolveRecipients(announcement);
  if (recipients.length === 0) throw conflict('No recipients match this announcement targeting');

  const docs = recipients.map((uid) => ({
    userId: uid,
    category: announcement.category as NotificationCategory,
    title: announcement.title,
    body: announcement.body
  }));
  await Notification.insertMany(docs, { ordered: false });

  announcement.status = 'published';
  announcement.publishedAt = new Date();
  announcement.recipientCount = recipients.length;
  await announcement.save();

  await dispatchPush(recipients, { title: announcement.title, body: announcement.body });
  await writeAudit({ actorId, action: 'announcement.publish', targetType: 'Announcement', targetId: id, after: { recipients: recipients.length } });
  return announcement;
}

export async function notifyUsers(userIds: Types.ObjectId[], category: NotificationCategory, title: string, body: string, link?: string) {
  if (userIds.length === 0) return;
  const recent = await Notification.find({
    userId: { $in: userIds },
    category,
    title,
    createdAt: { $gt: new Date(Date.now() - 6 * 60 * 60 * 1000) }
  }).select('userId').lean();
  if (recent.length > 0) {
    const recentIds = new Set(recent.map((n) => String(n.userId)));
    userIds = userIds.filter((uid) => !recentIds.has(String(uid)));
  }
  if (userIds.length === 0) return;
  await Notification.insertMany(
    userIds.map((uid) => ({ userId: uid, category, title, body, link })),
    { ordered: false }
  );
  await dispatchPush(userIds, { title, body, link });
}


export async function processDueAnnouncements(now = new Date()) {
  const due = await Announcement.find({ status: 'draft', deletedAt: null, scheduledAt: { $ne: null, $lte: now } }).limit(20);
  const published: { id: string; recipients: number }[] = [];
  for (const announcement of due) {
    try {
      const recipients = await resolveRecipients(announcement);
      if (recipients.length === 0) {
        announcement.status = 'published';
        announcement.publishedAt = now;
        announcement.recipientCount = 0;
        await announcement.save();
        published.push({ id: String(announcement._id), recipients: 0 });
        continue;
      }
      await Notification.insertMany(
        recipients.map((uid) => ({
          userId: uid,
          category: announcement.category as NotificationCategory,
          title: announcement.title,
          body: announcement.body
        })),
        { ordered: false }
      );
      announcement.status = 'published';
      announcement.publishedAt = now;
      announcement.recipientCount = recipients.length;
      await announcement.save();
      await dispatchPush(recipients, { title: announcement.title, body: announcement.body });
      published.push({ id: String(announcement._id), recipients: recipients.length });
    } catch {
      /* a failed announcement must not block the rest of the batch */
    }
  }
  return published;
}

export async function getDeliveryStats() {
  const [total, unread, byCategory, recentAnnouncements] = await Promise.all([
    Notification.countDocuments({ deletedAt: null }),
    Notification.countDocuments({ deletedAt: null, readAt: null }),
    Notification.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$category', total: { $sum: 1 }, unread: { $sum: { $cond: [{ $eq: ['$readAt', null] }, 1, 0] } } } }
    ]),
    Announcement.countDocuments({ status: 'scheduled', deletedAt: null }).catch(() => 0).then(() => undefined)
  ]);
  void recentAnnouncements;
  const scheduled = await Announcement.countDocuments({ status: 'draft', deletedAt: null, scheduledAt: { $ne: null } });
  return { total, unread, byCategory, scheduledAnnouncements: scheduled };
}
