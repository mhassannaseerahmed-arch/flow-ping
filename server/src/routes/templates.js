import express from 'express';
import { nanoid } from 'nanoid';
import { Template } from '../models/Outreach.js';

export const templatesRouter = express.Router();

templatesRouter.get('/', async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

templatesRouter.post('/', async (req, res) => {
  try {
    const tpl = await Template.create({
      id: nanoid(),
      name: req.body?.name || 'Untitled',
      subject: req.body?.subject || '',
      bodyText: req.body?.bodyText || '',
    });
    res.status(201).json({ success: true, data: tpl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

templatesRouter.put('/:id', async (req, res) => {
  try {
    const tpl = await Template.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!tpl) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: tpl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

templatesRouter.delete('/:id', async (req, res) => {
  try {
    await Template.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

