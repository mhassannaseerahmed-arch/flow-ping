import express from 'express';
import { nanoid } from 'nanoid';
import { Campaign } from '../models/Outreach.js';

export const campaignsRouter = express.Router();

campaignsRouter.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json({ success: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

campaignsRouter.post('/', async (req, res) => {
  try {
    const campaign = await Campaign.create({
      id: nanoid(),
      name: req.body?.name || 'New campaign',
      templateId: req.body?.templateId || null,
      leadIds: req.body?.leadIds || [],
      automationEnabled: Boolean(req.body?.automationEnabled),
    });
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

campaignsRouter.put('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

campaignsRouter.delete('/:id', async (req, res) => {
  try {
    await Campaign.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

