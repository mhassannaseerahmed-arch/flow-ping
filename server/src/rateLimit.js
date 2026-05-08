import { readJson, writeJson } from './storage.js';

const FILE = 'sendStats.json';

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function domainOf(email) {
  const e = normalizeEmail(email);
  const at = e.lastIndexOf('@');
  return at === -1 ? '' : e.slice(at + 1);
}

async function load() {
  return readJson(FILE, { days: {} });
}

async function save(stats) {
  await writeJson(FILE, stats);
}

export async function canSendNow({ toEmail }) {
  const start = String(process.env.SEND_WINDOW_START || '09:00');
  const end = String(process.env.SEND_WINDOW_END || '17:00');
  const weekdaysOnly = String(process.env.SEND_WEEKDAYS_ONLY || 'true').trim().toLowerCase() !== 'false';

  const now = new Date();
  const day = now.getDay();
  if (weekdaysOnly && (day === 0 || day === 6)) {
    return { ok: false, reason: 'outside_weekdays' };
  }

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const cur = `${hh}:${mm}`;
  if (cur < start || cur > end) {
    return { ok: false, reason: 'outside_send_window' };
  }

  const maxDaily = Number(process.env.MAX_SENDS_PER_DAY || 40);
  const maxPerDomain = Number(process.env.MAX_SENDS_PER_DOMAIN_PER_DAY || 5);
  const domain = domainOf(toEmail);
  const key = todayKey();
  const stats = await load();
  const dayStats = stats.days[key] || { total: 0, byDomain: {} };

  if (dayStats.total >= maxDaily) return { ok: false, reason: 'daily_cap' };
  if (domain && (dayStats.byDomain[domain] || 0) >= maxPerDomain) return { ok: false, reason: 'domain_cap' };

  return { ok: true };
}

export async function recordSend({ toEmail }) {
  const key = todayKey();
  const domain = domainOf(toEmail);
  const stats = await load();
  const dayStats = stats.days[key] || { total: 0, byDomain: {} };

  dayStats.total += 1;
  if (domain) {
    dayStats.byDomain[domain] = (dayStats.byDomain[domain] || 0) + 1;
  }
  stats.days[key] = dayStats;
  await save(stats);

  return dayStats;
}
