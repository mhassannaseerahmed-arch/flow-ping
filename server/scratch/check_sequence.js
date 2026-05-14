
import 'dotenv/config';
import mongoose from 'mongoose';
import { Lead } from '../src/models/Lead.js';
import { Campaign } from '../src/models/Outreach.js';
import { readJson } from '../src/storage.js';

async function checkSequence() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const leads = await Lead.find({ email: { $exists: true } });
    const sends = await readJson('sends.json', []);
    
    console.log(`Total Leads: ${leads.length}`);
    
    leads.forEach((l, i) => {
      const alreadySent = sends.some(s => s.leadId === l.id || s.to.toLowerCase() === l.email.toLowerCase());
      console.log(`${i+1}. ${l.email} | Already Sent: ${alreadySent} | ID: ${l.id}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSequence();
