import { Types } from 'mongoose';
import { z } from 'zod';
import { conflict, forbidden, notFound, validationError } from '../../core/errors';
import { CommunityPost, type ICommunityPost } from '../../models/community-post.model';
import { CommunityComment, type ICommunityComment } from '../../models/community-comment.model';
import { User } from '../../models/user.model';
import { ContentReport } from '../../models/content-report.model';
import { writeAudit } from '../../models/audit-log.model';

export const GUIDELINES = {
  title: 'Community Guidelines',
  titleBn: 'কমিউনিটি গাইডলাইন',
  rules: [
    'Be respectful to every student. Harassment, abuse or personal attacks are not allowed.',
    'No spam, scams, advertisements or misleading content.',
    'Do not share private personal information (yours or others\').',
    'Keep posts relevant to diploma education.',
    'Report content that violates these rules instead of responding to it.'
  ]
};

const EDIT_WINDOW_MINUTES = 30;

async function requireGuidelinesAccepted(userId: string) {
  const user = await User.findById(userId).select('guidelinesAcceptedAt').lean();
  if (!user) throw notFound('User not found');
  if (!(user as unknown as { guidelinesAcceptedAt?: Date }).guidelinesAcceptedAt) {
    throw forbidden('You must accept the community guidelines first');
  }
}

export async function acceptGuidelines(userId: string) {
  await User.updateOne({ _id: new Types.ObjectId(userId) }, { $set: { guidelinesAcceptedAt: new Date() } });
  return { accepted: true };
}

export type ListPostsOptions = { type?: string; tag?: string; page: number; limit: number };

export async function listPosts(query: ListPostsOptions) {
  const filter: Record<string, unknown> = { status: 'visible', deletedAt: null };
  if (query.type) filter.type = query.type;
  if (query.tag) filter.tags = query.tag;
  const [items, total] = await Promise.all([
    CommunityPost.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit)
      .populate('authorId', 'name').lean(),
    CommunityPost.countDocuments(filter)
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total } };
}

export async function createPost(userId: string, body: { title: string; body: string; type: string; tags: string[] }) {
  await requireGuidelinesAccepted(userId);
  const post = await CommunityPost.create({ ...body, authorId: new Types.ObjectId(userId) });
  return post;
}

async function findVisiblePost(id: string): Promise<ICommunityPost> {
  if (!Types.ObjectId.isValid(id)) throw notFound('Post not found');
  const post = await CommunityPost.findOne({ _id: new Types.ObjectId(id), status: 'visible', deletedAt: null });
  if (!post) throw notFound('Post not found');
  return post;
}

export async function getPostWithComments(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Post not found');
  const post = await CommunityPost.findOne({
    _id: new Types.ObjectId(id), status: 'visible', deletedAt: null
  }).populate('authorId', 'name').lean();
  if (!post) throw notFound('Post not found');
  const comments = await CommunityComment.find({
    postId: post._id, status: 'visible', deletedAt: null
  }).sort({ createdAt: 1 }).populate('authorId', 'name').lean();
  return { post, comments };
}

export async function updatePost(userId: string, id: string, body: Record<string, unknown>) {
  const post = await findVisiblePost(id);
  if (String(post.authorId) !== userId) throw forbidden('Only the author can edit this post');
  const createdAt = (post as unknown as { createdAt: Date }).createdAt;
  const ageMinutes = (Date.now() - createdAt.getTime()) / 60000;
  if (ageMinutes > EDIT_WINDOW_MINUTES) {
    throw conflict(`Posts can only be edited within ${EDIT_WINDOW_MINUTES} minutes of posting`);
  }
  Object.assign(post, body);
  await post.save();
  return post;
}

export async function deletePost(userId: string, id: string) {
  const post = await findVisiblePost(id);
  if (String(post.authorId) !== userId) throw forbidden('Only the author can delete this post');
  post.deletedAt = new Date();
  post.status = 'removed';
  await post.save();
}

export async function likePost(userId: string, id: string) {
  const post = await findVisiblePost(id);
  await CommunityPost.updateOne(
    { _id: post._id, likes: { $ne: new Types.ObjectId(userId) } },
    { $inc: { likeCount: 1 }, $push: { likes: new Types.ObjectId(userId) } }
  );
  return { liked: true };
}

export async function unlikePost(userId: string, id: string) {
  const post = await findVisiblePost(id);
  await CommunityPost.updateOne(
    { _id: post._id, likes: new Types.ObjectId(userId) },
    { $inc: { likeCount: -1 }, $pull: { likes: new Types.ObjectId(userId) } }
  );
  return { liked: false };
}

