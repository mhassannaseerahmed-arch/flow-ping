import express from 'express';
import { runAutomationTick, runFollowupPass, runCampaignAutomation } from '../automation.js';

export const automationRouter = express.Router();

function authorize(req) {
  // Allow Vercel Cron jobs automatically
  if (req.headers['x-vercel-cron'] === '1') return true;

  const secret = process.env.AUTOMATION_SECRET;
  if (!secret) return true;
  const auth = String(req.headers.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const bodySecret = String(req.body?.secret || '').trim();
  return bearer === secret || bodySecret === secret;
}

/**
 * POSTRun all automation (follow-ups + campaign sends). Optional JSON body:
 * { followups?: boolean, campaigns?: boolean, maxSends?: number, delayMs?: number, secret?: string }
 *
 * If AUTOMATION_SECRET is set in env, require Authorization: Bearer <secret> or body.secret.
 */
automationRouter.all('/run', async (req, res) => {
  if (!authorize(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const doFollowups = req.body?.followups !== false;
  const doCampaigns = req.body?.campaigns !== false;
  const maxSends = Number(
    req.body?.maxSends ?? process.env.AUTOMATION_MAX_SENDS_PER_TICK ?? 50
  );
  const delayMs = Number(req.body?.delayMs ?? process.env.AUTOMATION_DELAY_MS ?? 0);

  try {
    const data = await runAutomationTick({ maxSends, delayMs, doFollowups, doCampaigns });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || 'Automation failed' });
  }
});

automationRouter.post('/followups', async (req, res) => {
  if (!authorize(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const data = await runFollowupPass();
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || 'Follow-ups failed' });
  }
});

automationRouter.post('/campaigns', async (req, res) => {
  if (!authorize(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const maxSends = Number(req.body?.maxSends ?? process.env.AUTOMATION_MAX_SENDS_PER_TICK ?? 50);
  const delayMs = Number(req.body?.delayMs ?? process.env.AUTOMATION_DELAY_MS ?? 0);
  try {
    const data = await runCampaignAutomation({ maxSends, delayMs });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || 'Campaign automation failed' });
  }
});

automationRouter.get('/status', (req, res) => {
  const interval = Number(process.env.AUTOMATION_INTERVAL_MS || 0);
  res.json({
    success: true,
    data: {
      backgroundIntervalMs: interval,
      backgroundEnabled: interval > 0,
      secretRequired: Boolean(process.env.AUTOMATION_SECRET),
    },
  });
});
