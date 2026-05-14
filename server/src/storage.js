import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';

const dataDir = process.env.VERCEL
  ? path.resolve('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');

// Fallback directory for initial data (bundled with the function)
const bundledDataDir = path.resolve(process.cwd(), 'server', 'data');
const sqlitePath = process.env.SQLITE_PATH ? path.resolve(process.env.SQLITE_PATH) : null;
const libsqlUrl = process.env.LIBSQL_URL ? String(process.env.LIBSQL_URL).trim() : '';
const libsqlAuthToken = process.env.LIBSQL_AUTH_TOKEN ? String(process.env.LIBSQL_AUTH_TOKEN) : '';

let db = null;
let libsql = null;

function getDb() {
  if (!sqlitePath) return null;
  if (db) return db;
  try {
    const dir = path.dirname(sqlitePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(sqlitePath);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS kv (
        k TEXT PRIMARY KEY,
        v TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    return db;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to open SQLITE_PATH DB:', e?.message || e);
    return null;
  }
}

function getLibsql() {
  if (!libsqlUrl) return null;
  if (libsql) return libsql;
  try {
    libsql = createClient({ url: libsqlUrl, authToken: libsqlAuthToken || undefined });
    return libsql;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to init LIBSQL client:', e?.message || e);
    return null;
  }
}

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

export async function readJson(filename, fallback) {
  const key = String(filename);

  const lib = getLibsql();
  if (lib) {
    try {
      await lib.execute(
        `CREATE TABLE IF NOT EXISTS kv (
          k TEXT PRIMARY KEY,
          v TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`
      );
      const rs = await lib.execute({ sql: 'SELECT v FROM kv WHERE k = ?', args: [key] });
      const row = rs?.rows?.[0];
      if (row?.v) return JSON.parse(String(row.v));
    } catch (e) {
      return fallback;
    }

    const seedPath = path.join(bundledDataDir, key);
    if (fs.existsSync(seedPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        await writeJson(key, data);
        return data;
      } catch {
        return fallback;
      }
    }

    return fallback;
  }

  const dbx = getDb();
  if (dbx) {
    try {
      const row = dbx.prepare('SELECT v FROM kv WHERE k = ?').get(key);
      if (row?.v) return JSON.parse(row.v);
    } catch (e) {
      return fallback;
    }

    const seedPath = path.join(bundledDataDir, key);
    if (fs.existsSync(seedPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        await writeJson(key, data);
        return data;
      } catch {
        return fallback;
      }
    }

    return fallback;
  }

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

  // 2. Try to seed from the bundled data folder.
  const seedPath = path.join(bundledDataDir, filename);
  if (fs.existsSync(seedPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      // Save it to dataDir so it's "writable" from now on.
      if (!process.env.VERCEL) {
        fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
      }
      return data;
    } catch (e) {
      // fall through
    }
  }

  return fallback;
}

export async function writeJson(filename, value) {
  const key = String(filename);
  const v = JSON.stringify(value, null, 2);
  const nowIso = new Date().toISOString();

  const lib = getLibsql();
  if (lib) {
    try {
      await lib.execute(
        `CREATE TABLE IF NOT EXISTS kv (
          k TEXT PRIMARY KEY,
          v TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`
      );
      await lib.execute({
        sql: 'INSERT INTO kv (k, v, updated_at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_at=excluded.updated_at',
        args: [key, v, nowIso],
      });
      return;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Failed to write ${key} to libsql:`, e?.message || e);
    }
  }

  const dbx = getDb();
  if (dbx) {
    try {
      dbx
        .prepare(
          'INSERT INTO kv (k, v, updated_at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_at=excluded.updated_at'
        )
        .run(key, v, nowIso);
      return;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Failed to write ${key} to sqlite:`, e?.message || e);
    }
  }

  ensureDataDir();
  const p = path.join(dataDir, filename);
  try {
    fs.writeFileSync(p, JSON.stringify(value, null, 2), 'utf8');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Failed to write ${filename}:`, e.message);
  }
}
