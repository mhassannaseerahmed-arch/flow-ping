import 'dotenv/config';
import mongoose from 'mongoose';
import { Lead } from './src/models/Lead.js';

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const lead = await Lead.findOne({ id: 'test_lead_2' });
    console.log(`Current DB Email: ${lead?.email || 'NOT FOUND'}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
