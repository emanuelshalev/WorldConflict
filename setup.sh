#!/usr/bin/env sh
# World Conflict setup for macOS and Linux: ./setup.sh   (add --start to launch the game afterwards)
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js 22 LTS from https://nodejs.org (or via nvm), then run ./setup.sh again."
  exit 1
fi
exec node scripts/setup.mjs "$@"
