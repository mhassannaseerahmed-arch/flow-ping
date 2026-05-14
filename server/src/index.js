import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import { leadsRouter } from './routes/leads.js';
import { templatesRouter } from './routes/templates.js';
import { campaignsRouter } from './routes/campaigns.js';
import { sendsRouter } from './routes/sends.js';
import { automationRouter } from './routes/automation.js';
import { unsubscribeRouter } from './routes/unsubscribe.js';
import { sseHandler } from './realtime.js';
import { runAutomationTick } from './automation.js';

const app = express();

const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'mailpilot-server' });
});

app.get('/api/stream', sseHandler);

app.use('/api/leads', leadsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/sends', sendsRouter);
app.use('/api/automation', automationRouter);

// Public unsubscribe link (used in List-Unsubscribe + footer)
app.use('/u', unsubscribeRouter);


// Global error handler
app.use((err, req, res, next) => {
  console.error('[server error]', err.stack || err);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Internal Server Error' 
  });
});

const PORT = Number(process.env.PORT || 5055);

// Standalone listener (only when not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`MailPilot server listening on http://localhost:${PORT}`);

    const interval = Number(process.env.AUTOMATION_INTERVAL_MS || 0);
    if (interval > 0) {
      const maxSends = Number(process.env.AUTOMATION_MAX_SENDS_PER_TICK || 20);
      const delayMs = Number(process.env.AUTOMATION_DELAY_MS || 15000);
      // eslint-disable-next-line no-console
      console.log(
        `Automation worker: every ${interval}ms (max ${maxSends} campaign sends/tick, ${delayMs}ms between sends)`
      );
      setInterval(() => {
        runAutomationTick({ maxSends, delayMs, doFollowups: true, doCampaigns: true }).catch((e) => {
          // eslint-disable-next-line no-console
          console.error('[automation]', e?.message || e);
        });
      }, interval);
    }
  });
}

export default app;
