import express from 'express';
import { nanoid } from 'nanoid';
import { readJson, writeJson } from '../storage.js';

const FILE = 'templates.json';

function load() {
  return readJson(FILE, []);
}
function save(rows) {
  return writeJson(FILE, rows);
}

export const templatesRouter = express.Router();

templatesRouter.get('/', async (req, res) => {
  res.json({ success: true, data: await load() });
});

templatesRouter.post('/', async (req, res) => {
  const rows = await load();
  const now = new Date().toISOString();
  const tpl = {
    id: nanoid(),
    name: req.body?.name || 'Untitled',
    subject: req.body?.subject || '',
    bodyText: req.body?.bodyText || '',
    createdAt: now,
    updatedAt: now,
  };
  rows.unshift(tpl);
  await save(rows);
  res.status(201).json({ success: true, data: tpl });
});

templatesRouter.put('/:id', async (req, res) => {
  const rows = await load();
  const idx = rows.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Template not found' });
  rows[idx] = { ...rows[idx], ...req.body, updatedAt: new Date().toISOString() };
  await save(rows);
  res.json({ success: true, data: rows[idx] });
});

templatesRouter.delete('/:id', async (req, res) => {
  const rows = await load();
  const next = rows.filter((r) => r.id !== req.params.id);
  await save(next);
  res.json({ success: true });
});

