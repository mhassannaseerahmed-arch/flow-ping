
import 'dotenv/config';
import mongoose from 'mongoose';
import { Campaign } from '../src/models/Outreach.js';
import { Lead } from '../src/models/Lead.js';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const campaigns = await Campaign.find({ automationEnabled: true });
  console.log('Enabled Campaigns:', campaigns.length);
  for (const c of campaigns) {
    console.log(`- Campaign: ${c.id}, Template: ${c.templateId}`);
  }
  const leads = await Lead.find({ email: { $exists: true } });
  console.log('Leads with email:', leads.length);
  process.exit(0);
}
check();
