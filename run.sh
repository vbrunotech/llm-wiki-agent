#!/bin/bash
set -e
cd "$(dirname "$0")/backend"
uv run uvicorn app:app --reload --port 8789
