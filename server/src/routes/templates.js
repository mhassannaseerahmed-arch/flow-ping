import express from 'express';
import { nanoid } from 'nanoid';
import { readJson, writeJson } from '../storage.js';

const FILE = 'templates.json';

function load() {
  return readJson(FILE, []);
}
function save(rows) {
  writeJson(FILE, rows);
}

export const templatesRouter = express.Router();

templatesRouter.get('/', (req, res) => {
  res.json({ success: true, data: load() });
});

templatesRouter.post('/', (req, res) => {
  const rows = load();
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
  save(rows);
  res.status(201).json({ success: true, data: tpl });
});

templatesRouter.put('/:id', (req, res) => {
  const rows = load();
  const idx = rows.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Template not found' });
  rows[idx] = { ...rows[idx], ...req.body, updatedAt: new Date().toISOString() };
  save(rows);
  res.json({ success: true, data: rows[idx] });
});

templatesRouter.delete('/:id', (req, res) => {
  const rows = load();
  const next = rows.filter((r) => r.id !== req.params.id);
  save(next);
  res.json({ success: true });
});

