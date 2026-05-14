<h1 align="center">📨 FlowPing</h1>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,0f172a,50,6d28d9,100,7c3aed&height=220&section=header&text=FlowPing&fontSize=70&fontColor=ffffff&fontAlignY=70" width="100%" />
</p>

<p align="center">
  <a href="https://git.io/typing-svg"><img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=20&pause=1000&color=7c3aed&center=true&vCenter=true&width=600&lines=High-Velocity+Outreach+Platform;Real-Time+Email+Tracking;Automated+Campaign+Sequences;Enterprise-Grade+Automation" alt="Typing SVG" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

<p align="center">
  <a href="https://flow-ping.vercel.app">
    <img src="https://img.shields.io/badge/🚀%20Live%20Demo-Visit%20Now-blue?style=for-the-badge" />
  </a>
  <a href="#-quick-start">
    <img src="https://img.shields.io/badge/📖%20Docs-Read%20Here-green?style=for-the-badge" />
  </a>
  <a href="#-contributing">
    <img src="https://img.shields.io/badge/🤝%20Contributing-Join-purple?style=for-the-badge" />
  </a>
</p>

---

## 🚀 What is FlowPing?

**FlowPing** is a **standalone, high-performance outreach automation platform** that revolutionizes how businesses manage email campaigns at scale. With real-time tracking, intelligent automation, and a glassmorphic interface, FlowPing enables teams to run sophisticated multi-step outreach sequences with minimal configuration.

Perfect for **sales teams, recruiters, marketing professionals**, and anyone managing high-volume outreach operations.

### Key Differentiators
- ⚡ **Zero-config deployment** - Deploy in minutes, no database setup needed
- 🎯 **Intelligent automation** - Auto-stop campaigns when leads convert
- 📊 **Real-time analytics** - Track opens, clicks, and conversions instantly
- 🔄 **Campaign sequences** - Multi-step follow-ups with smart scheduling
- 🎨 **Premium UI** - Glassmorphic design with smooth animations

---

## ✨ Core Features

| Feature | Description | Impact |
| :--- | :--- | :--- |
| 🎯 **Lead Management** | Track and manage outreach targets with full status history | Never lose track of prospects |
| 📝 **Smart Templates** | Create variable-driven, reusable email templates | Send personalized emails at scale |
| 🔄 **Campaign Sequences** | Automate multi-step outreach with scheduled follow-ups | Run 10x more campaigns with same effort |
| 📡 **Real-time Tracking** | Know exactly when emails are opened and links are clicked | Understand prospect engagement instantly |
| 🤖 **Smart Automation** | Auto-stop sequences when a lead replies or converts | Stop wasting time on converted leads |
| 🔍 **Dry-run Mode** | Preview and test campaigns locally before going live | Zero risk of sending broken campaigns |
| ⏰ **Scheduled Sends** | Set optimal sending times with timezone support | Improve open rates with perfect timing |
| 📈 **Campaign Analytics** | Comprehensive reporting on performance metrics | Data-driven optimization |

---

## 🏗️ Architecture

```
FlowPing
├── Frontend (React + Vite)
│   ├── Dashboard
│   ├── Lead Management
│   ├── Template Builder
│   ├── Campaign Designer
│   └── Analytics View
│
├── Backend (Express + Node.js)
│   ├── Lead API
│   ├── Template API
│   ├── Campaign API
│   ├── Send API
│   ├── Automation Engine
│   └── Tracking System
│
└── Database (SQLite / LibSQL)
    ├── Leads
    ├── Templates
    ├── Campaigns
    ├── Sends (tracking)
    └── Stats (rate limits)
```

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library with hooks
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Glassmorphic Design** - Premium UI aesthetic

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Minimalist web framework
- **SQLite / LibSQL** - Zero-config database
- **Vercel Crons** - Scheduled automation triggers

### Deployment
- **Vercel** - Serverless hosting for full-stack
- **Cron Jobs** - Hourly automation sequences
- **Environment-based configuration** - Easy multi-environment setup

---

## 📂 Project Structure

