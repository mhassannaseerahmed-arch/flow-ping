import 'dotenv/config';
import mongoose from 'mongoose';
import { Campaign } from './src/models/Outreach.js';

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const camp = await Campaign.findOne({});
    if (!camp) {
      console.log('⚠️ No campaigns found!');
    } else {
      console.log(`Campaign: "${camp.name}" | Automation Enabled: ${camp.automationEnabled}`);
      
      if (!camp.automationEnabled) {
        console.log('🔧 Enabling automation for you...');
        camp.automationEnabled = true;
        await camp.save();
        console.log('✅ Automation is now ENABLED.');
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
