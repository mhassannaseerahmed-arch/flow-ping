import { readJson, writeJson } from './storage.js';
import { sendEmail } from './mailer.js';
import { sendTrackedEmailToLead } from './sendOps.js';
import { publish } from './realtime.js';

const SENDS_FILE = 'sends.json';
const LEADS_FILE = 'leads.json';
const TPL_FILE = 'templates.json';
const CAMPAIGNS_FILE = 'campaigns.json';

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Same behavior as POST /api/sends/followups/run (extracted for cron + combined tick). */
export async function runFollowupPass() {
  const now = new Date();

  const f1Hours = Number(process.env.FOLLOWUP_AFTER_OPEN_HOURS || 24);
  const f1CutoffMs = now.getTime() - f1Hours * 60 * 60 * 1000;
  const f1Subject = String(process.env.FOLLOWUP_SUBJECT || 'Quick follow-up');
  const f1BodyText = String(
    process.env.FOLLOWUP_BODY_TEXT ||
      "Just following up on my previous note — happy to send the 1-page audit if you share the two numbers (avg daily appointments + rough no-show %)."
  );

  const f2Hours = Number(process.env.FOLLOWUP2_AFTER_FOLLOWUP1_HOURS || 48);
  const f2CutoffMs = now.getTime() - f2Hours * 60 * 60 * 1000;
  const f2Subject = String(process.env.FOLLOWUP2_SUBJECT || 'Final quick follow-up');
  const f2BodyText = String(
    process.env.FOLLOWUP2_BODY_TEXT ||
      'Just checking if you saw my last note — happy to send the 1-page audit if you share avg daily appointments + rough no-show %.'
  );
  const f2OnlyIfNoClick = String(process.env.FOLLOWUP2_ONLY_IF_NO_CLICK || 'true').trim().toLowerCase() !== 'false';

  const sends = readJson(SENDS_FILE, []);
  const leads = readJson(LEADS_FILE, []);

  const results = { followup1: [], followup2: [] };
  let sent1 = 0;
  let sent2 = 0;
  let skipped1 = 0;
  let skipped2 = 0;

  for (let i = 0; i < sends.length; i += 1) {
    const s = sends[i];
    if (!s?.id) continue;

    // Follow-up #1: after open
    if (!s.followup1SentAt) {
      if (!s.lastOpenedAt || Number(s.openCount || 0) <= 0) {
        skipped1 += 1;
      } else {
        const openedAtMs = Date.parse(s.lastOpenedAt);
        if (!openedAtMs || openedAtMs > f1CutoffMs) {
          skipped1 += 1;
        } else {
          const lead = leads.find((l) => l.id === s.leadId);
          const to = lead?.email || s.to;
          if (!to) {
            skipped1 += 1;
          } else {
            try {
              const sendResult = await sendEmail({
                to,
                subject: f1Subject,
                text: f1BodyText,
                html: `<div style="white-space:pre-wrap;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">${escapeHtml(
                  f1BodyText
                )}</div>`,
              });

              const status = sendResult.dryRun
                ? 'dry-run'
                : Array.isArray(sendResult.rejected) && sendResult.rejected.length > 0
                  ? 'failed'
                  : 'sent';

              const nowIso = new Date().toISOString();
              sends[i] = { ...s, followup1SentAt: nowIso, followup1Status: status, updatedAt: nowIso };
              writeJson(SENDS_FILE, sends);

              publish('followup_sent', {
                type: 'followup_sent',
                step: 1,
                sendId: s.id,
                to,
                subject: f1Subject,
                status,
                at: nowIso,
              });

              results.followup1.push({ ok: true, sendId: s.id, to, status });
              sent1 += 1;
            } catch (e) {
              results.followup1.push({ ok: false, sendId: s.id, to, error: e?.message || 'follow-up 1 failed' });
            }
          }
        }
      }
    }

    // Follow-up #2: after follow-up #1
    if (s.followup1SentAt && !s.followup2SentAt) {
      if (f2OnlyIfNoClick && Number(s.clickCount || 0) > 0) {
        skipped2 += 1;
        continue;
      }
      const f1SentAtMs = Date.parse(s.followup1SentAt);
      if (!f1SentAtMs || f1SentAtMs > f2CutoffMs) {
        skipped2 += 1;
        continue;
      }

      const lead = leads.find((l) => l.id === s.leadId);
      const to = lead?.email || s.to;
      if (!to) {
        skipped2 += 1;
        continue;
      }

      try {
        const sendResult = await sendEmail({
          to,
          subject: f2Subject,
          text: f2BodyText,
          html: `<div style="white-space:pre-wrap;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">${escapeHtml(
            f2BodyText
          )}</div>`,
        });

        const status = sendResult.dryRun
          ? 'dry-run'
          : Array.isArray(sendResult.rejected) && sendResult.rejected.length > 0
            ? 'failed'
            : 'sent';

        const nowIso = new Date().toISOString();
        sends[i] = { ...s, followup2SentAt: nowIso, followup2Status: status, updatedAt: nowIso };
        writeJson(SENDS_FILE, sends);

        publish('followup_sent', {
          type: 'followup_sent',
          step: 2,
          sendId: s.id,
          to,
          subject: f2Subject,
          status,
          at: nowIso,
        });

        results.followup2.push({ ok: true, sendId: s.id, to, status });
        sent2 += 1;
      } catch (e) {
        results.followup2.push({ ok: false, sendId: s.id, to, error: e?.message || 'follow-up 2 failed' });
      }
    }
  }

  return {
    followup1: { sent: sent1, skipped: skipped1, afterOpenHours: f1Hours, results: results.followup1 },
    followup2: { sent: sent2, skipped: skipped2, afterFollowup1Hours: f2Hours, onlyIfNoClick: f2OnlyIfNoClick, results: results.followup2 },
  };
}

