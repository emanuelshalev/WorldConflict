---
name: status-page-cadence
description: "CEO wants dev_plan/project_status.html refreshed and pushed regularly during long work, not only at merges"
metadata:
  node_type: memory
  type: feedback
  originSessionId: c790e4f0-25ab-45ad-bcda-a1bb0eac880c
  modified: 2026-11-24T03:30:13.690Z
---

On 2026-11-23 the user said: "update project status regularly. last version is from a few hours ago" (after having asked "update project status file?" twice the same day).

**Why:** the user follows the project remotely through the pushed status page; during a long fix round with no merge the page went stale for hours.

**How to apply:** (my interpretation) refresh `dev_plan/project_status.html` (hand-edit `LOOP.now`, run status-refresh T1, commit with `usage/archive/`, push, SendUserFile) at every notable event (review result, fix round sent or returned, gate result), and at least about once an hour while work is running, not only after merges or stage changes. See [[devloop-rc1-loop]].
