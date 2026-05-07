import express from 'express';
import { nanoid } from 'nanoid';
import { readJson, writeJson } from '../storage.js';

const FILE = 'campaigns.json';

function load() {
  return readJson(FILE, []);
}
function save(rows) {
  writeJson(FILE, rows);
}

export const campaignsRouter = express.Router();

campaignsRouter.get('/', (req, res) => {
  res.json({ success: true, data: load() });
});

campaignsRouter.post('/', (req, res) => {
  const rows = load();
  const now = new Date().toISOString();
  const campaign = {
    id: nanoid(),
    name: req.body?.name || 'New campaign',
    templateId: req.body?.templateId || null,
    leadIds: req.body?.leadIds || [],
    createdAt: now,
    updatedAt: now,
  };
  rows.unshift(campaign);
  save(rows);
  res.status(201).json({ success: true, data: campaign });
});

campaignsRouter.put('/:id', (req, res) => {
  const rows = load();
  const idx = rows.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Campaign not found' });
  rows[idx] = { ...rows[idx], ...req.body, updatedAt: new Date().toISOString() };
  save(rows);
  res.json({ success: true, data: rows[idx] });
});

campaignsRouter.delete('/:id', (req, res) => {
  const rows = load();
  const next = rows.filter((r) => r.id !== req.params.id);
  save(next);
  res.json({ success: true });
});

