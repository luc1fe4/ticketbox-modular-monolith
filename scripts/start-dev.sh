#!/usr/bin/env bash
set -euo pipefail

if [ ! -f ".env" ]; then
  echo "Missing .env. Copy .env.example to .env before starting the stack."
  exit 1
fi

docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
