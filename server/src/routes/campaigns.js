import express from 'express';
import { nanoid } from 'nanoid';
import { readJson, writeJson } from '../storage.js';

const FILE = 'campaigns.json';

function load() {
  return readJson(FILE, []);
}
function save(rows) {
  return writeJson(FILE, rows);
}

export const campaignsRouter = express.Router();

campaignsRouter.get('/', async (req, res) => {
  res.json({ success: true, data: await load() });
});

campaignsRouter.post('/', async (req, res) => {
  const rows = await load();
  const now = new Date().toISOString();
  const campaign = {
    id: nanoid(),
    name: req.body?.name || 'New campaign',
    templateId: req.body?.templateId || null,
    leadIds: req.body?.leadIds || [],
    automationEnabled: Boolean(req.body?.automationEnabled),
    createdAt: now,
    updatedAt: now,
  };
  rows.unshift(campaign);
  await save(rows);
  res.status(201).json({ success: true, data: campaign });
});

campaignsRouter.put('/:id', async (req, res) => {
  const rows = await load();
  const idx = rows.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Campaign not found' });
  rows[idx] = { ...rows[idx], ...req.body, updatedAt: new Date().toISOString() };
  await save(rows);
  res.json({ success: true, data: rows[idx] });
});

campaignsRouter.delete('/:id', async (req, res) => {
  const rows = await load();
  const next = rows.filter((r) => r.id !== req.params.id);
  await save(next);
  res.json({ success: true });
});

