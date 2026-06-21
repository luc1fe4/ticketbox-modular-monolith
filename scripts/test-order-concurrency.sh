#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-ticketbox-postgres}"
POSTGRES_USER="${POSTGRES_USER:-ticketbox}"
POSTGRES_DB="${POSTGRES_DB:-ticketbox}"

CONCERT_ID="30000000-0000-0000-0000-000000000001"
OVERSELL_TYPE_ID="40000000-0000-0000-0000-000000000001"
LIMIT_TYPE_ID="40000000-0000-0000-0000-000000000002"
PASSWORD="password123"
TEMP_DIR="$(mktemp -d)"

cleanup_files() {
  rm -rf "$TEMP_DIR"
}
trap cleanup_files EXIT

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

psql_exec() {
  docker exec -i "$POSTGRES_CONTAINER" \
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

cleanup_database() {
  psql_exec >/dev/null <<'SQL'
DELETE FROM order_items
WHERE order_id IN (
  SELECT o.id
  FROM orders o
  JOIN users u ON u.id = o.user_id
  WHERE u.email LIKE 'concurrency-%@ticketbox.test'
);

DELETE FROM orders
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'concurrency-%@ticketbox.test'
);

DELETE FROM users WHERE email LIKE 'concurrency-%@ticketbox.test';
DELETE FROM ticket_types WHERE concert_id = '30000000-0000-0000-0000-000000000001';
DELETE FROM concerts WHERE id = '30000000-0000-0000-0000-000000000001';
SQL
}

if [[ "${1:-}" == "--cleanup" ]]; then
  require_command docker
  cleanup_database
  echo "Concurrency test fixtures removed."
  exit 0
fi

require_command curl
require_command jq
require_command docker

curl --fail --silent "$BASE_URL/api/health" >/dev/null

cleanup_database

psql_exec >/dev/null <<'SQL'
INSERT INTO concerts (
  id, title, description, artist_bio, venue_name, venue_address,
  event_date, doors_open_at, status, seat_map_svg, poster_url,
  created_by, created_at, updated_at
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  'Concurrency Proof Concert',
  'Isolated fixture for concurrent order tests.',
  'Automated test fixture.',
  'Test Venue',
  'Test Address',
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '30 days' - INTERVAL '2 hours',
  'ON_SALE',
  '<svg></svg>',
  NULL,
  '00000000-0000-0000-0000-000000000001',
  NOW(),
  NOW()
);

INSERT INTO ticket_types (
  id, concert_id, name, price, total_quantity, available_qty,
  max_per_account, sale_start_at, sale_end_at, zone_color,
  is_active, created_at, updated_at
) VALUES
(
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'OVERSELL',
  100000,
  5,
  5,
  1,
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '29 days',
  '#ff765f',
  TRUE,
  NOW(),
  NOW()
),
(
  '40000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000001',
  'ACCOUNT_LIMIT',
  100000,
  100,
  100,
  2,
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '29 days',
  '#8f7aff',
  TRUE,
  NOW(),
  NOW()
);
SQL

register_and_login() {
  local email="$1"
  local full_name="$2"

  curl --silent --show-error \
    --request POST "$BASE_URL/api/auth/register" \
    --header 'Content-Type: application/json' \
    --data "$(jq -nc \
      --arg email "$email" \
      --arg password "$PASSWORD" \
      --arg fullName "$full_name" \
      '{email:$email,password:$password,fullName:$fullName,phone:null}')" \
    >/dev/null

  curl --fail --silent --show-error \
    --request POST "$BASE_URL/api/auth/login" \
    --header 'Content-Type: application/json' \
    --data "$(jq -nc \
      --arg email "$email" \
      --arg password "$PASSWORD" \
      '{email:$email,password:$password}')" \
    | jq -er '.data.accessToken'
}

run_order() {
  local token="$1"
  local ticket_type_id="$2"
  local quantity="$3"
  local idempotency_key="$4"
  local output_file="$5"

  curl --silent --show-error \
    --output "$output_file" \
    --write-out '%{http_code}' \
    --request POST "$BASE_URL/api/orders" \
    --header "Authorization: Bearer $token" \
    --header "Idempotency-Key: $idempotency_key" \
    --header 'Content-Type: application/json' \
    --data "$(jq -nc \
      --arg concertId "$CONCERT_ID" \
      --arg ticketTypeId "$ticket_type_id" \
      --argjson quantity "$quantity" \
      '{concertId:$concertId,items:[{ticketTypeId:$ticketTypeId,quantity:$quantity}]}')"
}

