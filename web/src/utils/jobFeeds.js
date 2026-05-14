/** Strip tags without parsing as HTML (safer than innerHTML for third-party strings). */
export function stripHtml(html) {
  return String(html || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normUrl(u) {
  try {
    const x = new URL(u);
    return x.href.split('#')[0];
  } catch {
    return String(u || '');
  }
}

/**
 * @returns {Promise<Array<{ id: string, source: string, title: string, company: string, location: string, url: string, bodyText: string }>>}
 */
export async function fetchArbeitnowJobs() {
  const res = await fetch('https://www.arbeitnow.com/api/job-board-api', { method: 'GET' });
  if (!res.ok) throw new Error(`Arbeitnow HTTP ${res.status}`);
  const json = await res.json();
  const rows = json.data || [];
  return rows.map((j, i) => {
    const plain = stripHtml(j.description || '');
    const tags = Array.isArray(j.tags) ? j.tags.join(' ') : '';
    return {
      id: `arbeitnow-${j.slug || i}`,
      source: 'Arbeitnow',
      title: j.title || 'Untitled',
      company: j.company_name || '—',
      location: j.location || '',
      url: j.url || '',
      bodyText: `${j.title}\n${plain}\n${tags}`,
    };
  });
}

/**
 * @returns {Promise<Array<{ id: string, source: string, title: string, company: string, location: string, url: string, bodyText: string }>>}
 */
export async function fetchRemoteOkJobs() {
  const res = await fetch('https://remoteok.com/api', { method: 'GET' });
  if (!res.ok) throw new Error(`Remote OK HTTP ${res.status}`);
  const arr = await res.json();
  const rows = Array.isArray(arr) ? arr.slice(1) : [];
  return rows.map((j) => {
    const plain = stripHtml(j.description || '');
    const tags = Array.isArray(j.tags) ? j.tags.join(' ') : '';
    return {
      id: `remoteok-${j.id}`,
      source: 'Remote OK',
      title: j.position || 'Untitled',
      company: j.company || '—',
      location: j.location || 'Remote',
      url: j.url || j.apply_url || '',
      bodyText: `${j.position}\n${plain}\n${tags}`,
    };
  });
}

/**
 * Remotive public API (free, no key). Optional search narrows listings when supported.
 * @param {{ searchQuery?: string }} [opts]
 * @returns {Promise<Array<{ id: string, source: string, title: string, company: string, location: string, url: string, bodyText: string }>>}
 */
export async function fetchRemotiveJobs(opts = {}) {
  const q = String(opts.searchQuery || '').trim().slice(0, 80);
  const u = new URL('https://remotive.com/api/remote-jobs');
  if (q.length >= 2) u.searchParams.set('search', q);
  const res = await fetch(u.toString(), { method: 'GET' });
  if (!res.ok) throw new Error(`Remotive HTTP ${res.status}`);
  const json = await res.json();
  const rows = Array.isArray(json.jobs) ? json.jobs : [];
  return rows.map((j) => {
    const plain = stripHtml(j.description || '');
    const tags = Array.isArray(j.tags) ? j.tags.join(' ') : '';
    return {
      id: `remotive-${j.id}`,
      source: 'Remotive',
      title: j.title || 'Untitled',
      company: (j.company_name || '—').trim(),
      location: j.candidate_required_location || 'Remote',
      url: j.url || '',
      bodyText: `${j.title}\n${plain}\n${tags}`,
    };
  });
}

/** @param {{ searchQuery?: string }} [opts] */
export async function fetchAggregatedJobListings(opts = {}) {
  const out = [];
  const errors = [];

  const [an, ro, rm] = await Promise.allSettled([
    fetchArbeitnowJobs(),
    fetchRemoteOkJobs(),
    fetchRemotiveJobs({ searchQuery: opts.searchQuery }),
  ]);
  if (an.status === 'fulfilled') out.push(...an.value);
  else errors.push(`Arbeitnow: ${an.reason?.message || an.reason || 'failed'}`);

  if (ro.status === 'fulfilled') out.push(...ro.value);
  else errors.push(`Remote OK: ${ro.reason?.message || ro.reason || 'failed'}`);

  if (rm.status === 'fulfilled') out.push(...rm.value);
  else errors.push(`Remotive: ${rm.reason?.message || rm.reason || 'failed'}`);

  const seen = new Set();
  const deduped = [];
  for (const j of out) {
    if (!j.url) continue;
    const k = normUrl(j.url);
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(j);
  }

  return { jobs: deduped, errors };
}

/** Dedupe by apply URL across multiple fetches. */
export function mergeJobLists(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const j of list || []) {
      if (!j.url) continue;
      const k = normUrl(j.url);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(j);
    }
  }
  return out;
}

export function hasJSearchConfigured() {
  return Boolean(String(import.meta.env.VITE_RAPIDAPI_KEY || '').trim());
}

