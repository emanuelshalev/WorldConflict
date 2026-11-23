---
name: dev-env-node22
description: System node is v18 (too old for Vite 7/Prisma 7); use user-local Node 22 on this aarch64 machine
metadata:
  node_type: memory
  type: reference
  originSessionId: 560a71e3-7113-4ffa-aea8-74191a508a8c
  modified: 2026-11-01T10:29:09.033Z
---

Machine is aarch64 (ARM64). System `/usr/bin/node` is v18.19: too old for Vite 7 and Prisma 7. A user-local Node 22 LTS is installed at `~/.local/share/node/current/bin` (symlink to node-v22.23.4-linux-arm64). Prefix commands with `export PATH=$HOME/.local/share/node/current/bin:$PATH`.
