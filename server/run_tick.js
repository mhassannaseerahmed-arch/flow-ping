
import 'dotenv/config';
import mongoose from 'mongoose';
import { runAutomationTick } from './src/automation.js';

async function runOnce() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB.');
    
    console.log('🚀 Running automation tick...');
    const result = await runAutomationTick({ maxSends: 5, delayMs: 1000 });
    
    console.log('✅ Automation Result:', JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runOnce();
