# FlowPing

Clone (after you publish to GitHub):

```bash
git clone https://github.com/<your-username>/flow-ping.git
```

Lightweight **email ops** for small teams: leads, merge-field templates, SMTP sending (or dry-run), send log, open/click tracking, and live dashboard updates (SSE).

No database — JSON files under `server/data/`. Pair with **[Node](https://nodejs.org/)** + **Express** backend and **React** + **Vite** frontend.

## Features

- Leads CRUD + bulk paste import
- Templates with `{{ClinicName}}`, `{{FirstName}}`, etc.
- Single send and bulk send
- Open pixel + tracked link redirects
- Optional follow-up worker after opens (`POST /api/sends/followups/run`)

## Requirements

- Node.js 18+

## Quick start

**1. API server**

```bash
cd server
cp .env.example .env
# Edit .env — set DRY_RUN=false and SMTP_* only when you want real sends
npm install
npm run dev
```

Server listens on `http://localhost:5055` by default. Health check: `GET /health` returns `mailDryRun` so you can confirm live vs dry-run mode.

**2. Web app**

```bash
cd web
cp .env.example .env.local
# Optional: set VITE_EMAIL_HQ_API if the API is not on localhost:5055
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5174`).

## Configuration

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `5055`) |
| `DRY_RUN` | `true` / `false` / `0` / `no` — when enabled, no SMTP connection |
| `SMTP_*` | Standard Nodemailer SMTP settings (e.g. Gmail app password) |
| `TRACKING_BASE_URL` | Public base URL for open/click URLs (required for tracking outside your LAN) |
| `VITE_EMAIL_HQ_API` | Frontend: API origin (no trailing slash) |

See `server/.env.example` for optional follow-up env vars.

## Data

Runtime JSON in `server/data/`:

- **`templates.json`**, **`campaigns.json`** — safe samples are committed.
- **`leads.json`**, **`sends.json`** — **gitignored** (may contain PII). They appear when you use the app; clone fresh = empty leads/sends until you add data.

## Production notes

- Point `TRACKING_BASE_URL` at your public HTTPS host so recipient clients load the pixel and click URLs.
- Use a dedicated sender domain / SPF–DKIM as appropriate for your ESP.
- Rotate any credentials that were ever committed or shared.

## License

MIT
