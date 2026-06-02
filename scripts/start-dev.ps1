if (-not (Test-Path -LiteralPath ".env")) {
    Write-Error "Missing .env. Copy .env.example to .env before starting the stack."
    exit 1
}

& docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
