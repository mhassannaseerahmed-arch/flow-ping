
import 'dotenv/config';
import mongoose from 'mongoose';
import { Lead } from '../src/models/Lead.js';
import { Template } from '../src/models/Outreach.js';
import { sendTrackedEmailToLead } from '../src/sendOps.js';

async function forceSend() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const email = 'mhassannaseerahmed@gmail.com';
    const lead = await Lead.findOne({ email });
    const tpl = await Template.findOne({ id: 'founding_partner_outreach' });

    if (!lead || !tpl) {
      console.error('Lead or template not found');
      process.exit(1);
    }

    console.log(`🚀 Force sending to ${email}...`);
    const res = await sendTrackedEmailToLead({ lead, template: tpl });
    
    if (res.ok) {
      console.log('✅ Success! Sent.');
    } else {
      console.error('❌ Failed:', res.error);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

forceSend();
