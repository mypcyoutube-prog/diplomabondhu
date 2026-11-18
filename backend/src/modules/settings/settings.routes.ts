import { Router } from 'express';
import { AppSettings } from '../../models/app-settings.model';
import { ok } from '../../core/response';

export async function getAppSettings() {
  let settings = await AppSettings.findOne();
  if (!settings) settings = await AppSettings.create({});
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
