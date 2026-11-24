#!/bin/sh
# usage: q.sh <port> <<'JS' ... JS
curl -s --max-time 590 -X POST --data-binary @- "http://localhost:$1/"
