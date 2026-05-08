import express from 'express';
import { readJson, writeJson } from '../storage.js';
import { renderTemplate, deriveVars } from '../templateEngine.js';
import { publish } from '../realtime.js';
import { sendTrackedEmailToLead } from '../sendOps.js';
import { runFollowupPass } from '../automation.js';

const SENDS_FILE = 'sends.json';
const LEADS_FILE = 'leads.json';
const TPL_FILE = 'templates.json';

function load(filename, fallback) {
  return readJson(filename, fallback);
}
function save(filename, rows) {
  writeJson(filename, rows);
}

export const sendsRouter = express.Router();

// Follow-up worker: send follow-up #1 after open, then follow-up #2 after follow-up #1.
// NOTE: "not replied" is not detected yet (reply tracking is Phase 2).
// Configure:
// - FOLLOWUP_AFTER_OPEN_HOURS (default 24)
// - FOLLOWUP_SUBJECT (optional)
// - FOLLOWUP_BODY_TEXT (optional)
// - FOLLOWUP2_AFTER_FOLLOWUP1_HOURS (default 48)
// - FOLLOWUP2_SUBJECT (optional)
// - FOLLOWUP2_BODY_TEXT (optional)
// - FOLLOWUP2_ONLY_IF_NO_CLICK (default true)
sendsRouter.post('/followups/run', async (req, res) => {
  try {
    const data = await runFollowupPass();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e?.message || 'Follow-ups failed' });
  }
});

sendsRouter.get('/t/open/:id.gif', (req, res) => {
  const id = String(req.params.id || '');
  const sends = load(SENDS_FILE, []);
  const idx = sends.findIndex((s) => s.id === id);
  if (idx !== -1) {
    const nowIso = new Date().toISOString();
    const prev = sends[idx];
    const next = {
      ...prev,
      openCount: Number(prev.openCount || 0) + 1,
      firstOpenedAt: prev.firstOpenedAt || nowIso,
      lastOpenedAt: nowIso,
      updatedAt: nowIso,
    };
    sends[idx] = next;
    save(SENDS_FILE, sends);

    publish('email_opened', {
      type: 'email_opened',
      sendId: id,
      to: next.to,
      subject: next.subject,
      leadId: next.leadId,
      templateId: next.templateId,
      openCount: next.openCount,
      at: nowIso,
    });
  }

  // 1x1 transparent GIF
  const gif = Buffer.from(
    'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
    'base64'
  );
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(200).end(gif);
});

sendsRouter.get('/t/click/:id', (req, res) => {
  const id = String(req.params.id || '');
  const url = String(req.query.u || '');
  const sends = load(SENDS_FILE, []);
  const idx = sends.findIndex((s) => s.id === id);

  if (idx !== -1 && url) {
    const nowIso = new Date().toISOString();
    const prev = sends[idx];

    const next = {
      ...prev,
      clickCount: Number(prev.clickCount || 0) + 1,
      firstClickedAt: prev.firstClickedAt || nowIso,
      lastClickedAt: nowIso,
      clickedUrls: Array.isArray(prev.clickedUrls) ? prev.clickedUrls : [],
      updatedAt: nowIso,
    };
    next.clickedUrls.unshift({ url, at: nowIso });

    sends[idx] = next;
    save(SENDS_FILE, sends);

    publish('email_clicked', {
      type: 'email_clicked',
      sendId: id,
      to: next.to,
      subject: next.subject,
      leadId: next.leadId,
      templateId: next.templateId,
      url,
      clickCount: next.clickCount,
      at: nowIso,
    });
  }

  // Basic redirect (avoid open redirect to javascript:)
  if (!url || /^javascript:/i.test(url)) {
    res.status(400).send('Bad link');
    return;
  }
  res.redirect(302, url);
});

sendsRouter.get('/summary', (req, res) => {
  const sends = load(SENDS_FILE, []);

  const summary = sends.reduce(
    (acc, send) => {
      const status = send.status || 'unknown';
      acc.total += 1;
      acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
      return acc;
    },
    { total: 0, byStatus: {} }
  );

  res.json({ success: true, data: summary });
});

