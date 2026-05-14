
import { execSync } from 'node:child_process';

const envs = {
  DRY_RUN: 'false',
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'dev.hassan.naseer@gmail.com',
  SMTP_PASS: 'syhb bjzc nlna zooi',
  SMTP_FROM: 'Hassan <dev.hassan.naseer@gmail.com>'
};

for (const [key, value] of Object.entries(envs)) {
  try {
    console.log(`Adding ${key}...`);
    // Remove if exists first to avoid conflict
    try { execSync(`vercel env rm ${key} production --yes`, { stdio: 'ignore' }); } catch (e) {}
    execSync(`echo "${value}" | vercel env add ${key} production`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Failed to add ${key}:`, err.message);
  }
}
