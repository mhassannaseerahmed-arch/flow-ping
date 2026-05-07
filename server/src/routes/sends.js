import express from 'express';
import { nanoid } from 'nanoid';
import { readJson, writeJson } from '../storage.js';
import { renderTemplate, deriveVars } from '../templateEngine.js';
import { sendEmail } from '../mailer.js';
import { publish } from '../realtime.js';

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

// Simple follow-up worker (MVP): send 1 follow-up email after open if not already sent.
// NOTE: "not replied" is not detected yet (reply tracking is Phase 2).
// Configure:
// - FOLLOWUP_AFTER_OPEN_HOURS (default 24)
// - FOLLOWUP_SUBJECT (optional)
// - FOLLOWUP_BODY_TEXT (optional)
sendsRouter.post('/followups/run', async (req, res) => {
  const now = new Date();
  const hours = Number(process.env.FOLLOWUP_AFTER_OPEN_HOURS || 24);
  const cutoffMs = now.getTime() - hours * 60 * 60 * 1000;

  const followupSubject = String(process.env.FOLLOWUP_SUBJECT || 'Quick follow-up');
  const followupBodyText = String(
    process.env.FOLLOWUP_BODY_TEXT ||
      "Just following up on my previous note — happy to send the 1-page audit if you share the two numbers (avg daily appointments + rough no-show %)."
  );

  const sends = load(SENDS_FILE, []);
  const leads = load(LEADS_FILE, []);

  const results = [];
  let sent = 0;
  let skipped = 0;

  for (let i = 0; i < sends.length; i += 1) {
    const s = sends[i];
    if (!s?.id) continue;
    if (s.followup1SentAt) {
      skipped += 1;
      continue;
    }
    if (!s.lastOpenedAt || Number(s.openCount || 0) <= 0) {
      skipped += 1;
      continue;
    }
    const openedAtMs = Date.parse(s.lastOpenedAt);
    if (!openedAtMs || openedAtMs > cutoffMs) {
      skipped += 1;
      continue;
    }

    const lead = leads.find((l) => l.id === s.leadId);
    const to = lead?.email || s.to;
    if (!to) {
      skipped += 1;
      continue;
    }

    try {
      const sendResult = await sendEmail({
        to,
        subject: followupSubject,
        text: followupBodyText,
        html: `<div style="white-space:pre-wrap;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">${escapeHtml(
          followupBodyText
        )}</div>`,
      });

      const status = sendResult.dryRun
        ? 'dry-run'
        : Array.isArray(sendResult.rejected) && sendResult.rejected.length > 0
          ? 'failed'
          : 'sent';

      const nowIso = new Date().toISOString();
      sends[i] = { ...s, followup1SentAt: nowIso, followup1Status: status, updatedAt: nowIso };
      save(SENDS_FILE, sends);

      publish('followup_sent', {
        type: 'followup_sent',
        sendId: s.id,
        to,
        subject: followupSubject,
        status,
        at: nowIso,
      });

      results.push({ ok: true, sendId: s.id, to, status });
      sent += 1;
    } catch (e) {
      results.push({ ok: false, sendId: s.id, to, error: e?.message || 'follow-up failed' });
    }
  }

  res.json({ success: true, data: { attempted: results.length, sent, skipped, hours, results } });
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

  const vars = { ...deriveVars(lead), ...(req.body?.vars || {}) };
  const subject = renderTemplate(tpl.subject, vars);
  const bodyText = renderTemplate(tpl.bodyText, vars);

  const id = nanoid();
  const baseUrl = String(process.env.TRACKING_BASE_URL || `http://localhost:${process.env.PORT || 5055}`);
  const openTrackingUrl = `${baseUrl}/api/sends/t/open/${id}.gif`;
  const clickTrackingBase = `${baseUrl}/api/sends/t/click/${id}?u=`;
  const htmlFromText = textToHtmlWithLinks(bodyText, clickTrackingBase);
  const bodyHtml = `${htmlFromText}<img src="${openTrackingUrl}" width="1" height="1" alt="" style="display:none" />`;

  let sendResult;
  try {
    sendResult = await sendEmail({
      to: lead.email,
      subject,
      text: bodyText,
      html: bodyHtml,
    });
  } catch (e) {
    const msg = e?.message || 'SMTP send failed';
    return res.status(502).json({ success: false, message: msg });
  }

  const status = sendResult.dryRun
    ? 'dry-run'
    : Array.isArray(sendResult.rejected) && sendResult.rejected.length > 0
      ? 'failed'
      : 'sent';

  const sends = load(SENDS_FILE, []);
  const record = {
    id,
    leadId,
    templateId,
    to: lead.email,
    subject,
    bodyText,
    bodyHtml,
    vars,
    status,
    openCount: 0,
    firstOpenedAt: null,
    lastOpenedAt: null,
    clickCount: 0,
    firstClickedAt: null,
    lastClickedAt: null,
    clickedUrls: [],
    sendResult,
    createdAt: new Date().toISOString(),
  };
  sends.unshift(record);
  save(SENDS_FILE, sends);

  res.status(201).json({ success: true, data: record });
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

  const sends = load(SENDS_FILE, []);
  const createdAt = new Date().toISOString();

  const results = [];
  for (const lead of uniqueTargets) {
    const vars = { ...deriveVars(lead), ...(req.body?.vars || {}) };
    const subject = renderTemplate(tpl.subject, vars);
    const bodyText = renderTemplate(tpl.bodyText, vars);

    const id = nanoid();
    const baseUrl = String(process.env.TRACKING_BASE_URL || `http://localhost:${process.env.PORT || 5055}`);
    const openTrackingUrl = `${baseUrl}/api/sends/t/open/${id}.gif`;
    const clickTrackingBase = `${baseUrl}/api/sends/t/click/${id}?u=`;
    const htmlFromText = textToHtmlWithLinks(bodyText, clickTrackingBase);
    const bodyHtml = `${htmlFromText}<img src="${openTrackingUrl}" width="1" height="1" alt="" style="display:none" />`;

    try {
      const sendResult = await sendEmail({
        to: lead.email,
        subject,
        text: bodyText,
        html: bodyHtml,
      });

      const status = sendResult.dryRun
        ? 'dry-run'
        : Array.isArray(sendResult.rejected) && sendResult.rejected.length > 0
          ? 'failed'
          : 'sent';

      const record = {
        id,
        leadId: lead.id,
        templateId,
        to: lead.email,
        subject,
        bodyText,
        bodyHtml,
        vars,
        status,
        openCount: 0,
        firstOpenedAt: null,
        lastOpenedAt: null,
        clickCount: 0,
        firstClickedAt: null,
        lastClickedAt: null,
        clickedUrls: [],
        sendResult,
        createdAt,
      };
      sends.unshift(record);
      results.push({ ok: true, id, to: lead.email, status });
    } catch (e) {
      results.push({ ok: false, to: lead.email, error: e?.message || 'Send failed' });
    }
  }

  save(SENDS_FILE, sends);
  res.status(201).json({ success: true, data: { attempted: uniqueTargets.length, results } });
});

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function textToHtmlWithLinks(text, clickTrackingBase) {
  const safe = escapeHtml(text);
  const withBreaks = safe.replaceAll('\n', '<br/>');

  // very simple URL matcher for http(s)
  const urlRe = /(https?:\/\/[^\s<]+)/g;
  return (
    '<div style="white-space:normal;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.45">' +
    withBreaks.replace(urlRe, (rawUrl) => {
      const href = `${clickTrackingBase}${encodeURIComponent(rawUrl)}`;
      return `<a href="${href}" target="_blank" rel="noreferrer">${rawUrl}</a>`;
    }) +
    '</div>'
  );
}

