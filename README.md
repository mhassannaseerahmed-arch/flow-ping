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

Create `server/.env`:

```bash
PORT=5055
APP_URL=http://localhost:5174

# SMTP (set DRY_RUN=true to preview only)
DRY_RUN=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="AI Nexus Insight <no-reply@yourdomain.com>"
```

### Data

Data is stored under `server/data/` as JSON:

- `leads.json`
- `templates.json`
- `campaigns.json`
- `sends.json`

