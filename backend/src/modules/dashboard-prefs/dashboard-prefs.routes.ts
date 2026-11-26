import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { ok, fail } from '../../core/response';
import { DashboardPref } from '../../models/dashboard-pref.model';
import { getAppSettings } from '../settings/settings.routes';

const sectionsSchema = z.array(z.object({
  key: z.string().trim().min(1).max(60),
  visible: z.boolean(),
  order: z.number().int().min(0).max(9999)
})).max(50);

const updateSchema = z.object({ sections: sectionsSchema });

export async function getMergedDashboard(userId: string) {
  const settings = await getAppSettings();
  const adminSections = [...settings.homepageSections]
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);
  const pref = await DashboardPref.findOne({ userId: new Types.ObjectId(userId) }).lean();
  if (!pref || pref.sections.length === 0) {
    return {
      customized: false,
      sections: adminSections.map((s) => ({
        key: s.key,
        visible: true,
        order: s.order,
        customizable: (s as { customizable?: boolean }).customizable !== false
      }))
    };
  }
  const prefByKey = new Map(pref.sections.map((s) => [s.key, s]));
  const sections = adminSections.map((s) => {
    const p = prefByKey.get(s.key);
    const customizable = (s as { customizable?: boolean }).customizable !== false;
    return {
      key: s.key,
      visible: !customizable ? true : p?.visible !== false,
      order: customizable && p ? p.order : s.order,
      customizable
    };
  }).sort((a, b) => a.order - b.order);
  return { customized: pref.sections.length > 0, sections };
}

export function dashboardPrefsRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET));

  router.get('/', async (req, res, next) => {
    try {
      return ok(res, await getMergedDashboard(req.auth!.id));
    } catch (err) { next(err); }
  });

  router.put('/', validate({ body: updateSchema }), async (req, res, next) => {
    try {
      const settings = await getAppSettings();
      const adminByKeys = new Map(settings.homepageSections.map((s) => [s.key, s]));
      const incoming = req.body.sections as { key: string; visible: boolean; order: number }[];
      for (const section of incoming) {
        const adminSection = adminByKeys.get(section.key);
        if (!adminSection || !adminSection.visible) {
          return fail(res, 400, 'VALIDATION_ERROR', `Section '${section.key}' is not available`);
        }
        if (adminSection.customizable === false && section.visible === false) {
          return fail(res, 400, 'VALIDATION_ERROR', `Section '${section.key}' cannot be hidden`);
        }
      }
      await DashboardPref.findOneAndUpdate(
        { userId: new Types.ObjectId(req.auth!.id) },
        { $set: { sections: incoming } },
        { upsert: true, new: true }
      );
      return ok(res, await getMergedDashboard(req.auth!.id));
    } catch (err) { next(err); }
  });

  router.post('/reset', async (req, res, next) => {
    try {
      await DashboardPref.deleteOne({ userId: new Types.ObjectId(req.auth!.id) });
      return ok(res, await getMergedDashboard(req.auth!.id));
    } catch (err) { next(err); }
  });

  return router;
}
