
import { execSync } from 'node:child_process';

const envs = {
  TRACKING_BASE_URL: 'https://flowping.vercel.app'
};

for (const [key, value] of Object.entries(envs)) {
  try {
    console.log(`Adding ${key}...`);
    try { execSync(`vercel env rm ${key} production --yes`, { stdio: 'ignore' }); } catch (e) {}
    execSync(`echo "${value}" | vercel env add ${key} production`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Failed to add ${key}:`, err.message);
  }
}
