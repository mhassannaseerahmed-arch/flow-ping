import mongoose from 'mongoose';

mongoose.set('bufferTimeoutMS', 60000);

export function getMongoUri() {
  return String(process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
}

/** One connect promise per serverless isolate (avoids `leads.find()` buffering timeouts on Vercel). */
export async function ensureConnected() {
  const uri = getMongoUri();
  if (!uri) {
    const err = new Error(
      'MONGODB_URI is not set. In Vercel: Project → Settings → Environment Variables, add MONGODB_URI (MongoDB Atlas connection string) for Production and Preview.'
    );
    err.code = 'NO_URI';
    throw err;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const g = globalThis;
  if (!g.__flowpingMongoPromise) {
    g.__flowpingMongoPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 25000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
  }

  try {
    await g.__flowpingMongoPromise;
  } catch (e) {
    g.__flowpingMongoPromise = null;
    throw e;
  }

  return mongoose.connection;
}

export function mongoReadyState() {
  return mongoose.connection.readyState;
}
