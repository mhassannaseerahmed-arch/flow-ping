import 'dotenv/config';
import mongoose from 'mongoose';
import { Lead } from './src/models/Lead.js';

async function add() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Lead.create({ 
      id: 'test_lead_3', 
      clinicName: 'UET Student Clinic', 
      email: '2016cs438@student.uet.edu.pk', 
      status: 'pending' 
    });
    console.log('✅ Lead #3 added: 2016cs438@student.uet.edu.pk');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

add();
