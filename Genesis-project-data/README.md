# Genesis-project-data

WorldConflict's data for Genesis (github.com/emanuelshalev/genesis). Genesis reads the devloop
read-only and keeps its own records here. Nothing outside this folder is changed for Genesis.

- `project.json`: the project's configuration: id, repository, where the devloop instance and the
  status page are (paths relative to this folder) and the targets.
- `snapshots/events.jsonl`: the committed event log, one event per line (5,890 events covering
  iterations 0 to 4). A machine without the devloop files can load it with `genesis restore`.
- `project.db`: the live SQLite database Genesis builds from the devloop and the snapshot. It is
  machine-specific and git-ignored.

Bring-up check: Genesis reproduces every number on `dev_plan/project_status.html` (349 of 349 checks).
From a Genesis checkout: `npm run sources && npm run ingest && npm run parity`.
