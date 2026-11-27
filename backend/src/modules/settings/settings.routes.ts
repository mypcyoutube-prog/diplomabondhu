import { Router } from 'express';
import { AppSettings } from '../../models/app-settings.model';
import { ok } from '../../core/response';

export const DEFAULT_HOMEPAGE_SECTIONS = [
  { key: 'announcements', visible: true, order: 10 },
  { key: 'quick_access', visible: true, order: 20 },
  { key: 'services', visible: true, order: 25 },
  { key: 'resources', visible: true, order: 30 },
  { key: 'materials', visible: true, order: 35 },
  { key: 'exams', visible: true, order: 40 },
  { key: 'gpa_calculator', visible: true, order: 50 },
  { key: 'planner', visible: true, order: 60 },
  { key: 'community', visible: true, order: 70 },
  { key: 'result_checker', visible: true, order: 80 }
];

export async function getAppSettings() {
  let settings = await AppSettings.findOne();
  if (!settings) settings = await AppSettings.create({ homepageSections: DEFAULT_HOMEPAGE_SECTIONS });
  const missing = DEFAULT_HOMEPAGE_SECTIONS.filter((d) => !settings!.homepageSections.some((s) => s.key === d.key));
  if (missing.length > 0) {
    settings.homepageSections = [...settings.homepageSections, ...missing] as typeof settings.homepageSections;
    await settings.save();
  }
  return settings;
}

export function settingsRoutes() {
  const router = Router();

  router.get('/app', async (_req, res, next) => {
    try {
      const s = await getAppSettings();
      return ok(res, {
        branding: s.branding,
        homepageSections: [...s.homepageSections].sort((a, b) => a.order - b.order),
        resultDisplay: {
          enabled: s.resultDisplay?.enabled ?? false,
          examId: s.resultDisplay?.examId ?? '',
          startsAt: s.resultDisplay?.startsAt ?? null,
          endsAt: s.resultDisplay?.endsAt ?? null
        },
        homeNotice: {
          text: s.homeNotice?.text ?? '',
          link: s.homeNotice?.link ?? '',
          visible: s.homeNotice?.visible ?? true,
          startsAt: s.homeNotice?.startsAt ?? null,
          endsAt: s.homeNotice?.endsAt ?? null
        },
        featureFlags: s.featureFlags,
        maintenanceMode: s.maintenanceMode,
        supportInfo: s.supportInfo,
        legal: s.legal,
        versionInfo: s.versionInfo
      });
    } catch (err) { next(err); }
  });

  return router;
}
