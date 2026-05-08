import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';

/** API origin (no trailing slash). Dev → local server; prod → same host unless VITE_EMAIL_HQ_API is set. */
function getApiBase() {
  const fromEnv = String(import.meta.env.VITE_EMAIL_HQ_API || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return 'http://localhost:5055';
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
    const hint =
      text?.trimStart().startsWith('<!') || text?.includes('<!DOCTYPE')
        ? ' Got HTML instead of JSON — API URL is wrong or /api is not routed to the server. Set VITE_EMAIL_HQ_API to your backend URL, or deploy the monorepo so /api hits Express.'
        : '';
    throw new Error((text?.slice(0, 200) || `Bad response (${res.status})`) + hint);
  }
  if (!json.success) throw new Error(json.message || 'Request failed');
  return json.data;
}

export default function App() {
  const [leads, setLeads] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [sends, setSends] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byStatus: {} });
  const [search, setSearch] = useState('');
  const [notif, setNotif] = useState(null);
  const [onlyOpened, setOnlyOpened] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
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
    () => templates.find((t) => t.id === selectedTemplateId) || null,
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
        const [l, t] = await Promise.all([api('/api/leads'), api('/api/templates')]);
        setLeads(l);
        setTemplates(t);
        setSelectedLeadId(l[0]?.id || '');
        setSelectedTemplateId(t[0]?.id || '');
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
        // ignore parse errors
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
        // ignore parse errors
      }
    };

    es.addEventListener('email_opened', onOpened);
    es.addEventListener('email_clicked', onClicked);
    es.onerror = () => {
      // Browser will auto-reconnect; keep UI quiet.
    };

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

  const doBulkSend = async () => {
    if (!selectedTemplateId) return;
    const text = pasteText.trim();
    if (!text) return;
    setBulkSending(true);
    setError('');
    try {
      await api('/api/leads/import', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      const out = await api('/api/sends/bulk', {
        method: 'POST',
        body: JSON.stringify({
          templateId: selectedTemplateId,
          emails: text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .map((line) => {
              const parts = line.split(',').map((p) => p.trim());
              return parts.length === 1 ? parts[0] : parts[5] || '';
            })
            .filter(Boolean),
        }),
      });

      const ok = out.results?.filter((r) => r.ok).length || 0;
      const fail = out.results?.filter((r) => !r.ok).length || 0;
      await Promise.all([api('/api/leads').then(setLeads), loadTracking(search)]);
      alert(`Bulk send done. Success: ${ok}, Failed: ${fail} (attempted ${out.attempted || ok + fail})`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBulkSending(false);
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
    { label: 'Total tracked', value: summary.total || 0 },
    { label: 'Sent', value: summary.byStatus?.sent || 0 },
    { label: 'Dry-run', value: summary.byStatus?.['dry-run'] || 0 },
    { label: 'Failed', value: summary.byStatus?.failed || 0 },
  ];

  const visibleSends = useMemo(() => {
    if (!onlyOpened) return sends;
    return sends.filter((s) => Number(s.openCount || 0) > 0);
  }, [sends, onlyOpened]);

  const LandingPage = () => (
      <div
        style={{
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
          minHeight: '100vh',
          background:
            'radial-gradient(800px 500px at 18% 12%, rgba(56,189,248,.25), transparent 60%), radial-gradient(700px 450px at 80% 18%, rgba(99,102,241,.20), transparent 55%), linear-gradient(180deg, #ffffff 0%, #f8fafc 55%, #ffffff 100%)',
        }}
      >
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #0f172a 0%, #111827 60%, #1d4ed8 140%)',
                  boxShadow: '0 12px 30px rgba(15,23,42,.18)',
                }}
              />
              <div>
                <div style={{ fontWeight: 1000, letterSpacing: -0.6, fontSize: 16, color: '#0f172a' }}>MailPilot</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Outreach that’s easy to run</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <a
                href={`${API_BASE}/health`}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(226,232,240,.9)',
                  background: 'rgba(255,255,255,.8)',
                  color: '#0f172a',
                  fontWeight: 900,
                  textDecoration: 'none',
                  backdropFilter: 'blur(8px)',
                }}
              >
                API status
              </a>
              <Link
                to="/dashboard"
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid #0f172a',
                  background: '#0f172a',
                  color: 'white',
                  fontWeight: 950,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 12px 30px rgba(15,23,42,.20)',
                  display: 'inline-block',
                  textDecoration: 'none',
                }}
              >
                Open Dashboard
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16, alignItems: 'stretch', marginTop: 20 }}>
            <div
              style={{
                padding: 22,
                borderRadius: 22,
                border: '1px solid rgba(226,232,240,.9)',
                background: 'rgba(255,255,255,.72)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 18px 50px rgba(15,23,42,.08)',
              }}
            >
              <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', padding: '6px 10px', borderRadius: 999, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontWeight: 900, fontSize: 12 }}>
                Built for clinic outreach
                <span style={{ color: '#64748b', fontWeight: 800 }}>•</span>
                Track engagement live
              </div>

              <div style={{ marginTop: 12, fontSize: 48, fontWeight: 1000, letterSpacing: -1.4, lineHeight: 1.03, color: '#0f172a' }}>
                Send outreach emails.
                <br />
                Track opens & clicks.
                <br />
                Move faster.
              </div>

              <div style={{ marginTop: 12, fontSize: 16, color: '#334155', maxWidth: 760, lineHeight: 1.55 }}>
                A lightweight email ops tool: import/paste leads, use templates, send in bulk, and see what’s working with real-time notifications.
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18, alignItems: 'center' }}>
                <Link
                  to="/dashboard"
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: '1px solid #0f172a',
                    background: '#0f172a',
                    color: 'white',
                    fontWeight: 950,
                    cursor: 'pointer',
                    display: 'inline-block',
                    textDecoration: 'none',
                  }}
                >
                  Start sending
                </Link>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Opens are approximate (privacy). <b>Clicks + replies</b> are strongest.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 18 }}>
                {[
                  { k: '10s', v: 'Paste leads → send' },
                  { k: 'Live', v: 'Open/click notifications' },
                  { k: 'Log', v: 'Search send history' },
                ].map((s) => (
                  <div key={s.k} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 12, background: '#ffffff' }}>
                    <div style={{ fontSize: 20, fontWeight: 1000, color: '#0f172a', letterSpacing: -0.6 }}>{s.k}</div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 2, fontWeight: 800 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 22,
                border: '1px solid rgba(226,232,240,.9)',
                background: 'rgba(255,255,255,.72)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 18px 50px rgba(15,23,42,.08)',
              }}
            >
              <div style={{ fontWeight: 950, color: '#0f172a' }}>What you get</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {[
                  { title: 'Lead management', body: 'Clinic, contact name, role, notes.' },
                  { title: 'Templates + preview', body: 'Variables + fast review before sending.' },
                  { title: 'Bulk send', body: 'Paste leads and fire emails in one click.' },
                  { title: 'Tracking', body: 'Opens (where supported), clicks, and send history.' },
                ].map((c) => (
                  <div key={c.title} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 12, background: '#ffffff' }}>
                    <div style={{ fontSize: 13, fontWeight: 950, color: '#0f172a' }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>{c.body}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 16, border: '1px dashed #cbd5e1', background: '#ffffff' }}>
                <div style={{ fontSize: 12, fontWeight: 950, color: '#0f172a' }}>Next (optional)</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
                  Auto follow-ups, unsubscribe/suppression list, reply tracking (Gmail API).
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Tip: personalize with the <b>practice manager’s name</b> for higher reply rates.
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>© {new Date().getFullYear()} MailPilot</div>
          </div>
        </div>
      </div>
    );

  const DashboardPage = () => (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial', padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>MailPilot</h1>
          <Link
            to="/"
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#0f172a',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: 12,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Landing
          </Link>
        </div>
        <div style={{ color: '#64748b', fontSize: 12 }}>
          API: <code>{API_BASE}</code>
        </div>
      </div>

      <p style={{ color: '#334155', marginTop: 8 }}>
        Select a lead + template, preview the render, then send. By default the server runs in <b>DRY_RUN</b> mode.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
        {statCards.map((card) => (
          <div key={card.label} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: '#fff' }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>{card.label}</div>
            <div style={{ fontSize: 28, color: '#0f172a', fontWeight: 800, marginTop: 4 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: '#fff', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Automation</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Runs campaign sends + follow-ups with stop rules (click/replied/unsubscribed) + rate limits.
            </div>
            {lastAutomation?.at ? (
              <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
                <b>Last run:</b> {new Date(lastAutomation.at).toLocaleString()}
              </div>
            ) : null}
          </div>
          <button
            onClick={runAutomationNow}
            disabled={automationRunning}
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #0f172a',
              background: automationRunning ? '#334155' : '#0f172a',
              color: 'white',
              fontWeight: 900,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {automationRunning ? 'Running…' : 'Run automation now'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', padding: 12, borderRadius: 12, margin: '12px 0' }}>
          {error}
        </div>
      )}

      {notif && (
        <div
          style={{
            background: '#ecfeff',
            border: '1px solid #a5f3fc',
            color: '#0e7490',
            padding: 12,
            borderRadius: 12,
            margin: '12px 0',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontWeight: 900 }}>{notif.title}</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>{notif.body}</div>
          </div>
          <button
            onClick={() => setNotif(null)}
            style={{ border: '1px solid #0891b2', background: 'white', color: '#0e7490', borderRadius: 10, padding: '8px 10px', fontWeight: 800, cursor: 'pointer' }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>Lead</div>
              <select value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)} style={{ padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.clinicName} — {l.contactName || 'Unknown'}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>Template</div>
              <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} style={{ padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Lead details</div>
              <div style={{ fontSize: 13, color: '#334155', marginTop: 6 }}>
                <div><b>Clinic:</b> {selectedLead?.clinicName || '—'}</div>
                <div><b>Contact:</b> {selectedLead?.contactName || '—'} ({selectedLead?.role || '—'})</div>
                <div><b>Email:</b> {selectedLead?.email || <span style={{ color: '#b45309' }}>missing</span>}</div>
                <div><b>Website:</b> {selectedLead?.website || '—'}</div>
                <div><b>Status:</b> {selectedLead?.status || 'pending'}</div>
                {selectedLead?.unsubToken ? (
                  <div style={{ marginTop: 6 }}>
                    <b>Unsub link:</b>{' '}
                    <a href={`${API_BASE}/u/${encodeURIComponent(selectedLead.unsubToken)}`} target="_blank" rel="noreferrer">
                      open
                    </a>
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <button
                  onClick={() => updateLead(selectedLeadId, { status: 'pending' })}
                  style={{ padding: '8px 10px', borderRadius: 12, border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}
                >
                  Set pending
                </button>
                <button
                  onClick={() => updateLead(selectedLeadId, { status: 'replied' })}
                  style={{ padding: '8px 10px', borderRadius: 12, border: '1px solid #0f172a', background: '#0f172a', color: 'white', cursor: 'pointer', fontWeight: 900, fontSize: 12 }}
                >
                  Mark replied
                </button>
                <button
                  onClick={() => updateLead(selectedLeadId, { status: 'unsubscribed' })}
                  style={{ padding: '8px 10px', borderRadius: 12, border: '1px solid #fecdd3', background: '#fff1f2', color: '#9f1239', cursor: 'pointer', fontWeight: 900, fontSize: 12 }}
                >
                  Unsubscribe
                </button>
              </div>
            </div>

            <button
              onClick={doSend}
              disabled={sending || !selectedLeadId || !selectedTemplateId}
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid #0f172a',
                background: sending ? '#334155' : '#0f172a',
                color: 'white',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {sending ? 'Sending…' : 'Send (or Dry-run)'}
            </button>
          </div>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Preview</div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 800 }}>Subject</div>
            <div style={{ padding: 10, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
              {preview?.subject || ''}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 800 }}>Body</div>
            <textarea
              readOnly
              value={preview?.bodyText || ''}
              style={{ width: '100%', minHeight: 420, padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
            />
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
            Variables: <code>{selectedTemplate ? '{{FirstName}} {{ClinicName}}' : ''}</code>
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Paste leads → fire emails</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Paste one lead per line. Format: <code>clinicName,website,contactName,role,city,email</code> (or just <code>email</code>).
            </div>
          </div>
          <button
            onClick={doBulkSend}
            disabled={bulkSending || !selectedTemplateId || !pasteText.trim()}
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #0f172a',
              background: bulkSending ? '#334155' : '#0f172a',
              color: 'white',
              fontWeight: 900,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {bulkSending ? 'Sending…' : 'Send to pasted leads'}
          </button>
        </div>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={`jill@example.com\nHarley Street Smile Clinic,harleystreetsmileclinic.co.uk,Jill Wright,Business Manager,London,jill@example.com`}
          style={{
            width: '100%',
            minHeight: 140,
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        />
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Tracked sends</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Search by clinic, contact, subject, recipient, template, or status.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#0f172a', fontWeight: 800 }}>
              <input type="checkbox" checked={onlyOpened} onChange={(e) => setOnlyOpened(e.target.checked)} />
              Opened only
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch(search);
              }}
              placeholder="Search tracked sends"
              style={{ minWidth: 280, padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 12 }}>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px' }}>Opens</th>
                <th style={{ padding: '10px 8px' }}>Clicks</th>
                <th style={{ padding: '10px 8px' }}>Clinic</th>
                <th style={{ padding: '10px 8px' }}>Recipient</th>
                <th style={{ padding: '10px 8px' }}>Template</th>
                <th style={{ padding: '10px 8px' }}>Subject</th>
                <th style={{ padding: '10px 8px' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {visibleSends.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: 16, color: '#64748b' }}>
                    No sends match your filters yet.
                  </td>
                </tr>
              ) : (
                visibleSends.map((send) => (
                  <tr key={send.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 700, color: send.status === 'failed' ? '#b91c1c' : '#0f172a' }}>
                      {send.status}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#0f172a', fontWeight: 800 }}>
                      {Number(send.openCount || 0)}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#0f172a', fontWeight: 800 }}>
                      {Number(send.clickCount || 0)}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{send.lead?.clinicName || 'Unknown clinic'}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <div>{send.to}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{send.lead?.contactName || 'Unknown contact'}</div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>{send.template?.name || 'Unknown template'}</td>
                    <td style={{ padding: '12px 8px', maxWidth: 320 }}>{send.subject}</td>
                    <td style={{ padding: '12px 8px', whiteSpace: 'nowrap', color: '#64748b' }}>
                      {new Date(send.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
