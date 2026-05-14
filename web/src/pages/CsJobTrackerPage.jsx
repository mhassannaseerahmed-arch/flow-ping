import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractProfileFromResume, resumeFileToPlainText } from '../utils/resumeExtract.js';
import { fetchJobsByPlatform, hasJSearchConfigured, JSEARCH_PLATFORMS } from '../utils/jobFeeds.js';

/** Only list jobs at or above this fit % (integer scores). */
const MIN_FIT = 80;

/** Platforms scanned by "Count keyword" (one fetch each; JSearch uses 1 page). */
const KEYWORD_SNAPSHOT_PLATFORMS = [
  ['remoteok', 'Remote OK'],
  ['arbeitnow', 'Arbeitnow'],
  ['remotive', 'Remotive'],
  ['google_jsearch', 'Google Jobs (JSearch)'],
  ['linkedin_jsearch', 'LinkedIn (JSearch)'],
  ['indeed_jsearch', 'Indeed (JSearch)'],
  ['glassdoor_jsearch', 'Glassdoor (JSearch)'],
  ['dice_jsearch', 'Dice (JSearch)'],
  ['ziprecruiter_jsearch', 'ZipRecruiter (JSearch)'],
  ['monster_jsearch', 'Monster (JSearch)'],
  ['simplyhired_jsearch', 'SimplyHired (JSearch)'],
  ['careerbuilder_jsearch', 'CareerBuilder (JSearch)'],
  ['snagajob_jsearch', 'Snagajob (JSearch)'],
];

function jobTextMatchesKeyword(j, kw) {
  const k = String(kw || '').trim().toLowerCase();
  if (k.length < 2) return false;
  const blob = `${j.title}\n${j.company}\n${j.bodyText}`.toLowerCase();
  return blob.includes(k);
}

const APPLIED_STORAGE_KEY = 'applykit-applied-jobs-v1';

/** Stable key for “already applied” across reloads (URL preferred). */
function stableJobKey(j) {
  const u = String(j.url || '').trim();
  if (u) {
    try {
      const x = new URL(u);
      return x.href.split('#')[0];
    } catch {
      return u;
    }
  }
  return `id:${j.id || ''}`;
}

