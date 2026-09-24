# Hendy Vietsub Pro Studio

> **AutoSub SaaS & Vietsub Studio Pro** — Automated AI subtitle generator, cinematic Vietnamese translation, multi-track audio mixing, and HTML5 Canvas video composition suite.

---

## 🚀 Architecture: Dual-Target Deployment

This repository is architected to run seamlessly in two deployment environments:

1. **Cloudflare Pages & Workers (Edge Serverless via GitHub Actions)**:
   - **Static Frontend**: Built by Vite into `dist/` and distributed globally via Cloudflare CDN.
   - **Edge API (`functions/api/[[route]].ts`)**: Cloudflare Pages Functions running serverless on V8 isolates with low latency.
   - **Workers AI**: Direct binding to `@cf/melotts-v1` for Vietnamese speech synthesis.
   - **CI/CD**: Fully automated via `.github/workflows/deploy.yml` on push to `main`.

2. **Node.js & Express (Local Dev & Full-Stack Container)**:
   - Run locally via `npm run dev` (`server.ts` mounting Vite in dev mode on port 3000).
   - Node Express server handling `/api/*` endpoints and Gemini 3.8 Flash SDK.

---

## 🌐 Deploy to Cloudflare Pages via GitHub Actions

### 1. Repository Setup
1. Push this repository to your GitHub account (`main` branch).
2. In GitHub, navigate to **Settings > Secrets and variables > Actions**.
3. Add the following repository secrets:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Pages edit permissions.
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID (found on the right sidebar of Cloudflare dashboard).

### 2. Environment Variables in Cloudflare Pages
In the Cloudflare Dashboard under your Pages project (**Settings > Environment variables**), set:
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `NODE_ENV`: `production`.

### 3. Automated Deployment
Every push to `main` triggers `.github/workflows/deploy.yml`:
```bash
npm ci
npm run lint
npm run build
# Automatically deployed to Cloudflare Pages via wrangler-action
```

---

## 💻 Cross-Platform: All Operating Systems Support

Hendy Vietsub Pro is built as a standards-compliant Progressive Web App (PWA) with native system launchers:

| Operating System | Installation & Launch Method | Offline Support |
| :--- | :--- | :--- |
| **Windows 10 / 11** | 1-Click PWA Install or `Launch-Hendy-Studio.bat` | ✅ Full (Service Worker) |
| **macOS (Apple Silicon / Intel)** | PWA App via Chrome/Safari or `Launch-Hendy-Studio.command` | ✅ Full |
| **Linux (Ubuntu, Debian, Fedora, Arch)** | PWA App or `hendy-vietsub-pro.desktop` launcher | ✅ Full |
| **Android** | Chromium WebAPK Install to App Drawer | ✅ Full |
| **iOS / iPadOS** | Safari "Add to Home Screen" (`apple-touch-icon`) | ✅ Full |

---

## 🛠️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build production bundle with PWA assets
npm run build

# 4. Typecheck codebase
npm run lint
```
