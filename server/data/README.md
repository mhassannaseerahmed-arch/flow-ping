# Data directory

JSON files here are created at runtime:

| File | Purpose |
|------|---------|
| `leads.json` | Leads (gitignored — may contain PII) |
| `templates.json` | Email templates (committed sample) |
| `campaigns.json` | Campaigns |
| `sends.json` | Send log + tracking (gitignored) |

Clone the repo, then add leads via the UI or API. `leads.json` / `sends.json` are listed in `.gitignore` so they are not pushed to GitHub.