sendsRouter.get('/', (req, res) => {
  const sends = load(SENDS_FILE, []);
  const leads = load(LEADS_FILE, []);
  const templates = load(TPL_FILE, []);
  const q = String(req.query.q || '').trim().toLowerCase();

  const enriched = sends.map((send) => ({
    ...send,
    lead: leads.find((lead) => lead.id === send.leadId) || null,
    template: templates.find((template) => template.id === send.templateId) || null,
  }));

  const filtered = q
    ? enriched.filter((send) =>
        [
          send.to,
          send.subject,
          send.status,
          send.lead?.clinicName,
          send.lead?.contactName,
          send.template?.name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      )
    : enriched;

  res.json({ success: true, data: filtered });
});

// Preview a render for one lead + template (no sending)
sendsRouter.post('/preview', (req, res) => {
  const { leadId, templateId } = req.body || {};
  const lead = load(LEADS_FILE, []).find((l) => l.id === leadId);
  const tpl = load(TPL_FILE, []).find((t) => t.id === templateId);
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  if (!tpl) return res.status(404).json({ success: false, message: 'Template not found' });

  const vars = { ...deriveVars(lead), ...(req.body?.vars || {}) };
  const subject = renderTemplate(tpl.subject, vars);
  const bodyText = renderTemplate(tpl.bodyText, vars);

  res.json({ success: true, data: { subject, bodyText, vars } });
});

// Send one email and record it (uses DRY_RUN by default)
sendsRouter.post('/', async (req, res) => {
  const { leadId, templateId } = req.body || {};
  const leads = load(LEADS_FILE, []);
  const lead = leads.find((l) => l.id === leadId);
  const tpl = load(TPL_FILE, []).find((t) => t.id === templateId);
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  if (!tpl) return res.status(404).json({ success: false, message: 'Template not found' });
  if (!lead.email) return res.status(400).json({ success: false, message: 'Lead has no email' });

  const extra = req.body?.vars || {};
  const out = await sendTrackedEmailToLead({ lead, template: tpl, extraVars: extra });
  if (!out.ok) {
    return res.status(502).json({ success: false, message: out.error || 'Send failed' });
  }

  res.status(201).json({ success: true, data: out.record });
});

// Bulk-send: provide { templateId, leadIds?: string[], emails?: string[] }
sendsRouter.post('/bulk', async (req, res) => {
  const templateId = String(req.body?.templateId || '');
  const tpl = load(TPL_FILE, []).find((t) => t.id === templateId);
  if (!tpl) return res.status(404).json({ success: false, message: 'Template not found' });

  const leads = load(LEADS_FILE, []);
  const byId = new Map(leads.map((l) => [l.id, l]));
  const leadIds = Array.isArray(req.body?.leadIds) ? req.body.leadIds : [];
  const emails = Array.isArray(req.body?.emails) ? req.body.emails : [];

  const targets = [];
  for (const id of leadIds) {
    const lead = byId.get(id);
    if (lead?.email) targets.push(lead);
  }
  for (const email of emails) {
    const e = String(email || '').trim();
    if (!e || !e.includes('@')) continue;
    const lead = leads.find((l) => String(l.email || '').toLowerCase() === e.toLowerCase());
    if (lead) targets.push(lead);
  }

  // de-dupe by email
  const seen = new Set();
  const uniqueTargets = targets.filter((t) => {
    const key = String(t.email || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const results = [];
  for (const lead of uniqueTargets) {
    const extraVars = req.body?.vars || {};
    const out = await sendTrackedEmailToLead({ lead, template: tpl, extraVars });
    if (out.ok && out.record) {
      results.push({ ok: true, id: out.record.id, to: lead.email, status: out.record.status });
    } else {
      results.push({ ok: false, to: lead.email, error: out.error || 'Send failed' });
    }
  }

  res.status(201).json({ success: true, data: { attempted: uniqueTargets.length, results } });
});
