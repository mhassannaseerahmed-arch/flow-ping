import 'dotenv/config';
import mongoose from 'mongoose';
import { Lead } from './src/models/Lead.js';
import { Template } from './src/models/Outreach.js';
import { sendTrackedEmailToLead } from './src/sendOps.js';

async function launch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Database connected.');

    const leads = await Lead.find({ email: { $exists: true } });
    const tpl = await Template.findOne({ id: 'founding_partner_outreach' });

    if (!leads.length) {
      console.error('❌ No leads found in database.');
      process.exit(1);
    }
    if (!tpl) {
      console.error('❌ Template "founding_partner_outreach" not found.');
      process.exit(1);
    }

    console.log(`📊 Found ${leads.length} leads. Starting bulk outreach...`);
    
    for (const lead of leads) {
      console.log(`🚀 Sending to: ${lead.clinicName} (${lead.email})...`);
      const res = await sendTrackedEmailToLead({ lead, template: tpl });
      if (res.ok) {
        console.log(`✅ Sent to ${lead.email}`);
      } else {
        console.error(`❌ Failed for ${lead.email}: ${res.error}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

launch();
