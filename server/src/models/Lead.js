import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, // Legacy ID support
  clinicName: { type: String, default: '' },
  website: { type: String, default: '' },
  contactName: { type: String, default: '' },
  role: { type: String, default: '' },
  city: { type: String, default: '' },
  email: { type: String, required: true, index: true },
  notes: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  unsubToken: { type: String, unique: true },
  source: { type: String, default: 'manual' },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export const Lead = mongoose.model('Lead', LeadSchema);
