<h1 align="center">📨 FlowPing</h1>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,0f172a,50,6d28d9,100,7c3aed&height=200&section=header&text=FlowPing&fontSize=60&fontColor=ffffff&fontAlignY=38&desc=High-Velocity%20Outreach%20%26%20Automation%20Platform&descAlignY=58&descSize=18&descColor=ddd6fe&animation=fadeIn" width="100%" alt="FlowPing Banner" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

---

## 🚀 What is FlowPing?

**FlowPing** is a standalone, high-performance outreach and email operations platform. It enables businesses to manage leads, create reusable templates, and run automated multi-step follow-up sequences — without the complexity or cost of a traditional CRM.

---

## ✨ Core Features

| Feature | Description |
| :--- | :--- |
| 🎯 **Lead Management** | Track and manage outreach targets with full status history |
| 📝 **Smart Templates** | Create variable-driven, reusable email templates |
| 🔄 **Campaign Sequences** | Automate multi-step outreach with scheduled follow-ups |
| 📡 **Real-time Tracking** | Know exactly when emails are opened and links are clicked |
| 🤖 **Smart Automation** | Auto-stop sequences when a lead replies or converts |
| 🔍 **Dry-run Mode** | Preview and test campaigns locally before going live |

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite (Glassmorphic Premium UI)
- **Backend:** Node.js + Express
- **Storage:** SQLite / LibSQL (zero-config, portable)
- **Deployment:** Vercel with Cron Support

---

## 🚀 Quick Start

**Backend:**
```bash
cd server && npm install && npm run dev
```

**Frontend:**
```bash
cd web && npm install && npm run dev
```

Vite serves the UI on port **5174** and proxies `/api`, `/u`, and `/health` to **http://localhost:5055**. Run the server first (or you will see “HTML instead of JSON” errors).

---

## 📡 Production (Vercel)

Deploy from the **repository root** so the root `vercel.json` routes `/api` to Express and serves the Vite build. Vercel Crons trigger automation sequences hourly.

If you deploy **only** the `web/` folder as its own Vercel project, set `VITE_EMAIL_HQ_API` at build time to your API’s public origin, or `/api` requests will miss the backend.

---

## 📄 License

MIT © [Hassan Naseer Ahmed](https://github.com/mhassannaseerahmed-arch)

---

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=7c3aed&height=100&section=footer" width="100%" />
</p>
