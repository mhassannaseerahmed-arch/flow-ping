
import 'dotenv/config';
import mongoose from 'mongoose';
import { Template } from '../src/models/Outreach.js';

const simplifiedBody = `Hi {{clinicName}},

I'm building a simple tool for London clinics that automatically fills empty slots from no-shows and late cancellations.

If you share two numbers (avg daily appointments + rough no-show %), I’ll send you a 1-page "Revenue Leak" report for {{clinicName}} showing how much you're losing.

Worth a quick chat?

Best,
Hassan`;

async function sync() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Template.updateMany(
    { id: { $in: ['founding_partner_outreach', 'demo_intro'] } },
    { 
      bodyText: simplifiedBody, 
      subject: 'Quick question about {{clinicName}}' 
    }
  );
  console.log('✅ Templates simplified and synced.');
  process.exit(0);
}
sync();
