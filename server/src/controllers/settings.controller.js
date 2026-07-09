import { SiteSettings } from '../models/SiteSettings.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logAdminAction } from '../utils/auditLog.js';

// Singleton — there's always exactly one row, found-or-created the same way
// the per-user Watch Later collection is (see findOrCreateWatchLater).
export async function findOrCreateSiteSettings() {
  let settings = await SiteSettings.findOne();
  if (!settings) settings = await SiteSettings.create({});
  return settings;
}

// No auth — the client needs this before it knows whether anyone is even
// logged in yet (maintenance gate, site branding), and it exposes nothing
// sensitive (no email/upload-limit internals a bad actor could use).
export const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await findOrCreateSiteSettings();
  res.json({
    siteName: settings.siteName,
    logoUrl: settings.logoUrl,
    maintenanceMode: settings.maintenanceMode,
  });
});

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await findOrCreateSiteSettings();
  res.json({ settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await findOrCreateSiteSettings();
  Object.assign(settings, req.body, { updatedBy: req.userId });
  await settings.save();

  res.json({ settings });
  logAdminAction({
    actor: req.userId,
    action: 'settings_change',
    targetType: 'settings',
    details: `Updated: ${Object.keys(req.body).join(', ')}`,
  });
});
