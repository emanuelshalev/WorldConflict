# 🛠 Setup Guide

Get World Conflict running locally in about two minutes.

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | **≥ 20.19** (22 LTS recommended) | Vite 7 and Prisma 7 refuse older versions. Check with `node -v`. |
| npm | ≥ 10 | Ships with Node. |
| Git | any | |

> **Stuck on an old system Node?** Install a user-local Node without touching the system one, e.g. download the official tarball for your OS/CPU from nodejs.org into `~/.local/share/node` and put its `bin/` first on your `PATH`, or use `nvm`, `fnm` or `volta`.

---

## 2. Install

```bash
git clone https://github.com/emanuelshalev/WorldConflict.git
cd WorldConflict

npm install                 # backend + engine
(cd ui && npm install)      # frontend (separate package)

cp .env.example .env        # DATABASE_URL="file:./dev.db" by default
npx prisma db push          # creates the SQLite save database
```

---

## 3. Run

```bash
npm run dev
```

| Service | URL |
|---|---|
| 🎮 Game | http://localhost:5173 |
| ⚡ API | http://localhost:8080 (health: `/health`) |

The Vite dev server proxies `/api` to the backend, so the browser only talks to `:5173`.

Run them separately if you prefer: `npm run dev:api` and `npm run dev:ui`.

---

## 4. Optional: LLM intelligence

The game is **complete without any LLM**, every country is run by the built-in deterministic *PersonalityAI*.

To let an LLM take over key decisions (or every major leader), open **⚙ Settings → World intelligence** in the game and choose:

| Tier | What uses the LLM |
|---|---|
| Algorithmic | nothing (free, offline) |
| LLM for key decisions | leaders at high-stakes moments (war, nukes, coups, ceasefires) + your advisors |
| Full LLM | the ~6 most relevant leaders every month + advisors |

| Provider | You need | Default model |
|---|---|---|
| Claude (Anthropic) | API key (`sk-ant-…`) | `claude-haiku-5-5` |
| OpenAI | API key (`sk-…`) | `gpt-4o-mini` |
| Google Gemini | API key (`AIza…`) | `gemini-2.5-flash` |
| Ollama | Ollama running on the **server** machine | `llama3.2` |
| LM Studio / vLLM | any OpenAI-compatible server, e.g. `http://localhost:1234/v1` | your loaded model |

Keys entered in Settings are stored only in your browser and sent to your game server with each request. The settings screen shows an **up-front cost estimate** for the chosen model and tier, a **per-game spending cap**, and live usage (calls, tokens, dollars, fallbacks).

### Server-side keys (optional)

For the advisor endpoint you can also configure keys on the server in `.env`:

```bash
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
LLM_PROVIDER=          # openai | ollama | mock, used only when the client sends no config
PORT=8080
CORS_ORIGINS=http://localhost:5173
```

> ⚠️ If you host the game publicly with server-side keys, every player spends **your** credits. Prefer bring-your-own keys in Settings.

---

## 5. Production build

```bash
npm run build              # tsc → dist/ (API) and vite build → ui/dist (game)
node dist/api/server.js    # serve the API
# serve ui/dist with any static host; set VITE_API_BASE at build time if the API lives elsewhere
```

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| `Unexpected end of JSON input` when starting a game | The UI can't reach the API. Is `npm run dev:api` running on :8080? |
| Vite / Prisma error about the Node version | Upgrade to Node ≥ 20.19 (see prerequisites). |
| `The table main.SaveGame does not exist` | Run `npx prisma db push`. |
| `Cannot find module '.prisma/client/default'` | Run `npx prisma generate` (then `npx prisma db push`). |
| Port already in use | `lsof -i :8080` / `lsof -i :5173` (macOS/Linux), or set `PORT` in `.env`. |
| "Connection failed" testing an LLM | Check the key; for Ollama/LM Studio the URL is resolved **by the game server**, not your browser. |
| Saves missing after clearing site data | Guest saves are tied to a browser id. Sign in (optional) to keep saves across browsers. |
