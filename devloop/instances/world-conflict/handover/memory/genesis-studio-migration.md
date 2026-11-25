---
name: genesis-studio-migration
description: User plans GenesisStudio to replace devloop and the project status page; iteration 5 waits for it
metadata:
  node_type: memory
  type: project
  originSessionId: c790e4f0-25ab-45ad-bcda-a1bb0eac880c
  modified: 2026-11-25T00:25:11.304Z
---

On 2026-11-24 the user said they are building GenesisStudio, a development framework that will replace `devloop/` and `dev_plan/project_status.html`. They are migrating everything devloop does into it ("all is supported and probably more") and will give the exact setup once it is ready. Development then continues on that system.

**Why:** the user wants to improve the project development framework and the status page.

**How to apply:** do not start iteration 5 or invest further in devloop tooling or the status page until the user describes the GenesisStudio setup. When they do, map the current devloop pieces onto it (controller and gates, ledger, customer panel and record, Customer Advocate and keep list, usage ledger, status protocol, RESUME) and flag anything it does not cover. See [[devloop-rc1-loop]].
