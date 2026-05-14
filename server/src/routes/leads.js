import express from 'express';
import { nanoid } from 'nanoid';
import { Lead } from '../models/Lead.js';

export const leadsRouter = express.Router();

// GET all leads
leadsRouter.get('/', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json({ success: true, data: leads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Import/Upsert leads from pasted text (CSV lines).
leadsRouter.post('/import', async (req, res) => {
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

    try {
      const existing = await Lead.findOne({ email: new RegExp(`^${email}$`, 'i') });
      if (!existing) {
        await Lead.create({
          ...obj,
          email,
          unsubToken: nanoid(),
          status: 'pending'
        });
        created += 1;
      } else {
        Object.assign(existing, obj);
        await existing.save();
        updated += 1;
      }
    } catch (err) {
      console.error('Error importing lead:', err);
      skipped += 1;
    }
  }

  res.status(201).json({ success: true, data: { created, updated, skipped, total: lines.length } });
});

// Create single lead
leadsRouter.post('/', async (req, res) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      unsubToken: nanoid(),
      status: 'pending'
    });
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update lead
leadsRouter.put('/:id', async (req, res) => {
  try {
    const lead = await Lead.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Manual “reply stop” hook
leadsRouter.post('/:id/replied', async (req, res) => {
  try {
    const lead = await Lead.findOneAndUpdate({ id: req.params.id }, { 
      status: 'replied', 
      repliedAt: new Date() 
    }, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete lead
leadsRouter.delete('/:id', async (req, res) => {
  try {
    await Lead.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

