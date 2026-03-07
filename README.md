# WorldConflict

A geopolitical simulation game where you lead a nation through diplomacy, military strategy, and economic management.

## Quick Start

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
# Install dependencies
npm install
cd ui && npm install && cd ..

# Initialize database
npx prisma db push
```

### Running the Project

```bash
# Start both backend and frontend
npm run dev
```

This starts:
- **Backend API** at `http://localhost:8080`
- **Frontend UI** at `http://localhost:5173`

Open `http://localhost:5173` in your browser to play.

#### What happens when you run `npm run dev`?

The command spins up **2 local servers** in parallel using [concurrently](https://www.npmjs.com/package/concurrently):

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

| Server | Command | Port | Purpose |
|--------|---------|------|---------|
| Backend API | `npm run dev:api` | 8080 | Fastify REST API, game logic, database |
| Frontend UI | `npm run dev:ui` | 5173 | Vite dev server, React app with HMR |

The `[0]` and `[1]` prefixes in terminal output indicate which server the log came from.

See [`package.json`](./package.json) for all available scripts.

### Run Components Separately (Optional)

**Terminal 1 - Backend API:**
```bash
npm run dev:api
```

**Terminal 2 - Frontend UI:**
```bash
cd ui && npm run dev
```

## Tech Stack

- **Backend:** Node.js, Fastify, Prisma (SQLite), TypeScript
- **Frontend:** React, Vite, MapLibre GL, Zustand
- **AI:** LLM integration (OpenAI/Ollama) with fallback heuristics

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev servers (API + UI) |
| `npm run build` | Build for production |
| `npm run test` | Run all tests |
| `npm run lint` | Lint code |

## Project Structure

```
├── src/
│   ├── api/        # Fastify REST API
│   ├── agents/     # LLM agents & fallback AI
│   ├── core/       # Simulation engine
│   └── infra/      # Database layer
├── ui/src/         # React frontend
├── data/           # Country & scenario JSON
├── tests/          # Test suites
└── prisma/         # Database schema
```

## License

MIT 
