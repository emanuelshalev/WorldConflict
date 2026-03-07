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
