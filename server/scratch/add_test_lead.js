
import 'dotenv/config';
import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import { Lead } from '../src/models/Lead.js';

async function addLead() {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = 'mhassannaseerahmed@gmail.com';
  const existing = await Lead.findOne({ email });
  if (!existing) {
    await Lead.create({
      id: nanoid(),
      clinicName: 'Hassan Test Clinic',
      email: email,
      status: 'pending',
      unsubToken: nanoid()
    });
    console.log('✅ Added test lead.');
  } else {
    await Lead.findOneAndUpdate({ email }, { status: 'pending' });
    console.log('✅ Updated existing test lead to pending.');
  }
  process.exit(0);
}
addLead();
