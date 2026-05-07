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

leadsRouter.get('/', (req, res) => {
  res.json({ success: true, data: load() });
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
      });
      created += 1;
    } else {
      rows[idx] = {
        ...rows[idx],
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

leadsRouter.delete('/:id', (req, res) => {
  const rows = load();
  const next = rows.filter((r) => r.id !== req.params.id);
  save(next);
  res.json({ success: true });
});

