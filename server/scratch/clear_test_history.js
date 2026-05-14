
import fs from 'node:fs';
import path from 'node:path';

const sendsPath = './server/data/sends.json';
const emailToClear = 'dev.hassan.naseer@gmail.com';

if (fs.existsSync(sendsPath)) {
  const sends = JSON.parse(fs.readFileSync(sendsPath, 'utf8'));
  const filtered = sends.filter(s => s.to.toLowerCase() !== emailToClear.toLowerCase());
  
  if (sends.length !== filtered.length) {
    fs.writeFileSync(sendsPath, JSON.stringify(filtered, null, 2), 'utf8');
    console.log(`✅ Cleared ${sends.length - filtered.length} entries for ${emailToClear} from local history.`);
  } else {
    console.log(`ℹ️ No entries found for ${emailToClear} in local history.`);
  }
} else {
  console.log('⚠️ sends.json not found.');
}
