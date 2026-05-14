import mongoose from 'mongoose';

const TemplateSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  bodyText: { type: String, required: true },
}, { timestamps: true });

export const Template = mongoose.model('Template', TemplateSchema);

const CampaignSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  templateId: { type: String, required: true },
  leadIds: { type: [String], default: [] },
  automationEnabled: { type: Boolean, default: false },
  status: { type: String, default: 'active' }, // active, paused, completed
  totalLeads: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
}, { timestamps: true });

export const Campaign = mongoose.model('Campaign', CampaignSchema);

const SendSchema = new mongoose.Schema({
  leadId: { type: String, required: true },
  templateId: { type: String, required: true },
  campaignId: { type: String },
  to: { type: String, required: true },
  subject: { type: String },
  bodyText: { type: String },
  bodyHtml: { type: String },
  vars: { type: Map, of: String },
  status: { type: String, default: 'sent' }, // sent, opened, clicked, failed
  openCount: { type: Number, default: 0 },
  firstOpenedAt: { type: Date },
  lastOpenedAt: { type: Date },
  clickCount: { type: Number, default: 0 },
  firstClickedAt: { type: Date },
  lastClickedAt: { type: Date },
  clickedUrls: [{ type: String }],
  sendResult: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

export const Send = mongoose.model('Send', SendSchema);