function mapJSearchRow(j, i, sourceLabel = 'JSearch') {
  const title = j.job_title || j.title || '';
  const company = j.employer_name || j.employer_name_text || j.company || '';
  const desc = stripHtml(j.job_description || j.description || '');
  const loc = [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') || j.job_location || (j.job_is_remote ? 'Remote' : '');
  const applyUrl = j.job_apply_link || j.job_google_link || '';
  let highlights = '';
  const h = j.job_highlights;
  if (h && typeof h === 'object') {
    highlights = Object.values(h)
      .flat()
      .filter((x) => typeof x === 'string')
      .join(' ');
  }
  const reqSkills = Array.isArray(j.job_required_skills) ? j.job_required_skills.join(' ') : '';
  const bodyText = [title, desc, highlights, reqSkills].filter(Boolean).join('\n');

  return {
    id: `jsearch-${j.job_id || applyUrl || i}`,
    source: sourceLabel,
    title: title || 'Untitled',
    company: company || '—',
    location: loc || '—',
    url: applyUrl,
    bodyText,
  };
}

/**
 * Google Jobs index via JSearch (includes Indeed, LinkedIn, Glassdoor, etc.).
 * @param {{ query: string, country?: string, numPages?: number }} opts
 */
export async function fetchJSearchJobs(opts) {
  const key = String(import.meta.env.VITE_RAPIDAPI_KEY || '').trim();
  if (!key) {
    throw new Error(
      'Add VITE_RAPIDAPI_KEY to flowping/web/.env (RapidAPI → subscribe to JSearch → copy key), then restart npm run dev.'
    );
  }
  const query = (opts.query || 'software engineer').trim();
  const country = String(opts.country || import.meta.env.VITE_JSEARCH_COUNTRY || 'us')
    .toLowerCase()
    .slice(0, 2);
  const numPages = Math.min(3, Math.max(1, Number(opts.numPages) || 1));

  const u = new URL('https://jsearch.p.rapidapi.com/search');
  u.searchParams.set('query', query);
  u.searchParams.set('page', '1');
  u.searchParams.set('num_pages', String(numPages));
  u.searchParams.set('country', country);

  const res = await fetch(u.toString(), {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  });
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error('JSearch returned non-JSON');
  }
  if (!res.ok) {
    throw new Error(json?.message || json?.error?.message || `JSearch HTTP ${res.status}`);
  }
  if (json.status === 'ERROR') {
    throw new Error(json.error?.message || json.message || 'JSearch error');
  }
  const raw = json.data;
  const sourceLabel = opts.sourceLabel || 'JSearch';
  let rows = [];
  if (Array.isArray(raw)) rows = raw;
  else if (raw && Array.isArray(raw.jobs)) rows = raw.jobs;
  return rows.map((j, idx) => mapJSearchRow(j, idx, sourceLabel)).filter((j) => j.url);
}

/** Platforms that use RapidAPI JSearch (needs VITE_RAPIDAPI_KEY). */
export const JSEARCH_PLATFORMS = new Set([
  'google_jsearch',
  'indeed_jsearch',
  'linkedin_jsearch',
  'glassdoor_jsearch',
  'dice_jsearch',
  'ziprecruiter_jsearch',
  'monster_jsearch',
  'simplyhired_jsearch',
  'careerbuilder_jsearch',
  'snagajob_jsearch',
]);

/** Query bias + board label (heuristic; results come from Google’s jobs index via JSearch, not official site APIs). */
const JSEARCH_BOARD = {
  indeed_jsearch: { bias: ' indeed', label: 'Indeed (JSearch)' },
  linkedin_jsearch: { bias: ' linkedin', label: 'LinkedIn (JSearch)' },
  glassdoor_jsearch: { bias: ' glassdoor', label: 'Glassdoor (JSearch)' },
  dice_jsearch: { bias: ' dice.com', label: 'Dice (JSearch)' },
  ziprecruiter_jsearch: { bias: ' ziprecruiter', label: 'ZipRecruiter (JSearch)' },
  monster_jsearch: { bias: ' monster', label: 'Monster (JSearch)' },
  simplyhired_jsearch: { bias: ' simply hired', label: 'SimplyHired (JSearch)' },
  careerbuilder_jsearch: { bias: ' careerbuilder', label: 'CareerBuilder (JSearch)' },
  snagajob_jsearch: { bias: ' snagajob', label: 'Snagajob (JSearch)' },
};

/**
 * @param {string} platform
 * @param {{ searchQuery?: string, country?: string, numPages?: number }} opts
 */
export async function fetchJobsByPlatform(platform, opts = {}) {
  const q = (opts.searchQuery || 'software engineer').trim();

  if (platform === 'google_jsearch') {
    const jobs = await fetchJSearchJobs({
      query: q.slice(0, 400),
      country: opts.country,
      numPages: opts.numPages ?? 2,
      sourceLabel: 'Google Jobs (JSearch)',
    });
    return { jobs, errors: [] };
  }

  const board = JSEARCH_BOARD[platform];
  if (board) {
    const jobs = await fetchJSearchJobs({
      query: `${q}${board.bias}`.slice(0, 400),
      country: opts.country,
      numPages: opts.numPages ?? 2,
      sourceLabel: board.label,
    });
    return { jobs, errors: [] };
  }

  if (platform === 'remoteok') {
    try {
      return { jobs: await fetchRemoteOkJobs(), errors: [] };
    } catch (e) {
      return { jobs: [], errors: [String(e?.message || e)] };
    }
  }
  if (platform === 'arbeitnow') {
    try {
      return { jobs: await fetchArbeitnowJobs(), errors: [] };
    } catch (e) {
      return { jobs: [], errors: [String(e?.message || e)] };
    }
  }
  if (platform === 'remotive') {
    try {
      return { jobs: await fetchRemotiveJobs({ searchQuery: q }), errors: [] };
    } catch (e) {
      return { jobs: [], errors: [String(e?.message || e)] };
    }
  }
  return fetchAggregatedJobListings({ searchQuery: q });
}
