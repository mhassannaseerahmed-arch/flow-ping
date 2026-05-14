import 'dotenv/config';
import mongoose from 'mongoose';
import { Lead } from './src/models/Lead.js';

async function reset() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB.');

    await Lead.deleteMany({});
    console.log('🗑️ All existing leads removed.');

    await Lead.create([
      { 
        id: 'test_lead_1', 
        clinicName: 'Hassan Test 1', 
        email: 'dev.hassan.naseer@gmail.com', 
        status: 'pending',
        unsubToken: 'test-unsub-1'
      },
      { 
        id: 'test_lead_2', 
        clinicName: 'Hassan Test 2', 
        email: 'mhassannaseerahmed@gmail.com', 
        status: 'pending',
        unsubToken: 'test-unsub-2'
      }
    ]);

    console.log('✅ Success! Only your 2 test emails are now in the system.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

reset();
