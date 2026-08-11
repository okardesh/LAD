#!/bin/sh
set -eu

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR"

if [ ! -f "env/dev.env" ]; then
  echo "Missing env/dev.env"
  exit 1
fi

echo "Starting UI in real-backend mode (NODE_ENV=development)"
exec env NODE_ENV=development node app.js
