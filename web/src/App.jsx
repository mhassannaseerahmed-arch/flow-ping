import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { t } from './theme.js';

/** API origin (no trailing slash). Dev → same origin + Vite proxy to :5055 unless VITE_EMAIL_HQ_API is set. */
function getApiBase() {
  const fromEnv = String(import.meta.env.VITE_EMAIL_HQ_API || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return '';
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

const API_BASE = getApiBase();

async function api(path, opts) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    const isHtml = text?.trimStart().startsWith('<!') || text?.includes('<!DOCTYPE');
    const hint = isHtml
      ? import.meta.env.DEV
        ? ' Response was HTML, not JSON. Start the API (cd server && npm run dev, default port 5055) so Vite can proxy /api to it. Or set VITE_EMAIL_HQ_API to a running backend URL.'
        : ' Response was HTML, not JSON. If you deployed only the web folder, set VITE_EMAIL_HQ_API to your API origin, or deploy from the FlowPing repo root so vercel.json can route /api to the server. On Vercel, check function logs (e.g. missing MONGODB_URI).'
      : '';
    throw new Error((text?.slice(0, 200) || `Bad response (${res.status})`) + (hint ? ` — ${hint}` : ''));
  }
  if (!json.success) throw new Error(json.message || 'Request failed');
  return json.data;
}

const pageShell = {
  fontFamily: t.font,
  minHeight: '100vh',
  backgroundImage: `${t.bgMesh}, ${t.bg}`,
  backgroundColor: '#f8fafc',
  backgroundAttachment: 'fixed',
};

const glassCard = {
  borderRadius: t.rXl,
  border: `1px solid ${t.border}`,
  background: t.surface,
  boxShadow: `${t.shadowIn}, ${t.shadow}`,
  backdropFilter: 'blur(14px)',
};

const btnPrimary = {
  padding: '12px 18px',
  borderRadius: t.rMd,
  border: 'none',
  background: `linear-gradient(135deg, ${t.accentDark} 0%, ${t.accent} 100%)`,
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 14px 32px rgba(79,70,229,.28)',
};

const btnGhost = {
  padding: '11px 16px',
  borderRadius: t.rMd,
  border: `1px solid ${t.border}`,
  background: t.surfaceSolid,
  color: t.text,
  fontWeight: 800,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
};

const inputBase = {
  padding: '11px 14px',
  borderRadius: t.rMd,
  border: `1px solid ${t.border}`,
  background: t.surfaceSolid,
  color: t.text,
};

