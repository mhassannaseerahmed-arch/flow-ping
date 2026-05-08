import express from 'express';
import { readJson, writeJson } from '../storage.js';

const LEADS_FILE = 'leads.json';

function loadLeads() {
  return readJson(LEADS_FILE, []);
}

function saveLeads(rows) {
  writeJson(LEADS_FILE, rows);
}

export const unsubscribeRouter = express.Router();

// Simple unsubscribe landing page (safe for email clients / browsers)
unsubscribeRouter.get('/:token', (req, res) => {
  const token = String(req.params.token || '').trim();
  const leads = loadLeads();
  const idx = leads.findIndex((l) => String(l.unsubToken || '').trim() === token);

  if (idx === -1) {
    res.status(404).send('Unsubscribe link is invalid.');
    return;
  }

  const nowIso = new Date().toISOString();
  leads[idx] = { ...leads[idx], status: 'unsubscribed', unsubscribedAt: nowIso, updatedAt: nowIso };
  saveLeads(leads);

  res
    .status(200)
    .send('You are unsubscribed. You will not receive further emails from us.');
});