function loadAppliedMap() {
  try {
    const raw = localStorage.getItem(APPLIED_STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

function fitScore(skills, text) {
  if (!text?.trim() || !skills?.length) return null;
  const t = text.toLowerCase();
  const hits = skills.filter((s) => t.includes(String(s).toLowerCase()));
  return Math.min(100, Math.round((hits.length / Math.max(skills.length, 1)) * 100));
}

export default function CsJobTrackerPage() {
  const [headline, setHeadline] = useState('');
  const [skills, setSkills] = useState([]);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [dropHover, setDropHover] = useState(false);
  const resumeFileRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [filter, setFilter] = useState('');
  const [jobTab, setJobTab] = useState('all');
  const [jobPlatform, setJobPlatform] = useState('both_free');
  const [appliedMap, setAppliedMap] = useState(loadAppliedMap);
  const [appliedListFilter, setAppliedListFilter] = useState('all');
  const [countKeyword, setCountKeyword] = useState('');
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState('');
  const [snapshotRows, setSnapshotRows] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(APPLIED_STORAGE_KEY, JSON.stringify(appliedMap));
    } catch {
      /* ignore quota / private mode */
    }
  }, [appliedMap]);

  const toggleApplied = useCallback((j) => {
    const key = stableJobKey(j);
    setAppliedMap((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = { at: new Date().toISOString() };
      return next;
    });
  }, []);

  /** Opens listing in a new tab and records as Applied (does not clear if already applied). */
  const openAndTrackApply = useCallback((j) => {
    const u = String(j.url || '').trim();
    if (!u) return;
    window.open(u, '_blank', 'noopener,noreferrer');
    const key = stableJobKey(j);
    setAppliedMap((prev) => {
      if (prev[key]) return prev;
      return { ...prev, [key]: { at: new Date().toISOString() } };
    });
  }, []);

  const searchQuery = useMemo(() => {
    const bits = [headline, ...skills.slice(0, 12)].filter(Boolean);
    const q = bits.join(' ').trim();
    return q.length >= 2 ? q.slice(0, 220) : 'software developer';
  }, [headline, skills]);

  const scored = useMemo(() => {
    const withFit = jobs.map((j) => {
      const k = stableJobKey(j);
      const entry = appliedMap[k];
      return {
        ...j,
        _key: k,
        fit: skills.length > 0 ? fitScore(skills, j.bodyText) : null,
        applied: Boolean(entry),
        appliedAt: entry?.at || null,
      };
    });
    if (skills.length === 0) return withFit;
    return [...withFit].sort((a, b) => (b.fit ?? 0) - (a.fit ?? 0));
  }, [jobs, skills, appliedMap]);

  const filterByApplied = useCallback(
    (list) => {
      if (appliedListFilter === 'hide_applied') return list.filter((j) => !j.applied);
      if (appliedListFilter === 'applied_only') return list.filter((j) => j.applied);
      return list;
    },
    [appliedListFilter]
  );

  const visibleAll = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = !q
      ? scored
      : scored.filter((j) =>
          `${j.title} ${j.company} ${j.location} ${j.bodyText}`.toLowerCase().includes(q)
        );
    return filterByApplied(list);
  }, [scored, filter, filterByApplied]);

  const visibleMatch = useMemo(() => {
    if (skills.length === 0) return [];
    let list = scored.filter((j) => j.fit != null && j.fit >= MIN_FIT);
    const q = filter.trim().toLowerCase();
    if (q) {
      list = list.filter((j) =>
        `${j.title} ${j.company} ${j.location} ${j.bodyText}`.toLowerCase().includes(q)
      );
    }
    return filterByApplied(list);
  }, [scored, filter, skills, filterByApplied]);

  const displayRows = jobTab === 'all' ? visibleAll : visibleMatch;

  const applyResumeText = useCallback((plain) => {
    setResumeError('');
    const ex = extractProfileFromResume(plain);
    setHeadline(ex.headline);
    setSkills(ex.skills.length ? ex.skills : []);
  }, []);

  const ingestFile = useCallback(
    async (file) => {
      if (!file) return;
      setResumeBusy(true);
      setResumeError('');
      try {
        const text = await resumeFileToPlainText(file);
        applyResumeText(text);
      } catch (e) {
        setResumeError(e?.message || 'Could not read file.');
      } finally {
        setResumeBusy(false);
        if (resumeFileRef.current) resumeFileRef.current.value = '';
      }
    },
    [applyResumeText]
  );

  const loadJobs = async () => {
    setLoading(true);
    setFetchError('');
    try {
      if (JSEARCH_PLATFORMS.has(jobPlatform) && !hasJSearchConfigured()) {
        setFetchError(
          'This platform uses JSearch on RapidAPI. Add VITE_RAPIDAPI_KEY to flowping/web/.env (subscribe to JSearch), restart npm run dev, then try again.'
        );
        return;
      }
      const { jobs: next, errors } = await fetchJobsByPlatform(jobPlatform, { searchQuery });
      setJobs(next);
      if (errors.length) setFetchError(errors.join(' · '));
    } catch (e) {
      setFetchError(e?.message || 'Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  const runKeywordSnapshot = async () => {
    const kw = countKeyword.trim();
    if (kw.length < 2) {
      setSnapshotError('Enter at least 2 characters (e.g. MERN, React Native).');
      setSnapshotRows(null);
      return;
    }
    setSnapshotLoading(true);
    setSnapshotError('');
    setSnapshotRows(null);
    try {
      const hasKey = hasJSearchConfigured();
      const specs = KEYWORD_SNAPSHOT_PLATFORMS.filter(([id]) => !JSEARCH_PLATFORMS.has(id) || hasKey);
      const results = await Promise.all(
        specs.map(async ([id, label]) => {
          try {
            const { jobs, errors } = await fetchJobsByPlatform(id, { searchQuery: kw, numPages: 1 });
            const err = errors?.length ? errors.join(' · ') : '';
            const matching = jobs.filter((j) => jobTextMatchesKeyword(j, kw)).length;
            return { id, label, total: jobs.length, matching, apiNote: err || null };
          } catch (e) {
            return { id, label, total: 0, matching: 0, apiNote: e?.message || 'Failed' };
          }
        })
      );
      setSnapshotRows(results);
    } catch (e) {
      setSnapshotError(e?.message || 'Could not complete snapshot.');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const card = {
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 20,
    background: '#fff',
    marginBottom: 16,
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>ApplyKit</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
              Use <b>All jobs</b> to browse everything fetched, or <b>Match jobs</b> for roles at <b>{MIN_FIT}%+</b> fit vs your resume skills.
            </p>
          </div>
          <Link to="/" style={{ fontSize: 13, color: '#334155', fontWeight: 700, textDecoration: 'none' }}>
            ← Home
          </Link>
        </div>

        {resumeError ? <div style={{ ...card, background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', fontWeight: 700 }}>{resumeError}</div> : null}
        {fetchError ? <div style={{ ...card, background: '#fffbeb', borderColor: '#fde68a', color: '#92400e', fontSize: 13 }}>{fetchError}</div> : null}

        <div
          style={{
            ...card,
            borderStyle: dropHover ? 'dashed' : 'solid',
            borderColor: dropHover ? '#6366f1' : '#e2e8f0',
            background: dropHover ? 'rgba(238,242,255,.4)' : '#fff',
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setDropHover(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDropHover(true);
          }}
          onDragLeave={() => setDropHover(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDropHover(false);
            const f = e.dataTransfer.files?.[0];
            if (f) ingestFile(f);
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, color: '#4338ca', marginBottom: 10 }}>RESUME</div>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>PDF or .txt. We infer skills from the file — nothing is assumed before upload.</p>
          <input ref={resumeFileRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" onChange={(e) => ingestFile(e.target.files?.[0])} style={{ marginBottom: 12 }} />
          {resumeBusy ? <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 700 }}>Reading…</div> : null}
          {headline ? (
            <div style={{ marginTop: 12, fontSize: 13, color: '#0f172a' }}>
              <strong>Detected:</strong> {headline}
            </div>
          ) : null}
          {skills.length ? (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.slice(0, 24).map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                  }}
                >
                  {s}
                </span>
              ))}
              {skills.length > 24 ? <span style={{ fontSize: 11, color: '#64748b' }}>+{skills.length - 24} more</span> : null}
            </div>
          ) : null}
          {!skills.length ? (
            <div style={{ marginTop: 10, fontSize: 13, color: '#b45309', fontWeight: 700, lineHeight: 1.45 }}>
              {headline
                ? 'No skills extracted from this file yet — fit % stays off until technologies are detected.'
                : 'Upload a resume to enable personalized fit %.'}
            </div>
          ) : null}
        </div>

        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#5b21b6', marginBottom: 10 }}>JOBS</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All jobs', count: jobs.length ? visibleAll.length : 0 },
              { id: 'match', label: 'Match jobs', count: visibleMatch.length },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setJobTab(t.id)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: jobTab === t.id ? '2px solid #6d28d9' : '1px solid #e2e8f0',
                  background: jobTab === t.id ? '#f5f3ff' : '#fff',
                  color: jobTab === t.id ? '#5b21b6' : '#475569',
                  fontWeight: jobTab === t.id ? 900 : 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {t.label}
                <span style={{ opacity: 0.85, marginLeft: 6 }}>({t.count})</span>
              </button>
            ))}
          </div>

          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 12,
              border: '1px solid #e0e7ff',
              background: '#fafbff',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 900, color: '#4338ca', marginBottom: 6 }}>Keyword counts by platform</div>
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 10px', lineHeight: 1.45 }}>
              This does <strong>not</strong> show how many jobs exist worldwide on LinkedIn or elsewhere. It runs <strong>one sample fetch per platform</strong> using your keyword as the search query (free boards: full list then counted; Remotive/JSearch: API-limited pages). The column <strong>Keyword matches</strong> counts rows whose title, company, or description still contain that text. Without <code style={{ fontSize: 10 }}>VITE_RAPIDAPI_KEY</code>, JSearch sources are skipped.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: snapshotRows?.length ? 12 : 0 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 800, color: '#475569' }}>
                Job title / keyword
                <input
                  value={countKeyword}
                  onChange={(e) => setCountKeyword(e.target.value)}
                  placeholder="e.g. MERN, SRE, product manager"
                  style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1', minWidth: 220, fontWeight: 600 }}
                />
              </label>
              <button
                type="button"
                disabled={snapshotLoading}
                onClick={runKeywordSnapshot}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid #6366f1',
                  background: snapshotLoading ? '#e0e7ff' : '#eef2ff',
                  color: '#3730a3',
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: snapshotLoading ? 'wait' : 'pointer',
                }}
              >
                {snapshotLoading ? 'Fetching…' : 'Count per platform'}
              </button>
            </div>
            {snapshotError ? <div style={{ fontSize: 12, color: '#b45309', fontWeight: 700, marginTop: 8 }}>{snapshotError}</div> : null}
            {snapshotRows && snapshotRows.length > 0 ? (
              <div style={{ overflowX: 'auto', marginTop: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #c7d2fe' }}>
                      <th style={{ padding: '8px 6px' }}>Platform</th>
                      <th style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>Returned (sample)</th>
                      <th style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>Keyword matches</th>
                      <th style={{ padding: '8px 6px' }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshotRows.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                        <td style={{ padding: '8px 6px', fontWeight: 700 }}>{row.label}</td>
                        <td style={{ padding: '8px 6px' }}>{row.total}</td>
                        <td style={{ padding: '8px 6px', fontWeight: 800, color: row.matching ? '#059669' : '#64748b' }}>{row.matching}</td>
                        <td style={{ padding: '8px 6px', fontSize: 11, color: '#94a3b8' }}>{row.apiNote || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0 0' }}>
                  Example: if LinkedIn (JSearch) shows Keyword matches 12, that is 12 listings in that one API batch that mention your keyword — not 12 total on LinkedIn.
                </p>
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 800, color: '#475569' }}>
              Platform
              <select
                value={jobPlatform}
                onChange={(e) => setJobPlatform(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                  minWidth: 280,
                  maxWidth: '100%',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#fff',
                }}
              >
                <optgroup label="Free — no API key (public feeds)">
                  <option value="both_free">Remote OK + Arbeitnow + Remotive (merged, deduped)</option>
                  <option value="remoteok">Remote OK only</option>
                  <option value="arbeitnow">Arbeitnow only</option>
                  <option value="remotive">Remotive only</option>
                </optgroup>
                <optgroup label="JSearch — needs VITE_RAPIDAPI_KEY (RapidAPI)">
                  <option value="google_jsearch">Google Jobs index (broad)</option>
                  <option value="indeed_jsearch">Indeed (query bias)</option>
                  <option value="linkedin_jsearch">LinkedIn (query bias)</option>
                  <option value="glassdoor_jsearch">Glassdoor (query bias)</option>
                  <option value="dice_jsearch">Dice (query bias)</option>
                  <option value="ziprecruiter_jsearch">ZipRecruiter (query bias)</option>
                  <option value="monster_jsearch">Monster (query bias)</option>
                  <option value="simplyhired_jsearch">SimplyHired (query bias)</option>
                  <option value="careerbuilder_jsearch">CareerBuilder (query bias)</option>
                  <option value="snagajob_jsearch">Snagajob (query bias)</option>
                </optgroup>
              </select>
            </label>
            <button
              type="button"
              disabled={loading}
              onClick={loadJobs}
              style={{
                padding: '12px 18px',
                borderRadius: 12,
                border: 'none',
                background: loading ? '#94a3b8' : '#6d28d9',
                color: '#fff',
                fontWeight: 900,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Loading…' : 'Load jobs'}
            </button>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 800, color: '#475569' }}>
              Applied
              <select
                value={appliedListFilter}
                onChange={(e) => setAppliedListFilter(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1', minWidth: 150, fontWeight: 700, color: '#0f172a', background: '#fff' }}
              >
                <option value="all">Show all</option>
                <option value="hide_applied">Hide applied</option>
                <option value="applied_only">Applied only</option>
              </select>
            </label>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              style={{ flex: 1, minWidth: 160, padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}
            />
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>
              {jobs.length === 0
                ? 'No listings loaded — click Load jobs'
                : jobTab === 'all'
                  ? `${visibleAll.length} shown · ${jobs.length} loaded`
                  : !skills.length
                    ? `Match tab needs resume · ${jobs.length} loaded`
                    : `${visibleMatch.length} at ${MIN_FIT}%+ · ${jobs.length} loaded`}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px', lineHeight: 1.45 }}>
            <strong>Free</strong> boards need no key; <strong>JSearch</strong> rows need <code style={{ fontSize: 11 }}>VITE_RAPIDAPI_KEY</code> and use Google-style job index results (biased options only nudge the search text, not official board APIs). Query: <b>{searchQuery}</b>.
            {' '}
            <strong>Apply</strong> opens the listing and marks it applied; use <strong>Open</strong> to view without marking. Saved locally in this browser.
            {!skills.length ? <span style={{ color: '#b45309', fontWeight: 700 }}> Upload a resume for fit % on Match.</span> : null}
          </p>
          {jobs.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 14 }}>Click “Load jobs”.</div>
          ) : jobTab === 'match' && !skills.length ? (
            <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
              Upload a resume to see <b>{MIN_FIT}%+</b> matches, or switch to <b>All jobs</b>.
            </div>
          ) : displayRows.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
              {filter.trim()
                ? 'Nothing matches this filter in this tab — clear the filter or try other keywords.'
                : jobTab === 'match'
                  ? `No jobs in this batch at ${MIN_FIT}%+ fit — try All jobs or reload listings.`
                  : 'No rows (unexpected) — try Load jobs again.'}
            </div>
          ) : (
            <div style={{ maxHeight: 480, overflow: 'auto', border: '1px solid #e9d5ff', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#faf5ff', zIndex: 1 }}>
                  <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e9d5ff' }}>
                    <th style={{ padding: '10px 8px', width: 1 }}>Apply</th>
                    <th style={{ padding: '10px 8px' }}>Fit</th>
                    <th style={{ padding: '10px 8px' }}>Applied</th>
                    <th style={{ padding: '10px 8px' }}>Board</th>
                    <th style={{ padding: '10px 8px' }}>Role</th>
                    <th style={{ padding: '10px 8px' }}> </th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((j) => (
                    <tr
                      key={j.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        verticalAlign: 'top',
                        background: j.applied ? 'rgba(16, 185, 129, 0.06)' : undefined,
                      }}
                    >
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          disabled={!j.url}
                          onClick={() => openAndTrackApply(j)}
                          aria-label={`Apply to ${j.title} at ${j.company}`}
                          title={j.url ? 'Open listing in a new tab and mark as Applied' : 'No listing URL for this row'}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 10,
                            border: 'none',
                            background: !j.url ? '#e2e8f0' : '#6d28d9',
                            color: !j.url ? '#94a3b8' : '#fff',
                            fontWeight: 900,
                            fontSize: 12,
                            cursor: !j.url ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Apply
                        </button>
                      </td>
                      <td
                        style={{
                          padding: '10px 8px',
                          fontWeight: 950,
                          color: j.fit == null ? '#94a3b8' : j.fit >= MIN_FIT ? '#059669' : '#64748b',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {j.fit == null ? '—' : `${j.fit}%`}
                      </td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => toggleApplied(j)}
                          title={j.appliedAt ? `Marked ${new Date(j.appliedAt).toLocaleString()}` : 'Mark when you have submitted an application'}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 10,
                            border: j.applied ? '1px solid #34d399' : '1px solid #cbd5e1',
                            background: j.applied ? '#ecfdf5' : '#fff',
                            color: j.applied ? '#047857' : '#475569',
                            fontWeight: 800,
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          {j.applied ? 'Applied' : 'Mark'}
                        </button>
                        {j.applied && j.appliedAt ? (
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, maxWidth: 88 }}>
                            {new Date(j.appliedAt).toLocaleDateString()}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: 700, color: '#5b21b6', fontSize: 12, whiteSpace: 'nowrap' }}>{j.source}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{j.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{j.company}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{j.location}</div>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {j.url ? (
                          <a href={j.url} target="_blank" rel="noreferrer" style={{ fontWeight: 800, color: '#2563eb', fontSize: 12 }}>
                            Open
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
