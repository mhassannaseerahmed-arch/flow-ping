import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { leadsRouter } from './routes/leads.js';
import { templatesRouter } from './routes/templates.js';
import { campaignsRouter } from './routes/campaigns.js';
import { sendsRouter } from './routes/sends.js';
import { sseHandler } from './realtime.js';
import { isMailDryRun } from './mailer.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'flowping-server',
    mailDryRun: isMailDryRun(),
  });
});

app.get('/api/stream', sseHandler);

app.use('/api/leads', leadsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/sends', sendsRouter);

const PORT = Number(process.env.PORT || 5055);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`FlowPing server listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Mail mode: ${isMailDryRun() ? 'DRY_RUN (no SMTP)' : 'live SMTP'}`);
});

