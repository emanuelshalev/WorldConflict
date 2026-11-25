---
name: engagement-overhaul-decisions
description: "User's decisions for the e2e engagement overhaul of World Conflict (branch feat/engagement-overhaul, started 2026-11-01)"
metadata:
  node_type: memory
  type: project
  originSessionId: 560a71e3-7113-4ffa-aea8-74191a508a8c
  modified: 2026-11-01T10:29:06.684Z
---

User asked (2026-11-01) for autonomous e2e development to make the game commercially successful: engaging, short-session friendly, beautiful, realistic, updated with real events to today. Work on branch `feat/engagement-overhaul`, push to origin at milestones (never main, never deploy). User reviews at the end.

Decisions given:
- Countries: expand roster from 25 to ~40 (add hotspots: Ukraine, Taiwan, Venezuela, Syria, Iraq, Palestine, Sudan…).
- Session modes: player explicitly chooses mode at start with time expectation. Most players want 10–15 min sessions with a clear outcome; others want long saved campaigns over days. Validate with game-expert and player-persona reviews.
- AI: 3 tiers: fully algorithmic (free), LLM for important decisions, full LLM. LLM configurable as API key or local model; cost/usage must be visible to the player throughout.
- Must maintain `dev_plan/project_status.html` (white background, tabs: plan overview → architecture (mermaid, tables) → tasks done/planned/updated → blockers+resolutions → decision points for user review).
- Public docs must be well structured, visual, appealing.

**Why:** user wants a product with high retention; reviews only at the end, so decisions must be logged in project_status.html for review.
**How to apply:** only escalate blocking issues or very important decisions; otherwise act and log the decision. See [[dev-env-node22]].

Status 2026-11-01 ~04:06 PT: local session ended (machine shutdown). Work continues via one-time cloud routine trig_01KXk1S3tMnv8AMe37gv1dTE (Opus 5.5) following dev_plan/HANDOFF.md on feat/engagement-overhaul. When resuming, `git pull` first and read HANDOFF.md + project_status.html.
