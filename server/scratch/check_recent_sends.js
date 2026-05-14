
import 'dotenv/config';
import mongoose from 'mongoose';
import { Send } from '../src/models/Outreach.js';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const sends = await Send.find({ 
    createdAt: { $gt: new Date('2026-05-13T14:30:00Z') } 
  });
  console.log(JSON.stringify(sends, null, 2));
  process.exit(0);
}

check();