export async function addComment(userId: string, postId: string, body: { text: string; parentId?: string }) {
  await requireGuidelinesAccepted(userId);
  const post = await findVisiblePost(postId);
  if (body.parentId) {
    if (!Types.ObjectId.isValid(body.parentId)) throw validationError('Invalid parentId');
    const parent = await CommunityComment.findOne({
      _id: new Types.ObjectId(body.parentId), postId: post._id, status: 'visible', deletedAt: null
    });
    if (!parent) throw notFound('Parent comment not found');
  }
  const comment = await CommunityComment.create({
    postId: post._id,
    authorId: new Types.ObjectId(userId),
    parentId: body.parentId ? new Types.ObjectId(body.parentId) : undefined,
    text: body.text
  });
  await CommunityPost.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });
  return comment;
}

export async function reportContent(userId: string, body: { targetType: 'post' | 'comment'; targetId: string; reason: string }) {
  if (!Types.ObjectId.isValid(body.targetId)) throw notFound('Content not found');
  if (body.targetType === 'post') {
    const post = await CommunityPost.findOne({ _id: new Types.ObjectId(body.targetId), deletedAt: null });
    if (!post) throw notFound('Post not found');
    post.reports.push({ reporterId: new Types.ObjectId(userId), reason: body.reason, status: 'open', at: new Date() });
    await post.save();
  } else {
    const comment = await CommunityComment.findOne({ _id: new Types.ObjectId(body.targetId), deletedAt: null });
    if (!comment) throw notFound('Comment not found');
    await ContentReport.create({
      materialId: comment._id,
      reporterId: new Types.ObjectId(userId),
      reason: `[comment] ${body.reason}`
    } as never);
  }
  return { reported: true };
}

export const reportListQuerySchema = z.object({
  status: z.enum(['open', 'resolved', 'dismissed']).default('open'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

export const adminPostsQuerySchema = z.object({
  status: z.enum(['visible', 'hidden', 'removed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

export async function listReports(query: { status: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = { 'reports.status': query.status, deletedAt: null };
  const posts = await CommunityPost.find(filter).sort({ updatedAt: -1 })
    .skip((query.page - 1) * query.limit).limit(query.limit)
    .select('title authorId status reports').lean();
  const commentReports = await ContentReport.find({
    status: query.status, deletedAt: null,
    reason: { $regex: /^\[comment\]/ }
  }).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean();
  return {
    items: {
      posts: posts.map((p) => ({
        _id: p._id, title: p.title, status: p.status,
        openReports: (p.reports ?? []).filter((r) => r.status === query.status)
      })),
      comments: commentReports
    },
    meta: { page: query.page, limit: query.limit, total: posts.length + commentReports.length }
  };
}

export async function adminListPosts(query: { status?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    CommunityPost.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit)
      .populate('authorId', 'name email').lean(),
    CommunityPost.countDocuments(filter)
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total } };
}

export async function setFeaturedPost(postId: string, featured: boolean, actorId: string) {
  if (!Types.ObjectId.isValid(postId)) throw notFound('Post not found');
  const post = await CommunityPost.findOne({ _id: new Types.ObjectId(postId), deletedAt: null });
  if (!post) throw notFound('Post not found');
  post.featured = featured;
  post.featuredAt = featured ? new Date() : null;
  post.featuredBy = featured ? new Types.ObjectId(actorId) : null;
  await post.save();
  await writeAudit({
    actorId, action: featured ? 'community.post.feature' : 'community.post.unfeature',
    targetType: 'CommunityPost', targetId: postId, after: { featured }
  });
  return post;
}

export async function moderatePost(postId: string, action: 'hide' | 'remove' | 'restore', actorId: string, reason?: string) {
  if (!Types.ObjectId.isValid(postId)) throw notFound('Post not found');
  const post = await CommunityPost.findOne({ _id: new Types.ObjectId(postId), deletedAt: null });
  if (!post) throw notFound('Post not found');
  const newStatus = action === 'hide' ? 'hidden' : action === 'remove' ? 'removed' : 'visible';
  post.status = newStatus;
  if (action !== 'restore') {
    for (const r of post.reports) {
      if (r.status === 'open') r.status = 'resolved';
    }
  }
  await post.save();
  await writeAudit({
    actorId, action: `community.post.${action}`, targetType: 'CommunityPost', targetId: postId,
    after: { status: newStatus, reason }
  });
  return post;
}