export default function App() {
  const [leads, setLeads] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [sends, setSends] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byStatus: {} });
  const [search, setSearch] = useState('');
  const [notif, setNotif] = useState(null);
  const [onlyOpened, setOnlyOpened] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [automationRunning, setAutomationRunning] = useState(false);
  const [lastAutomation, setLastAutomation] = useState(null);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || null,
    [leads, selectedLeadId]
  );
  const selectedTemplate = useMemo(
    () => templates.find((x) => x.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const loadTracking = async (query = '') => {
    const [sendRows, sendSummary] = await Promise.all([
      api(`/api/sends${query ? `?q=${encodeURIComponent(query)}` : ''}`),
      api('/api/sends/summary'),
    ]);
    setSends(sendRows);
    setSummary(sendSummary);
  };

  useEffect(() => {
    (async () => {
      try {
        const [l, tpl] = await Promise.all([api('/api/leads'), api('/api/templates')]);
        setLeads(l);
        setTemplates(tpl);
        setSelectedLeadId(l[0]?.id || '');
        setSelectedTemplateId(tpl[0]?.id || '');
        await loadTracking();
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  useEffect(() => {
    const streamUrl = `${API_BASE}/api/stream`;
    const es = new EventSource(streamUrl);

    const onOpened = async (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        setNotif({
          id: `${payload.sendId}_${payload.at}`,
          title: 'Email opened',
          body: `${payload.to} — ${payload.subject}`,
          at: payload.at,
        });
        await loadTracking(search);
      } catch {
        /* ignore */
      }
    };

    const onClicked = async (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        setNotif({
          id: `${payload.sendId}_${payload.at}`,
          title: 'Link clicked',
          body: `${payload.to} — ${payload.url}`,
          at: payload.at,
        });
        await loadTracking(search);
      } catch {
        /* ignore */
      }
    };

    es.addEventListener('email_opened', onOpened);
    es.addEventListener('email_clicked', onClicked);
    es.onerror = () => {};

    return () => es.close();
  }, [search]);

  useEffect(() => {
    if (!selectedLeadId || !selectedTemplateId) return;
    (async () => {
      try {
        setError('');
        const p = await api('/api/sends/preview', {
          method: 'POST',
          body: JSON.stringify({ leadId: selectedLeadId, templateId: selectedTemplateId }),
        });
        setPreview(p);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [selectedLeadId, selectedTemplateId]);

  const doSend = async () => {
    if (!selectedLeadId || !selectedTemplateId) return;
    setSending(true);
    setError('');
    try {
      const rec = await api('/api/sends', {
        method: 'POST',
        body: JSON.stringify({ leadId: selectedLeadId, templateId: selectedTemplateId }),
      });
      await loadTracking(search);
      alert(`Queued: ${rec.sendResult?.messageId || 'sent'}. DRY_RUN=${String(rec.sendResult?.dryRun)}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const runAutomationNow = async () => {
    setAutomationRunning(true);
    setError('');
    try {
      const out = await api('/api/automation/run', { method: 'POST', body: JSON.stringify({}) });
      setLastAutomation(out);
      await loadTracking(search);
    } catch (e) {
      setError(e.message);
    } finally {
      setAutomationRunning(false);
    }
  };

  const updateLead = async (leadId, patch) => {
    if (!leadId) return;
    setError('');
    try {
      await api(`/api/leads/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify(patch || {}),
      });
      const next = await api('/api/leads');
      setLeads(next);
    } catch (e) {
      setError(e.message);
    }
  };

  const runSearch = async (nextSearch) => {
    try {
      setError('');
      await loadTracking(nextSearch);
    } catch (e) {
      setError(e.message);
    }
  };

  const statCards = [
    { label: 'Total tracked', value: summary.total || 0, tone: 'ink' },
    { label: 'Sent', value: summary.byStatus?.sent || 0, tone: 'accent' },
    { label: 'Dry-run', value: summary.byStatus?.['dry-run'] || 0, tone: 'muted' },
    { label: 'Failed', value: summary.byStatus?.failed || 0, tone: 'rose' },
  ];

  const visibleSends = useMemo(() => {
    if (!onlyOpened) return sends;
    return sends.filter((s) => Number(s.openCount || 0) > 0);
  }, [sends, onlyOpened]);

  const LandingPage = () => (
    <div style={pageShell}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 22px 48px' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            padding: '14px 18px',
            borderRadius: t.rXl,
            ...glassCard,
            marginBottom: 22,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: t.logo,
                boxShadow: '0 14px 36px rgba(67,56,202,.35)',
              }}
            />
            <div>
              <div style={{ fontWeight: 950, letterSpacing: -0.5, fontSize: 18, color: t.ink }}>FlowPing</div>
              <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>Outreach you can run in minutes</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href={`${API_BASE}/health`} target="_blank" rel="noreferrer" style={{ ...btnGhost, fontSize: 13 }}>
              API status
            </a>
            <Link to="/dashboard" style={{ ...btnPrimary, textDecoration: 'none', display: 'inline-block', fontSize: 14 }}>
              Open dashboard
            </Link>
          </div>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          <section style={{ padding: 28, ...glassCard }}>
            <div
              style={{
                display: 'inline-flex',
                gap: 8,
                alignItems: 'center',
                padding: '7px 12px',
                borderRadius: 999,
                border: `1px solid ${t.border}`,
                background: t.surfaceSolid,
                color: t.text,
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: 0.02,
              }}
            >
              Built for clinic outreach
              <span style={{ color: t.muted }}>·</span>
              Live opens & clicks
            </div>

            <h1
              style={{
                margin: '18px 0 0',
                fontSize: 'clamp(2.1rem, 4.2vw, 3.1rem)',
                fontWeight: 950,
                letterSpacing: -1.2,
                lineHeight: 1.05,
                color: t.ink,
              }}
            >
              Send outreach.
              <br />
              Track every signal.
              <br />
              <span style={{ background: `linear-gradient(90deg, ${t.accent}, #0ea5e9)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Move faster.
              </span>
            </h1>

            <p style={{ marginTop: 16, fontSize: 17, color: t.sub, maxWidth: 640, lineHeight: 1.65 }}>
              A focused email-ops workspace: manage leads, use templates, preview merges, send from the dashboard, and watch engagement in real time.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 22, alignItems: 'center' }}>
              <Link to="/dashboard" style={{ ...btnPrimary, textDecoration: 'none', display: 'inline-block', fontSize: 15, padding: '14px 22px' }}>
                Start sending
              </Link>
              <span style={{ fontSize: 13, color: t.muted, maxWidth: 280 }}>
                Opens are approximate (privacy). <strong style={{ color: t.text }}>Clicks + replies</strong> tell the real story.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 26 }}>
              {[
                { k: '10s', v: 'Pick lead → send' },
                { k: 'Live', v: 'Open / click stream' },
                { k: 'Log', v: 'Searchable history' },
              ].map((s) => (
                <div
                  key={s.k}
                  style={{
                    padding: '16px 14px',
                    borderRadius: t.rLg,
                    border: `1px solid ${t.borderSoft}`,
                    background: `linear-gradient(165deg, ${t.surfaceSolid} 0%, ${t.surfaceMuted} 100%)`,
                    boxShadow: t.shadow,
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 950, color: t.accent, letterSpacing: -0.5 }}>{s.k}</div>
                  <div style={{ fontSize: 13, color: t.sub, marginTop: 4, fontWeight: 700 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </section>

          <aside style={{ padding: 22, ...glassCard }}>
            <div style={{ fontWeight: 950, fontSize: 15, color: t.ink }}>What you get</div>
            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
              {[
                { title: 'Lead management', body: 'Clinic, contact, role, status — ready for merge tags.' },
                { title: 'Templates + preview', body: 'Variables resolved before you hit send.' },
                { title: 'Send', body: 'Choose lead + template, preview, then send or dry-run.' },
                { title: 'Tracking', body: 'Opens, clicks, and a searchable send log.' },
              ].map((c) => (
                <div
                  key={c.title}
                  style={{
                    padding: 14,
                    borderRadius: t.rLg,
                    border: `1px solid ${t.borderSoft}`,
                    background: t.surfaceSolid,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 900, color: t.text }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: t.sub, marginTop: 6, lineHeight: 1.5 }}>{c.body}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: t.rLg,
                border: `1px dashed ${t.border}`,
                background: t.accentSoft,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, color: t.accentDark }}>Roadmap</div>
              <div style={{ fontSize: 13, color: t.sub, marginTop: 6, lineHeight: 1.55 }}>
                Auto follow-ups, suppression lists, deeper reply tracking.
              </div>
            </div>
          </aside>
        </div>

        <footer
          style={{
            marginTop: 28,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
            alignItems: 'center',
            fontSize: 13,
            color: t.muted,
          }}
        >
          <span>
            Tip: lead with the <strong style={{ color: t.text }}>practice manager’s name</strong> for higher reply rates.
          </span>
          <span>© {new Date().getFullYear()} FlowPing</span>
        </footer>
      </div>
    </div>
  );

  const DashboardPage = () => (
    <div style={{ ...pageShell, padding: '24px 20px 56px' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 20,
            padding: '16px 20px',
            borderRadius: t.rXl,
            ...glassCard,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: t.logo,
                boxShadow: '0 12px 28px rgba(67,56,202,.3)',
              }}
            />
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950, color: t.ink, letterSpacing: -0.4 }}>FlowPing</h1>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>Dashboard</div>
            </div>
            <Link
              to="/"
              style={{
                ...btnGhost,
                fontSize: 12,
                padding: '8px 14px',
                borderRadius: 999,
              }}
            >
              ← Landing
            </Link>
          </div>
          <div style={{ fontSize: 12, color: t.muted, fontFamily: t.mono, wordBreak: 'break-all', maxWidth: 420, textAlign: 'right' }}>
            API <span style={{ color: t.sub }}>{API_BASE || '(same origin)'}</span>
          </div>
        </header>

        <p style={{ color: t.sub, margin: '0 0 18px', fontSize: 15, lineHeight: 1.55, maxWidth: 720 }}>
          Select a lead and template, preview the merge, then send. The server defaults to <strong>DRY_RUN</strong> until you configure live SMTP.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 18 }}>
          {statCards.map((card) => {
            const valColor =
              card.tone === 'rose' ? t.rose : card.tone === 'accent' ? t.accent : card.tone === 'muted' ? t.muted : t.ink;
            return (
              <div
                key={card.label}
                style={{
                  padding: '18px 16px',
                  borderRadius: t.rLg,
                  border: `1px solid ${t.border}`,
                  background: `linear-gradient(160deg, ${t.surfaceSolid} 0%, ${t.surfaceMuted} 100%)`,
                  boxShadow: t.shadow,
                }}
              >
                <div style={{ fontSize: 11, color: t.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.06 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 30, color: valColor, fontWeight: 950, marginTop: 6, letterSpacing: -0.5 }}>{card.value}</div>
              </div>
            );
          })}
        </div>

        <section style={{ padding: 20, marginBottom: 18, borderRadius: t.rXl, ...glassCard }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: t.ink, textTransform: 'uppercase', letterSpacing: 0.05 }}>Automation</div>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: t.sub, lineHeight: 1.55, maxWidth: 560 }}>
                Campaign sends and follow-ups with stop rules (clicked, replied, unsubscribed) and rate limits.
              </p>
              {lastAutomation?.at ? (
                <div style={{ marginTop: 10, fontSize: 12, color: t.muted }}>
                  <strong style={{ color: t.text }}>Last run:</strong> {new Date(lastAutomation.at).toLocaleString()}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={runAutomationNow}
              disabled={automationRunning}
              style={{
                ...btnPrimary,
                opacity: automationRunning ? 0.75 : 1,
                cursor: automationRunning ? 'wait' : 'pointer',
              }}
            >
              {automationRunning ? 'Running…' : 'Run automation now'}
            </button>
          </div>
        </section>

        {error ? (
          <div
            role="alert"
            style={{
              background: t.roseSoft,
              border: `1px solid ${t.rose}`,
              color: t.rose,
              padding: '14px 16px',
              borderRadius: t.rLg,
              marginBottom: 16,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : null}

        {notif ? (
          <div
            style={{
              background: t.cyanSoft,
              border: `1px solid #67e8f9`,
              color: t.cyan,
              padding: '14px 16px',
              borderRadius: t.rLg,
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 14,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>{notif.title}</div>
              <div style={{ fontSize: 14, marginTop: 4, opacity: 0.95 }}>{notif.body}</div>
            </div>
            <button
              type="button"
              onClick={() => setNotif(null)}
              style={{
                ...btnGhost,
                fontSize: 13,
                borderColor: '#67e8f9',
                color: t.cyan,
              }}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
          <section style={{ padding: 20, borderRadius: t.rXl, ...glassCard }}>
            <div style={{ display: 'grid', gap: 14 }}>
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 12, color: t.sub, fontWeight: 800 }}>Lead</span>
                <select value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)} style={{ ...inputBase }}>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.clinicName} — {l.contactName || 'Unknown'}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 12, color: t.sub, fontWeight: 800 }}>Template</span>
                <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} style={{ ...inputBase }}>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </label>

              <div
                style={{
                  background: t.surfaceMuted,
                  border: `1px solid ${t.borderSoft}`,
                  borderRadius: t.rLg,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: t.ink }}>Lead details</div>
                <div style={{ fontSize: 14, color: t.sub, marginTop: 10, lineHeight: 1.65 }}>
                  <div>
                    <strong style={{ color: t.text }}>Clinic:</strong> {selectedLead?.clinicName || '—'}
                  </div>
                  <div>
                    <strong style={{ color: t.text }}>Contact:</strong> {selectedLead?.contactName || '—'} ({selectedLead?.role || '—'})
                  </div>
                  <div>
                    <strong style={{ color: t.text }}>Email:</strong>{' '}
                    {selectedLead?.email || <span style={{ color: '#b45309' }}>missing</span>}
                  </div>
                  <div>
                    <strong style={{ color: t.text }}>Website:</strong> {selectedLead?.website || '—'}
                  </div>
                  <div>
                    <strong style={{ color: t.text }}>Status:</strong> {selectedLead?.status || 'pending'}
                  </div>
                  {selectedLead?.unsubToken ? (
                    <div style={{ marginTop: 8 }}>
                      <strong style={{ color: t.text }}>Unsub:</strong>{' '}
                      <a href={`${API_BASE}/u/${encodeURIComponent(selectedLead.unsubToken)}`} target="_blank" rel="noreferrer" style={{ color: t.accent, fontWeight: 800 }}>
                        open link
                      </a>
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => updateLead(selectedLeadId, { status: 'pending' })}
                    style={{ ...btnGhost, fontSize: 12, padding: '9px 12px' }}
                  >
                    Set pending
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLead(selectedLeadId, { status: 'replied' })}
                    style={{ ...btnPrimary, fontSize: 12, padding: '9px 12px', boxShadow: 'none' }}
                  >
                    Mark replied
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLead(selectedLeadId, { status: 'unsubscribed' })}
                    style={{
                      padding: '9px 12px',
                      borderRadius: t.rSm,
                      border: `1px solid ${t.rose}`,
                      background: t.roseSoft,
                      color: t.rose,
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: 12,
                    }}
                  >
                    Unsubscribe
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={doSend}
                disabled={sending || !selectedLeadId || !selectedTemplateId}
                style={{
                  ...btnPrimary,
                  padding: '14px 18px',
                  fontSize: 15,
                  opacity: sending || !selectedLeadId || !selectedTemplateId ? 0.55 : 1,
                  cursor: sending ? 'wait' : 'pointer',
                }}
              >
                {sending ? 'Sending…' : 'Send (or dry-run)'}
              </button>
            </div>
          </section>

          <section style={{ padding: 20, borderRadius: t.rXl, ...glassCard }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: t.ink, textTransform: 'uppercase', letterSpacing: 0.05 }}>Preview</div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: t.muted, fontWeight: 800, marginBottom: 6 }}>Subject</div>
              <div style={{ ...inputBase, fontWeight: 700 }}>{preview?.subject || '—'}</div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: t.muted, fontWeight: 800, marginBottom: 6 }}>Body</div>
              <textarea
                readOnly
                value={preview?.bodyText || ''}
                style={{
                  width: '100%',
                  minHeight: 400,
                  padding: 14,
                  borderRadius: t.rMd,
                  border: `1px solid ${t.border}`,
                  fontFamily: t.mono,
                  fontSize: 13,
                  lineHeight: 1.5,
                  background: '#f8fafc',
                  color: t.text,
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: t.muted }}>
              Variables: <code style={{ color: t.accentDark, fontWeight: 700 }}>{selectedTemplate ? '{{FirstName}} {{ClinicName}}' : ''}</code>
            </div>
          </section>
        </div>

        <section style={{ padding: 20, marginTop: 20, borderRadius: t.rXl, ...glassCard }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: t.ink, textTransform: 'uppercase', letterSpacing: 0.05 }}>Tracked sends</div>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: t.sub }}>Filter by clinic, contact, subject, recipient, template, or status.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: t.text, fontWeight: 800 }}>
                <input type="checkbox" checked={onlyOpened} onChange={(e) => setOnlyOpened(e.target.checked)} />
                Opened only
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runSearch(search);
                }}
                placeholder="Search sends…"
                style={{ ...inputBase, minWidth: 260 }}
              />
            </div>
          </div>

          <div style={{ marginTop: 16, overflowX: 'auto', borderRadius: t.rMd, border: `1px solid ${t.borderSoft}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: t.surfaceSolid }}>
              <thead>
                <tr style={{ textAlign: 'left', background: t.accentSoft, color: t.accentDark, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.04 }}>
                  {['Status', 'Opens', 'Clicks', 'Clinic', 'Recipient', 'Template', 'Subject', 'Created'].map((h) => (
                    <th key={h} style={{ padding: '12px 10px', fontWeight: 900 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleSends.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 22, color: t.muted, textAlign: 'center' }}>
                      No sends match your filters yet.
                    </td>
                  </tr>
                ) : (
                  visibleSends.map((send, idx) => (
                    <tr
                      key={send.id}
                      style={{
                        borderBottom: `1px solid ${t.borderSoft}`,
                        background: idx % 2 === 0 ? '#fff' : '#f8fafc',
                      }}
                    >
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: send.status === 'failed' ? t.rose : t.text }}>{send.status}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: t.text }}>{Number(send.openCount || 0)}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: t.text }}>{Number(send.clickCount || 0)}</td>
                      <td style={{ padding: '12px 10px', color: t.sub }}>{send.lead?.clinicName || '—'}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 700, color: t.text }}>{send.to}</div>
                        <div style={{ fontSize: 12, color: t.muted }}>{send.lead?.contactName || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 10px', color: t.sub }}>{send.template?.name || '—'}</td>
                      <td style={{ padding: '12px 10px', maxWidth: 300, color: t.sub }}>{send.subject}</td>
                      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap', color: t.muted, fontSize: 12 }}>
                        {new Date(send.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
