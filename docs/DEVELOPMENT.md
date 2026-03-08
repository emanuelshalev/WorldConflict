# Development Guide

Technical documentation for developers contributing to World Conflict.

## Tech Stack

### Backend
- **Runtime:** Node.js 20+
- **Framework:** [Fastify](https://fastify.dev/) — Fast, low-overhead web framework
- **Database:** [Prisma](https://www.prisma.io/) with SQLite
- **Language:** TypeScript 5.0+

### Frontend
- **Framework:** [React 18](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Maps:** [MapLibre GL](https://maplibre.org/)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Language:** TypeScript 5.0+

### AI Integration
- **LLM Providers:** OpenAI, Google Gemini, Ollama (local)
- **Fallback:** Algorithmic heuristics when no LLM available

## Project Structure

```
WorldConflict/
├── src/                    # Backend source code
│   ├── api/                # Fastify REST API routes
│   │   └── server.ts       # Main server entry point
│   ├── agents/             # LLM agents & AI behavior
│   │   ├── advisorAgent.ts # Advisor conversation logic
│   │   └── countryAgent.ts # Autonomous country AI
│   ├── core/               # Game simulation engine
│   │   ├── simulation.ts   # Turn processing
│   │   ├── diplomacy.ts    # Diplomatic actions
│   │   ├── military.ts     # Military systems
│   │   └── economy.ts      # Economic systems
│   └── infra/              # Infrastructure layer
│       └── database.ts     # Prisma database access
│
├── ui/                     # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── store/          # Zustand state management
│   │   ├── App.tsx         # Main application
│   │   └── App.css         # Global styles
│   └── index.html
│
├── data/                   # Game data (JSON)
│   ├── countries/          # Country definitions
│   └── scenarios/          # Historical scenarios
│
├── prisma/                 # Database schema
│   └── schema.prisma
│
├── tests/                  # Test suites
│   ├── unit/
│   └── integration/
│
└── docs/                   # Documentation
    ├── API.md              # REST API reference
    ├── SETUP.md            # Installation guide
    └── DEVELOPMENT.md      # This file
```

## Architecture Overview

### Game Loop

```
┌─────────────────────────────────────────────────────────────┐
│                      TURN CYCLE                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. NEWS PHASE                                               │
│     └── Display newspaper with events from previous turn     │
│                                                              │
│  2. BRIEFING PHASE                                           │
│     └── Advisors present current situation analysis          │
│                                                              │
│  3. ACTION PHASES (Player)                                   │
│     ├── Diplomacy  → Treaties, relations, alliances          │
│     ├── Military   → Mobilization, operations, procurement   │
│     └── Domestic   → Reforms, stability, economy             │
│                                                              │
│  4. CONFIRM PHASE                                            │
│     └── Review all pending actions, commit or cancel         │
│                                                              │
│  5. RESOLUTION (Backend)                                     │
│     ├── Execute player actions                               │
│     ├── Run AI country agents                                │
│     ├── Resolve conflicts & events                           │
│     └── Generate next turn's news                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### State Management

**Backend (Prisma/SQLite):**
- Game saves with full world state
- Turn history for replay/analysis
- Player action logs

**Frontend (Zustand):**
- Current world state (synced from backend)
- UI state (modals, selections)
- Pending actions (before commit)
- Chat history (per advisor)

### AI Agent Architecture

Each country operates as an autonomous agent:

```
Country Agent
├── Beliefs        # What this country thinks is true
├── Goals          # National objectives (security, expansion, etc.)
├── Personality    # Risk tolerance, aggression, diplomatic style
└── Decision Loop
    ├── Perceive   # Update beliefs from available intelligence
    ├── Evaluate   # Assess threats, opportunities, priorities
    ├── Decide     # Choose actions based on personality & goals
    └── Act        # Execute chosen actions
```

## API Endpoints

See [API.md](./API.md) for full REST API documentation.

Key endpoints:
- `POST /api/new-game` — Create new game
- `GET /api/game/:saveId` — Load game state
- `POST /api/turn/commit` — Commit turn actions
- `POST /api/chat/advisor` — Chat with advisor

## Development Workflow

### Running in Development

```bash
npm run dev
```

This starts both servers with hot reload:
- Backend: `tsx watch` recompiles on changes
- Frontend: Vite HMR for instant updates

### Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Linting

```bash
npm run lint
```

### Building for Production

```bash
npm run build
```

## Adding New Features

### Adding a New Action Type

1. **Define the action** in `src/core/actions.ts`
2. **Add resolution logic** in `src/core/simulation.ts`
3. **Create UI component** in `ui/src/components/`
4. **Add API endpoint** if needed in `src/api/`
5. **Write tests** in `tests/`

### Adding a New Advisor

1. **Add advisor definition** in `ui/src/components/AdvisorModal.tsx`
2. **Define response logic** in `generateContextualResponse()`
3. **Add briefing generation** in `generateLocalBriefing()`
4. **Style the advisor card** in `ui/src/App.css`

### Adding a New Country

1. **Create country JSON** in `data/countries/`
2. **Add to scenario** in `data/scenarios/`
3. **Define AI personality** traits

## Code Style

- **TypeScript:** Strict mode enabled
- **React:** Functional components with hooks
- **Naming:** camelCase for variables, PascalCase for components
- **Files:** kebab-case for filenames

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Run linter: `npm run lint`
6. Commit with clear message: `git commit -m "feat: add new feature"`
7. Push and create a Pull Request

### Commit Message Format

```
type: short description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

Questions? Open an issue on GitHub or check the [main README](../README.md).
