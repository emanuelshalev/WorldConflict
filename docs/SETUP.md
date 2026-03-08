# Setup Guide

This guide will help you get World Conflict running on your local machine.

## Prerequisites

- **Node.js 20+** — [Download here](https://nodejs.org/)
- **npm** — Comes with Node.js

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/WorldConflict.git
cd WorldConflict
```

### 2. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd ui && npm install && cd ..
```

### 3. Initialize the Database

```bash
npx prisma db push
```

This creates a SQLite database (`dev.db`) with the required schema.

## Running the Game

### Quick Start (Recommended)

```bash
npm run dev
```

This starts both servers:
- **Backend API** at `http://localhost:8080`
- **Frontend UI** at `http://localhost:5173`

Open `http://localhost:5173` in your browser to play!

### What Happens Under the Hood

The `npm run dev` command uses [concurrently](https://www.npmjs.com/package/concurrently) to run both servers in parallel:

```
npm run dev
    │
    └── concurrently (runs both in parallel)
            │
            ├── [0] Backend API ──► tsx watch ──► Fastify ──► :8080
            │                         └── SQLite DB (dev.db)
            │
            └── [1] Frontend UI ──► Vite ──► React app ──► :5173
                                      └── calls API at :8080
```

The `[0]` and `[1]` prefixes in terminal output indicate which server the log came from.

### Running Servers Separately (Optional)

If you prefer to run each server in its own terminal:

**Terminal 1 — Backend API:**
```bash
npm run dev:api
```

**Terminal 2 — Frontend UI:**
```bash
cd ui && npm run dev
```

## LLM Configuration (Optional)

World Conflict can use AI language models to enhance advisor conversations and country behavior. This is **optional** — the game works perfectly fine with algorithmic fallbacks.

### Option 1: OpenAI

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your-api-key-here
```

### Option 2: Google Gemini

```env
GEMINI_API_KEY=your-api-key-here
```

### Option 3: Local Models (Ollama)

1. Install [Ollama](https://ollama.ai/)
2. Pull a model: `ollama pull llama2`
3. The game will auto-detect Ollama running locally

### No API Key?

No problem! The game includes sophisticated algorithmic behavior that provides a great experience without any AI service.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both servers (API + UI) |
| `npm run dev:api` | Start only the backend API |
| `npm run dev:ui` | Start only the frontend UI |
| `npm run build` | Build for production |
| `npm run test` | Run all tests |
| `npm run lint` | Lint code |

## Troubleshooting

### Port Already in Use

If port 8080 or 5173 is already in use:

```bash
# Find what's using the port (Windows)
netstat -ano | findstr :8080

# Find what's using the port (Mac/Linux)
lsof -i :8080
```

### Database Issues

If you encounter database errors, try resetting:

```bash
rm dev.db
npx prisma db push
```

### Dependencies Not Found

Make sure you've installed dependencies in both directories:

```bash
npm install
cd ui && npm install
```

---

**Ready to play?** Head back to the [main page](../README.md) and start your leadership journey!