```
flow-ping/
├── web/                          # React Frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API services
│   │   ├── styles/              # Global styles
│   │   └── App.tsx
│   ├── vite.config.ts
│   └── package.json
│
├── server/                       # Express Backend
│   ├── src/
│   │   ├── routes/              # API endpoints
│   │   ├── controllers/         # Business logic
│   │   ├── models/              # Data models
│   │   ├── services/            # Core services
│   │   ├── middleware/          # Express middleware
│   │   └── index.ts
│   ├── data/                    # Runtime data
│   └── package.json
│
├── vercel.json                  # Vercel configuration
├── package.json                 # Root dependencies
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- Git

### Installation (Recommended - Single Command)

Clone and run the complete stack in one go:

```bash
git clone https://github.com/mhassannaseerahmed-arch/flow-ping.git
cd flow-ping
npm install
npm run install:all
npm run dev
```

This command:
1. Installs root tooling (`concurrently`)
2. Installs dependencies in `server/` and `web/`
3. Starts **Express** (port **5055**) and **Vite** (port **5174**) simultaneously
4. Vite automatically proxies `/api` requests to the Express backend

✨ **Access the app:** http://localhost:5174

---

### Manual Setup (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd server
npm install
npm run dev
```
Backend runs on `http://localhost:5055`

**Terminal 2 - Frontend:**
```bash
cd web
npm install
npm run dev
```
Frontend runs on `http://localhost:5174`

---

## ⚙️ Environment Setup

### Backend Configuration

Create `.env` in the `server/` directory:

```env
# Server
PORT=5055
NODE_ENV=development

# Database
DATABASE_URL=./data/flowping.db

# Email (if integrating with email service)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Automation
CRON_INTERVAL=3600000
```

### Frontend Configuration

Create `.env` in the `web/` directory:

```env
VITE_API_URL=http://localhost:5055
VITE_APP_NAME=FlowPing
VITE_ENVIRONMENT=development
```

---

## 📡 API Endpoints

### Leads
```
GET    /api/leads              # Get all leads
POST   /api/leads              # Create new lead
PUT    /api/leads/:id          # Update lead
DELETE /api/leads/:id          # Delete lead
GET    /api/leads/:id/history  # Get lead interaction history
```

### Templates
```
GET    /api/templates          # Get all templates
POST   /api/templates          # Create template
PUT    /api/templates/:id      # Update template
DELETE /api/templates/:id      # Delete template
POST   /api/templates/:id/preview  # Preview template
```

### Campaigns
```
GET    /api/campaigns          # Get all campaigns
POST   /api/campaigns          # Create campaign
PUT    /api/campaigns/:id      # Update campaign
DELETE /api/campaigns/:id      # Delete campaign
POST   /api/campaigns/:id/start    # Start campaign
POST   /api/campaigns/:id/stop     # Stop campaign
GET    /api/campaigns/:id/stats    # Get campaign analytics
```

### Sends & Tracking
```
GET    /api/sends              # Get send history
POST   /api/sends              # Trigger send
GET    /api/tracking/:id       # Get tracking data for email
POST   /api/webhooks/track     # Email open/click webhook
```

---

## 📊 Features in Detail

### Lead Management
- Import leads via CSV or API
- Track interaction history
- Status management (New, Contacted, Replied, Converted)
- Custom fields and tags
- Bulk actions

### Smart Templates
- **Variable substitution**: `{{firstName}}`, `{{company}}`, etc.
- **Preview before sending**: See exactly what prospects will receive
- **Template library**: Save and reuse templates
- **A/B testing ready**: Track performance of different templates

### Campaign Sequences
- **Multi-step sequences**: Create 5+ step campaigns
- **Smart delays**: Configurable wait times between steps
- **Conditional logic**: Send different emails based on engagement
- **Automatic stopping**: Stop when lead replies or clicks specific link

### Real-time Tracking
- **Email opens**: Track when prospect opens email
- **Link clicks**: Know which links are clicked
- **Reply detection**: Auto-stop campaigns on replies
- **Conversion tracking**: Mark leads as converted

---

## 🌐 Production Deployment (Vercel)