echo "Creating isolated audience accounts..."
for worker in $(seq 1 12); do
  token="$(register_and_login \
    "concurrency-buyer-${worker}@ticketbox.test" \
    "Concurrency Buyer ${worker}")"
  printf '%s\n' "$token" >"$TEMP_DIR/oversell-token-${worker}"
done

limit_token="$(register_and_login \
  'concurrency-limit@ticketbox.test' \
  'Concurrency Limit Buyer')"

echo
echo "Running oversell test: 12 buyers competing for 5 tickets..."
for worker in $(seq 1 12); do
  (
    token="$(cat "$TEMP_DIR/oversell-token-${worker}")"
    code="$(run_order \
      "$token" \
      "$OVERSELL_TYPE_ID" \
      1 \
      "oversell-${worker}-$(date +%s%N)" \
      "$TEMP_DIR/oversell-body-${worker}.json")"
    printf '%s\n' "$code" >"$TEMP_DIR/oversell-code-${worker}"
  ) &
done
wait

oversell_201="$(cat "$TEMP_DIR"/oversell-code-* | awk '$0 == "201" { count++ } END { print count + 0 }')"
oversell_409="$(cat "$TEMP_DIR"/oversell-code-* | awk '$0 == "409" { count++ } END { print count + 0 }')"
oversell_db="$(psql_exec -At -F '|' <<SQL
SELECT
  tt.available_qty,
  COALESCE(SUM(oi.quantity) FILTER (
    WHERE o.status IN ('AWAITING_PAYMENT', 'PAID')
  ), 0)
FROM ticket_types tt
LEFT JOIN order_items oi ON oi.ticket_type_id = tt.id
LEFT JOIN orders o ON o.id = oi.order_id
WHERE tt.id = '$OVERSELL_TYPE_ID'
GROUP BY tt.id;
SQL
)"
IFS='|' read -r oversell_remaining oversell_stored <<<"$oversell_db"

echo "OVERSELL TEST"
echo "HTTP 201: $oversell_201"
echo "HTTP 409: $oversell_409"
echo "Remaining inventory: $oversell_remaining"
echo "Stored quantity: $oversell_stored"

if [[ "$oversell_201" -ne 5 || "$oversell_remaining" -ne 0 || "$oversell_stored" -ne 5 ]]; then
  echo "Oversell invariant failed. Response bodies are in $TEMP_DIR." >&2
  exit 1
fi

echo
echo "Running max_per_account test: 20 concurrent requests, quantity 2, limit 2..."
for worker in $(seq 1 20); do
  (
    code="$(run_order \
      "$limit_token" \
      "$LIMIT_TYPE_ID" \
      2 \
      "limit-${worker}-$(date +%s%N)" \
      "$TEMP_DIR/limit-body-${worker}.json")"
    printf '%s\n' "$code" >"$TEMP_DIR/limit-code-${worker}"
  ) &
done
wait

limit_201="$(cat "$TEMP_DIR"/limit-code-* | awk '$0 == "201" { count++ } END { print count + 0 }')"
limit_400="$(cat "$TEMP_DIR"/limit-code-* | awk '$0 == "400" { count++ } END { print count + 0 }')"
limit_409="$(cat "$TEMP_DIR"/limit-code-* | awk '$0 == "409" { count++ } END { print count + 0 }')"
limit_429="$(cat "$TEMP_DIR"/limit-code-* | awk '$0 == "429" { count++ } END { print count + 0 }')"
limit_db="$(psql_exec -At -F '|' <<SQL
SELECT
  tt.available_qty,
  COALESCE(SUM(oi.quantity) FILTER (
    WHERE o.status IN ('AWAITING_PAYMENT', 'PAID')
  ), 0)
FROM ticket_types tt
LEFT JOIN order_items oi ON oi.ticket_type_id = tt.id
LEFT JOIN orders o ON o.id = oi.order_id
LEFT JOIN users u ON u.id = o.user_id
WHERE tt.id = '$LIMIT_TYPE_ID'
  AND (u.email = 'concurrency-limit@ticketbox.test' OR u.email IS NULL)
GROUP BY tt.id;
SQL
)"
IFS='|' read -r limit_remaining limit_stored <<<"$limit_db"

echo "MAX_PER_ACCOUNT TEST"
echo "HTTP 201: $limit_201"
echo "HTTP 400: $limit_400"
echo "HTTP 409: $limit_409"
echo "HTTP 429: $limit_429"
echo "Final account quantity: $limit_stored"
echo "Remaining inventory: $limit_remaining"

if [[ "$limit_201" -ne 1 || "$limit_stored" -ne 2 || "$limit_remaining" -ne 98 ]]; then
  echo "Account-limit invariant failed. Response bodies are in $TEMP_DIR." >&2
  exit 1
fi

echo
echo "All concurrent purchase invariants passed."
cleanup_database
