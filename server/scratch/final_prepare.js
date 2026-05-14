
import 'dotenv/config';
import mongoose from 'mongoose';
import { Lead } from '../src/models/Lead.js';
import fs from 'node:fs';

async function prepare() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Lead.findOneAndUpdate({ email: 'dev.hassan.naseer@gmail.com' }, { status: 'pending' });
  console.log('✅ MongoDB Lead Reset.');

  const sendsPath = './data/sends.json';
  if (fs.existsSync(sendsPath)) {
    const sends = JSON.parse(fs.readFileSync(sendsPath, 'utf8'));
    const filtered = sends.filter(s => s.to.toLowerCase() !== 'dev.hassan.naseer@gmail.com');
    fs.writeFileSync(sendsPath, JSON.stringify(filtered, null, 2));
    console.log('✅ Local History Cleared.');
  }
  process.exit(0);
}
prepare();
