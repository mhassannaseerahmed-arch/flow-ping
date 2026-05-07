import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

export function readJson(filename, fallback) {
  ensureDataDir();
  const p = path.join(dataDir, filename);
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function writeJson(filename, value) {
  ensureDataDir();
  const p = path.join(dataDir, filename);
  fs.writeFileSync(p, JSON.stringify(value, null, 2), 'utf8');
}

