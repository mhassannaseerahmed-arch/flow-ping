## MailPilot (separate project)

A standalone outreach + email-ops app to manage:

- leads (clinics)
- templates
- campaigns / sequences
- sending via SMTP (or dry-run)
- send logs / statuses

### Tech

- Backend: Node.js + Express
- Storage: local JSON files (no DB required)
- Frontend: React + Vite

### Run (dev)

In two terminals:

```bash
cd server
npm install
npm run dev
```

```bash
cd web
npm install
npm run dev
```

Then open the web app URL shown by Vite.

### Server config

Create `server/.env` (copy from `server/.env.example`):

```bash
PORT=5055

# Public URL for open/click tracking + unsubscribe (use your tunnel/prod URL)
# TRACKING_BASE_URL=https://your-api.example.com
# UNSUBSCRIBE_BASE_URL=https://your-api.example.com

# SMTP (set DRY_RUN=true to preview only)
DRY_RUN=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="MailPilot <you@gmail.com>"
SMTP_REPLY_TO=

# Follow-ups
# FOLLOWUP_AFTER_OPEN_HOURS=24
# FOLLOWUP_SUBJECT=Quick follow-up
# FOLLOWUP_BODY_TEXT=Following up on my last note…
# FOLLOWUP2_AFTER_FOLLOWUP1_HOURS=48
# FOLLOWUP2_SUBJECT=Final quick follow-up
# FOLLOWUP2_BODY_TEXT=Just checking if you saw my last note…
# FOLLOWUP2_ONLY_IF_NO_CLICK=true

# Automation endpoint protection (recommended in prod)
# AUTOMATION_SECRET=change_me

# Background worker (optional)
# AUTOMATION_INTERVAL_MS=60000
# AUTOMATION_MAX_SENDS_PER_TICK=20
# AUTOMATION_DELAY_MS=15000

# Send schedule + rate limits (defaults shown)
# SEND_WEEKDAYS_ONLY=true
# SEND_WINDOW_START=09:00
# SEND_WINDOW_END=17:00
# MAX_SENDS_PER_DAY=40
# MAX_SENDS_PER_DOMAIN_PER_DAY=5
```

### Data

Data is stored under `server/data/` as JSON:

- `leads.json`
- `templates.json`
- `campaigns.json`
- `sends.json`

