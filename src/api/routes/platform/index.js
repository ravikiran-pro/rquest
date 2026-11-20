/**
 * Platform configuration routes — mounted at /api/v1/platform (see routes/index.js).
 *
 *   GET /settings        public: customer-facing settings (fees, feature switches, notices)
 *   GET /settings/admin  platform admin: every setting + defaults + last-updated metadata
 *   PUT /settings        platform admin: partial update, validated; returns the full saved set
 */
const express = require('express');
const { authMiddleware, requireAdmin } = require('../../auth');
const {
  DEFAULT_SETTINGS,
  PlatformSettingsValidationError,
  loadSettings,
  getPublicSettings,
  saveSettings,
} = require('../../services/platformSettings');

const router = express.Router();

router.get('/settings', async (_req, res) => {
  try {
    const settings = await getPublicSettings();
    res.set('Cache-Control', 'no-cache');
    return res.status(200).json({ success: true, data: settings });
  } catch (err) {
    console.error('Error reading platform settings:', err);
    return res.status(500).json({ success: false, error: 'Could not load platform settings' });
  }
});

router.get('/settings/admin', authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const { settings, meta } = await loadSettings({ fresh: true });
    return res.status(200).json({ success: true, data: settings, defaults: DEFAULT_SETTINGS, meta });
  } catch (err) {
    console.error('Error reading platform settings (admin):', err);
    return res.status(500).json({ success: false, error: 'Could not load platform settings' });
  }
});

router.put('/settings', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { settings, meta } = await saveSettings(req.body, req.headers.user_id);
    return res.status(200).json({
      success: true,
      message: 'Platform settings saved',
      data: settings,
      defaults: DEFAULT_SETTINGS,
      meta,
    });
  } catch (err) {
    if (err instanceof PlatformSettingsValidationError) {
      return res.status(400).json({
        success: false,
        error: 'Some settings are invalid',
        message: Object.values(err.errors)[0],
        errors: err.errors,
      });
    }
    console.error('Error saving platform settings:', err);
    return res.status(500).json({ success: false, error: 'Could not save platform settings' });
  }
});

module.exports = router;
