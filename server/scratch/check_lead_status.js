
import 'dotenv/config';
import mongoose from 'mongoose';
import { Lead } from '../src/models/Lead.js';
import { Campaign, Send } from '../src/models/Outreach.js';

async function checkStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const email = 'mhassannaseerahmed@gmail.com';
    const lead = await Lead.findOne({ email });
    
    if (!lead) {
      console.log(`❌ No lead found with email: ${email}`);
    } else {
      console.log(`✅ Lead Found:`);
      console.log(`   ID: ${lead.id}`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Created At: ${lead.createdAt}`);
      
      const sends = await Send.find({ to: email });
      if (sends.length === 0) {
        console.log(`❌ No emails have been sent to this lead (in MongoDB Send collection).`);
      } else {
        console.log(`📧 Sends found: ${sends.length}`);
        sends.forEach(s => {
          console.log(`   - Subject: ${s.subject} | Status: ${s.status} | Sent At: ${s.createdAt}`);
        });
      }
    }
    
    const camp = await Campaign.findOne({ automationEnabled: true });
    if (camp) {
      console.log(`\n✅ Active Campaign: ${camp.name}`);
      console.log(`   Lead IDs in campaign: ${camp.leadIds.length}`);
      if (lead && camp.leadIds.includes(lead.id)) {
        console.log(`   🎯 This lead IS part of the campaign.`);
      } else {
        console.log(`   ⚠️ This lead IS NOT explicitly listed in the campaign leadIds.`);
        console.log(`      (Automation will send to all leads with an email if leadIds is empty)`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkStatus();
