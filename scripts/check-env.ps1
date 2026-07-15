$requiredKeys = @(
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "SPRING_DATASOURCE_URL",
    "SPRING_DATASOURCE_USERNAME",
    "SPRING_DATASOURCE_PASSWORD",
    "REDIS_HOST",
    "REDIS_PORT",
    "RABBITMQ_HOST",
    "RABBITMQ_PORT",
    "RABBITMQ_USERNAME",
    "RABBITMQ_PASSWORD",
    "JWT_SECRET",
    "VITE_API_BASE_URL"
)

if (-not (Test-Path -LiteralPath ".env")) {
    Write-Error "Missing .env. Copy .env.example to .env first."
    exit 1
}

$envContent = Get-Content -LiteralPath ".env"
$missingKeys = @()

foreach ($key in $requiredKeys) {
    $line = $envContent | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
    if (-not $line -or [string]::IsNullOrWhiteSpace(($line -split "=", 2)[1])) {
        $missingKeys += $key
    }
}

if ($missingKeys.Count -gt 0) {
    Write-Error "Missing required keys or values: $($missingKeys -join ', ')"
    exit 1
}

Write-Host "All required environment keys are present."
