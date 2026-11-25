---
name: openclaw-deploy
description: How the OpenClaw deploy request to the Oracle server works after publishing an iteration to main
metadata:
  node_type: memory
  type: reference
  originSessionId: c790e4f0-25ab-45ad-bcda-a1bb0eac880c
  modified: 2026-11-24T17:44:14.837Z
---

After each iteration reaches main (publish.mjs), ask OpenClaw to deploy main to the Oracle server (user's standing instruction, 2026-11). Worked first time on 2026-11-24 for iter-4.

- Command: `openclaw agent --json --message "..."` naming the GitHub repo (emanuelshalev/WorldConflict), branch main and the commit. Without `--json` the command prints nothing even on success.
- The deployed game answers at https://conflict.ucent.ai/ (port 18080 on the server); check it returns 200 afterwards.
- Only published main is ever deployed. See [[devloop-rc1-loop]].
