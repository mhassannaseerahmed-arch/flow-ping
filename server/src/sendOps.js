import { nanoid } from 'nanoid';
import { readJson, writeJson } from './storage.js';
import { renderTemplate, deriveVars } from './templateEngine.js';
import { sendEmail } from './mailer.js';
import { canSendNow, recordSend } from './rateLimit.js';

const SENDS_FILE = 'sends.json';
const LEADS_FILE = 'leads.json';

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function textToHtmlWithLinks(text, clickTrackingBase) {
  const safe = escapeHtml(text);
  const withBreaks = safe.replaceAll('\n', '<br/>');
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

/**
 / Record one tracked send (open pixel + wrapped links) for a lead + template.
 */
export async function sendTrackedEmailToLead({ lead, template, extraVars = {} }) {
  if (!lead?.email) return { ok: false, error: 'Lead has no email' };
  if (!template?.id) return { ok: false, error: 'Invalid template' };
  if (String(lead.status || '').toLowerCase() === 'unsubscribed') return { ok: false, error: 'Lead unsubscribed' };

  const gate = canSendNow({ toEmail: lead.email });
  if (!gate.ok) return { ok: false, error: `Send blocked: ${gate.reason}` };

  const leadId = lead.id;
  const templateId = template.id;
  const vars = { ...deriveVars(lead), ...extraVars };
  const subject = renderTemplate(template.subject, vars);
  const bodyText = renderTemplate(template.bodyText, vars);

  // Ensure every outgoing email contains a working unsubscribe link.
  let unsubToken = String(lead.unsubToken || '').trim();
  if (!unsubToken) {
    unsubToken = nanoid();
    const leads = readJson(LEADS_FILE, []);
    const idx = leads.findIndex((l) => l.id === leadId);
    if (idx !== -1) {
      leads[idx] = { ...leads[idx], unsubToken, updatedAt: new Date().toISOString() };
      writeJson(LEADS_FILE, leads);
    }
  }

  const id = nanoid();
  const baseUrl = String(process.env.TRACKING_BASE_URL || `http://localhost:${process.env.PORT || 5055}`);
  const openTrackingUrl = `${baseUrl}/api/sends/t/open/${id}.gif`;
  const clickTrackingBase = `${baseUrl}/api/sends/t/click/${id}?u=`;
  const htmlFromText = textToHtmlWithLinks(bodyText, clickTrackingBase);
  const unsubBase = String(process.env.UNSUBSCRIBE_BASE_URL || baseUrl);
  const unsubUrl = `${unsubBase}/u/${encodeURIComponent(unsubToken)}`;

  const footerHtml = unsubUrl
    ? `<div style="margin-top:18px;font-size:12px;color:#64748b">If you prefer not to receive these emails, <a href="${unsubUrl}" target="_blank" rel="noreferrer">unsubscribe</a>.</div>`
    : '';
  const footerText = unsubUrl ? `\n\nUnsubscribe: ${unsubUrl}` : '';

  const bodyHtml = `${htmlFromText}${footerHtml}<img src="${openTrackingUrl}" width="1" height="1" alt="" style="display:none" />`;

  let sendResult;
  try {
    sendResult = await sendEmail({
      to: lead.email,
      subject,
      text: `${bodyText}${footerText}`,
      html: bodyHtml,
      headers: unsubUrl
        ? {
            'List-Unsubscribe': `<${unsubUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
        : undefined,
    });
  } catch (e) {
    return { ok: false, error: e?.message || 'SMTP send failed' };
  }

  const status = sendResult.dryRun
    ? 'dry-run'
    : Array.isArray(sendResult.rejected) && sendResult.rejected.length > 0
      ? 'failed'
      : 'sent';

  if (status === 'sent') {
    recordSend({ toEmail: lead.email });
  }

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

  const sends = readJson(SENDS_FILE, []);
  sends.unshift(record);
  writeJson(SENDS_FILE, sends);

  return { ok: true, record };
}
