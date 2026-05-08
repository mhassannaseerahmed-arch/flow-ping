import express from 'express';
import { nanoid } from 'nanoid';
import { readJson, writeJson } from '../storage.js';

const FILE = 'leads.json';

function load() {
  return readJson(FILE, []);
}
function save(rows) {
  writeJson(FILE, rows);
}

export const leadsRouter = express.Router();

function ensureUnsubToken(lead) {
  return lead?.unsubToken ? lead : { ...lead, unsubToken: nanoid() };
}

leadsRouter.get('/', (req, res) => {
  // Ensure older leads get an unsubscribe token without breaking existing IDs.
  const rows = load().map(ensureUnsubToken);
  save(rows);
  res.json({ success: true, data: rows });
});

// Import/Upsert leads from pasted text (CSV lines).
// Format (CSV): clinicName,website,contactName,role,city,email
// You can also paste just: email
leadsRouter.post('/import', (req, res) => {
  const rows = load();
  const now = new Date().toISOString();
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ success: false, message: 'Missing text' });

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    const obj =
      parts.length === 1
        ? { email: parts[0] }
        : {
            clinicName: parts[0] || '',
            website: parts[1] || '',
            contactName: parts[2] || '',
            role: parts[3] || '',
            city: parts[4] || '',
            email: parts[5] || '',
          };

    const email = String(obj.email || '').trim();
    if (!email || !email.includes('@')) {
      skipped += 1;
      continue;
    }

    const idx = rows.findIndex((r) => String(r.email || '').toLowerCase() === email.toLowerCase());
    if (idx === -1) {
      rows.unshift({
        id: nanoid(),
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        clinicName: obj.clinicName || '',
        website: obj.website || '',
        contactName: obj.contactName || '',
        role: obj.role || '',
        city: obj.city || '',
        email,
        notes: '',
        unsubToken: nanoid(),
      });
      created += 1;
    } else {
      rows[idx] = {
        ...ensureUnsubToken(rows[idx]),
        clinicName: obj.clinicName || rows[idx].clinicName || '',
        website: obj.website || rows[idx].website || '',
        contactName: obj.contactName || rows[idx].contactName || '',
        role: obj.role || rows[idx].role || '',
        city: obj.city || rows[idx].city || '',
        email,
        updatedAt: now,
      };
      updated += 1;
    }
  }

  save(rows);
  res.status(201).json({ success: true, data: { created, updated, skipped, total: lines.length } });
});

leadsRouter.post('/', (req, res) => {
  const rows = load();
  const now = new Date().toISOString();
  const lead = {
    id: nanoid(),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    unsubToken: nanoid(),
    ...req.body,
  };
  rows.unshift(lead);
  save(rows);
  res.status(201).json({ success: true, data: lead });
});

leadsRouter.put('/:id', (req, res) => {
  const rows = load();
  const idx = rows.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Lead not found' });
  rows[idx] = { ...rows[idx], ...req.body, updatedAt: new Date().toISOString() };
  save(rows);
  res.json({ success: true, data: rows[idx] });
});

// Manual “reply stop” hook: mark a lead as replied so automation won’t chase them.
leadsRouter.post('/:id/replied', (req, res) => {
  const rows = load();
  const idx = rows.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Lead not found' });
  const nowIso = new Date().toISOString();
  rows[idx] = { ...rows[idx], status: 'replied', repliedAt: nowIso, updatedAt: nowIso };
  save(rows);
  res.json({ success: true, data: rows[idx] });
});

leadsRouter.delete('/:id', (req, res) => {
  const rows = load();
  const next = rows.filter((r) => r.id !== req.params.id);
  save(next);
  res.json({ success: true });
});