function alreadySent(sends, leadId, templateId) {
  return sends.some((s) => s.leadId === leadId && s.templateId === templateId);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function alreadySentToEmail(sends, toEmail, templateId) {
  const to = normalizeEmail(toEmail);
  return sends.some((s) => normalizeEmail(s.to) === to && s.templateId === templateId);
}

/**
 * For each campaign with automationEnabled + templateId, send to listed leadIds
 * (or all leads with status pending if leadIds is empty). Skips if that lead
 * already has a send row for the same template.
 */
export async function runCampaignAutomation({ maxSends = 50, delayMs = 0 }) {
  const campaigns = readJson(CAMPAIGNS_FILE, []).filter((c) => c.automationEnabled && c.templateId);
  const leads = readJson(LEADS_FILE, []);
  const templates = readJson(TPL_FILE, []);
  let sends = readJson(SENDS_FILE, []);

  const tplById = new Map(templates.map((t) => [t.id, t]));
  const results = [];
  let sent = 0;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const camp of campaigns) {
    const tpl = tplById.get(camp.templateId);
    if (!tpl) {
      results.push({ ok: false, campaignId: camp.id, error: 'Template not found' });
      continue;
    }

    let leadIds = Array.isArray(camp.leadIds) ? [...camp.leadIds] : [];
    if (leadIds.length === 0) {
      leadIds = leads.filter((l) => (l.status || 'pending') === 'pending' && l.email).map((l) => l.id);
    }

    for (const lid of leadIds) {
      if (sent >= maxSends) break;
      const lead = leads.find((l) => l.id === lid);
      if (!lead?.email) continue;
      if (String(lead.status || '').toLowerCase() === 'replied') continue;
      if (String(lead.status || '').toLowerCase() === 'unsubscribed') continue;
      // De-dupe by leadId and email (in case lead ids were regenerated/imported)
      if (alreadySent(sends, lead.id, camp.templateId)) continue;
      if (alreadySentToEmail(sends, lead.email, camp.templateId)) continue;

      const r = await sendTrackedEmailToLead({ lead, template: tpl });
      results.push({ ok: r.ok, campaignId: camp.id, leadId: lid, to: lead.email, error: r.error, status: r.record?.status });
      if (r.ok && r.record) {
        sent += 1;
        sends = [r.record, ...sends];
      }
      if (delayMs > 0) await sleep(delayMs);
    }
  }

  return { sent, results };
}

export async function runAutomationTick({
  maxSends = 50,
  delayMs = 0,
  doFollowups = true,
  doCampaigns = true,
} = {}) {
  const at = new Date().toISOString();
  const out = { at, followups: null, campaigns: null };

  if (doFollowups) {
    out.followups = await runFollowupPass();
  }
  if (doCampaigns) {
    out.campaigns = await runCampaignAutomation({ maxSends, delayMs });
  }

  return out;
}
