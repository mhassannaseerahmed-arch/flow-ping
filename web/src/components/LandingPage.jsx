import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage({ API_BASE }) {
  return (
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
              <div style={{ fontWeight: 1000, letterSpacing: -0.6, fontSize: 16, color: '#0f172a' }}>FlowPing</div>
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
          <div style={{ fontSize: 12, color: '#64748b' }}>© {new Date().getFullYear()} FlowPing</div>
        </div>
      </div>
    </div>
  );
}