### Step 1: Deploy to Vercel
```bash
npm i -g vercel
vercel
```

### Step 2: Configure
Deploy from **repository root** so `vercel.json` correctly routes:
- `/api` → Express backend
- `/` → Vite static build

### Step 3: Environment Variables
Add to Vercel dashboard:
```
VITE_API_URL=https://your-deployed-url.vercel.app
DATABASE_URL=./data/flowping.db
```

### Step 4: Cron Jobs
Vercel Crons automatically trigger automation sequences every hour. Monitor in Vercel dashboard under **Settings → Crons**.

---

## 🔍 Dry-Run Mode

Test campaigns before sending to real leads:

```bash
# Start development server
npm run dev

# In the UI, toggle "Dry-run Mode"
# All sends are logged but NOT actually sent
# Perfect for testing automation logic
```

Check `server/data/sends.json` (gitignored) to see dry-run logs.

---

## 🛡️ Data Security

- **PII Protection**: `leads.json` and `sends.json` are gitignored
- **No cloud lock-in**: All data stored locally in SQLite
- **Portable**: Move database file anywhere
- **Privacy-first**: No analytics tracking, no data selling

---

## 🐛 Troubleshooting

### Issue: "ECONNREFUSED" errors from frontend
**Solution:** Ensure backend is running on port 5055, or update `VITE_API_URL` in `.env`

### Issue: "Port already in use"
**Solution:** Kill process on port or change port in `.env`
```bash
# Find process on port 5055
lsof -i :5055
# Kill process
kill -9 <PID>
```

### Issue: Database locked
**Solution:** SQLite locks when multiple instances access it
```bash
# Restart both servers
npm run dev
```

### Issue: Emails not sending
**Solution:** Check SMTP credentials in `.env` or use dry-run mode to debug

---

## 📈 Roadmap

- [x] Core lead management
- [x] Email template system
- [x] Campaign sequences
- [x] Real-time tracking
- [x] Dry-run mode
- [ ] WhatsApp integration
- [ ] SMS delivery support
- [ ] Advanced AI-driven personalization
- [ ] Calendar sync (Google, Outlook)
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] Advanced A/B testing
- [ ] Custom webhook system

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

### 1. Fork & Clone
```bash
git clone https://github.com/YOUR_USERNAME/flow-ping.git
cd flow-ping
```

### 2. Create Feature Branch
```bash
git checkout -b feature/amazing-feature
```

### 3. Make Changes
- Follow existing code style
- Add tests for new features
- Update README if needed

### 4. Commit & Push
```bash
git commit -m "feat: Add amazing feature"
git push origin feature/amazing-feature
```

### 5. Open Pull Request
Provide clear description of changes

---

## 📝 Code Style

- **Prettier**: Auto-format on save
- **ESLint**: Linting rules enforced
- **TypeScript**: Type-safe development

```bash
npm run lint
npm run format
```

---

## 📄 License

MIT © [Hassan Naseer Ahmed](https://github.com/mhassannaseerahmed-arch)

See [LICENSE](LICENSE) file for details.

---

## 📞 Support & Contact

- 📧 **Email**: [mhassannaseerahmed@gmail.com](mailto:mhassannaseerahmed@gmail.com)
- 🐙 **GitHub**: [@mhassannaseerahmed-arch](https://github.com/mhassannaseerahmed-arch)
- 🚀 **Live Demo**: https://flow-ping.vercel.app

---

## 🎯 Use Cases

**Sales Teams**
- Track prospect engagement in real-time
- Automate follow-up sequences
- Convert more leads with data-driven insights

**Recruiters**
- Manage candidate outreach at scale
- Track application status automatically
- Run multi-step hiring campaigns

**Marketing**
- A/B test email campaigns
- Track open and click rates
- Optimize send times based on data

**Agencies**
- Manage multiple client campaigns
- White-label opportunity
- Scalable infrastructure

---

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=7c3aed&height=100&section=footer" width="100%" />
</p>

<p align="center">
  <sub>⚡ Built with React, Node.js, and ❤️ for high-velocity teams</sub>
</p>
