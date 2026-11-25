---
name: design-review-rule-d86
description: "CEO decision 2026-11-24 (D-86): no design review per package, one review at end of Build, reference screen 1920x1080 (D-87), must scale with resolution, other shapes later"
metadata:
  node_type: memory
  type: feedback
  originSessionId: c790e4f0-25ab-45ad-bcda-a1bb0eac880c
  modified: 2026-11-24T03:47:52.649Z
---

On 2026-11-24 the user said the per-package design review "seems too heavy... maybe worth to finish the build and do a design review when all packages are in", and "I dont think is needed to look at all these screen sizes. adjusting to screen size is a fine tuning once the game is in place. I would do screen size adjustments also later on".

**Why:** iteration 4 took about 3x the time and 2x the cost of iteration 3, mainly from 6 failed per-package reviews at five sizes, each triggering a fix round and a 28 minute gate.

**How to apply:** recorded as ledger D-86. UI packages merge on the automated gate plus the engineer's screenshot check; one full design review of the integrated build at the end of Build; review at 1920x1080 only. The user corrected my first pick: "3440x1440 is too much. Check a 16:9 aspect ratio 1080p. Make sure it should scale according to res" (D-87): larger 16:9 screens must show the 1080p layout scaled up, not a separate arrangement. Do not open size-specific work (phone, laptop) until a later screen-size pass. Existing automated guards at other sizes stay (my interpretation: they cost no review time and the user's rule is never remove capabilities). More generally: price a new process gate before adopting it. See [[devloop-rc1-loop]].
