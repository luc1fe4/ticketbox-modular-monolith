# Development Setup

1. Copy `.env.example` to `.env`.
2. Replace placeholder passwords with local development values.
3. Run `docker compose up --build` from the repository root.
4. Check `http://localhost:8080/api/health`.
5. Open the web client at `http://localhost:5173`.

PowerShell helpers are available in `scripts/`:

- `start-dev.ps1`: checks environment variables and starts Docker Compose.
- `check-env.ps1`: validates that required environment keys exist in `.env`.

The shell helper `start-dev.sh` performs the same startup flow for Unix-like shells.
