import React from 'react';
import { Link } from 'react-router-dom';

export default function DashboardPage({
  API_BASE,
  leads,
  templates,
  visibleSends,
  summary,
  search,
  setSearch,
  runSearch,
  selectedLeadId,
  setSelectedLeadId,
  selectedTemplateId,
  setSelectedTemplateId,
  selectedLead,
  selectedTemplate,
  preview,
  doSend,
  sending,
  runAutomationNow,
  automationRunning,
  lastAutomation,
  updateLead,
  onlyOpened,
  setOnlyOpened,
  error,
  isLoading
}) {
  const statCards = [
    { label: 'Total tracked', value: summary.total || 0 },
    { label: 'Sent', value: summary.byStatus?.sent || 0 },
    { label: 'Dry-run', value: summary.byStatus?.['dry-run'] || 0 },
    { label: 'Failed', value: summary.byStatus?.failed || 0 },
  ];

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial', padding: 24, maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          borderRadius: 24
        }}>
          <div style={{ fontWeight: 800, color: '#0f172a' }}>Loading data...</div>
        </div>
      )}
      
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontWeight: 1000, letterSpacing: -1 }}>FlowPing</h1>
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
          <div key={card.label} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>{card.label}</div>
            <div style={{ fontSize: 28, color: '#0f172a', fontWeight: 800, marginTop: 4 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: '#fff', marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
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
              transition: 'all 0.2s'
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 20, padding: 20, background: '#fff' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Lead details</div>
                <button
                  onClick={() => {
                    if (window.isEditing) {
                      const patch = {
                        clinicName: document.getElementById('edit-clinic').value,
                        contactName: document.getElementById('edit-contact').value,
                        email: document.getElementById('edit-email').value,
                        website: document.getElementById('edit-website').value,
                      };
                      updateLead(selectedLeadId, patch);
                      window.isEditing = false;
                      document.getElementById('edit-btn').innerText = 'Edit';
                      document.getElementById('details-view').style.display = 'block';
                      document.getElementById('details-edit').style.display = 'none';
                    } else {
                      window.isEditing = true;
                      document.getElementById('edit-btn').innerText = 'Save';
                      document.getElementById('details-view').style.display = 'none';
                      document.getElementById('details-edit').style.display = 'block';
                    }
                  }}
                  id="edit-btn"
                  style={{ fontSize: 11, background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 800 }}
                >
                  Edit
                </button>
              </div>

              <div id="details-view" style={{ fontSize: 13, color: '#334155', marginTop: 6 }}>
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

              <div id="details-edit" style={{ display: 'none', marginTop: 8 }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <input id="edit-clinic" defaultValue={selectedLead?.clinicName} placeholder="Clinic Name" style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12 }} />
                  <input id="edit-contact" defaultValue={selectedLead?.contactName} placeholder="Contact Name" style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12 }} />
                  <input id="edit-email" defaultValue={selectedLead?.email} placeholder="Email" style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12 }} />
                  <input id="edit-website" defaultValue={selectedLead?.website} placeholder="Website" style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12 }} />
                </div>
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

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 20, padding: 20, background: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Preview</div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 800 }}>Subject</div>
            <div style={{ padding: 10, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 14 }}>
              {preview?.subject || ''}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 800 }}>Body</div>
            <textarea
              readOnly
              value={preview?.bodyText || ''}
              style={{ width: '100%', minHeight: 420, padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 13 }}
            />
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
            Variables: <code>{selectedTemplate ? '{{FirstName}} {{ClinicName}}' : ''}</code>
          </div>
        </div>
      </div>

      {/* Paste leads section removed for cleaner UI */}

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 20, padding: 20, background: '#fff', marginTop: 16 }}>
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
                    <td style={{ 
                      padding: '12px 8px', 
                      fontWeight: 800, 
                      fontSize: 11,
                      textTransform: 'uppercase',
                      color: send.status === 'failed' ? '#b91c1c' : (send.status === 'sent' ? '#059669' : '#0f172a') 
                    }}>
                      <span style={{ 
                        background: send.status === 'failed' ? '#fef2f2' : (send.status === 'sent' ? '#ecfdf5' : '#f8fafc'),
                        padding: '4px 8px',
                        borderRadius: 6
                      }}>
                        {send.status}
                      </span>
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
}
