import fs from 'node:fs';
import path from 'node:path';

const dataDir = process.env.VERCEL
  ? path.resolve('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');

// Fallback directory for initial data (bundled with the function)
const bundledDataDir = path.resolve(process.cwd(), 'server', 'data');

function ensureDataDir() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to ensure data directory:', err.message);
  }
}

export function readJson(filename, fallback) {
  ensureDataDir();
  const p = path.join(dataDir, filename);

  // 1. If the file exists in /tmp (or local data dir), use it.
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      return fallback;
    }
  }

  // 2. If it's a new deployment on Vercel, try to seed from the bundled data folder.
  if (process.env.VERCEL) {
    const seedPath = path.join(bundledDataDir, filename);
    if (fs.existsSync(seedPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        // Save it to /tmp so it's "writable" from now on.
        fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
        return data;
      } catch (e) {
        // fall through
      }
    }
  }

  return fallback;
}

export function writeJson(filename, value) {
  ensureDataDir();
  const p = path.join(dataDir, filename);
  try {
    fs.writeFileSync(p, JSON.stringify(value, null, 2), 'utf8');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Failed to write ${filename}:`, e.message);
  }
}
