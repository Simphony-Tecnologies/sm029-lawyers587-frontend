#!/usr/bin/env bash
set -uo pipefail

# ═══ CONFIGURATION (override via env vars) ═══════════════════════════════════
API_URL="${API_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@587lawyers.com}"
ADMIN_PASS="${ADMIN_PASS:-password123}"
TARGET_EMAIL="${TARGET_EMAIL:-bycoortz@gmail.com}"
PAUSE="${PAUSE:-3}"
# ══════════════════════════════════════════════════════════════════════════════

# ─── Helpers ──────────────────────────────────────────────────────────────────
GRN='\033[0;32m' RED='\033[0;31m' YLW='\033[1;33m'
CYN='\033[0;36m' BLD='\033[1m' NC='\033[0m'

passed=0 failed=0 skipped=0
results=()

log()  { echo -e "${CYN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GRN}  ✓ $1${NC}"; ((passed++)); results+=("✓ $1"); }
fail() { echo -e "${RED}  ✗ $1${NC}"; ((failed++)); results+=("✗ $1"); }
skip() { echo -e "${YLW}  ⊘ $1${NC}"; ((skipped++)); results+=("⊘ $1 (skipped)"); }
sep()  { echo -e "${YLW}──────────────────────────────────────────────────${NC}"; }

check() {
  local label="$1" resp="$2"
  local success
  success=$(echo "$resp" | jq -r '.success // empty' 2>/dev/null)
  if [[ "$success" == "true" ]]; then
    ok "$label"
    return 0
  else
    local err
    err=$(echo "$resp" | jq -r '.message // .error // "unknown"' 2>/dev/null)
    fail "$label → $err"
    return 1
  fi
}

wait_between() { sleep "$PAUSE"; }

# ═════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLD}  587 Lawyers — Email Trigger Test Suite${NC}"
echo -e "${BLD}  API:    ${API_URL}${NC}"
echo -e "${BLD}  Target: ${TARGET_EMAIL}${NC}"
echo -e "${BLD}  Pause:  ${PAUSE}s between triggers${NC}"
echo -e "${BLD}═══════════════════════════════════════════════════════${NC}"
echo ""

# ─── 1. LOGIN ─────────────────────────────────────────────────────────────────
log "Step 1/14 — Login"
LOGIN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}")

TOKEN=$(echo "$LOGIN" | jq -r '.access_token // .data.token // .token // empty' 2>/dev/null)
if [[ -z "$TOKEN" ]]; then
  echo -e "${RED}FATAL: Login failed${NC}"
  echo "$LOGIN" | jq . 2>/dev/null || echo "$LOGIN"
  exit 1
fi
ok "Login OK"
sep

# ─── 2. RESOLVE LAWYER ID ────────────────────────────────────────────────────
if [[ -n "${LAWYER_ID:-}" ]]; then
  ok "Using provided LAWYER_ID=$LAWYER_ID"
else
  # Use the logged-in user's ID
  LAWYER_ID=$(echo "$LOGIN" | jq -r '.lawyer.id // empty' 2>/dev/null)
  if [[ -z "$LAWYER_ID" || "$LAWYER_ID" == "null" ]]; then
    LAWYER_ID=2  # admin fallback
  fi
  ok "Using login lawyer (ID: $LAWYER_ID)"
fi
sep

# ─── 3. SMTP TEST EMAIL ──────────────────────────────────────────────────────
log "Step 3/14 — SMTP basic test email"
R=$(curl -s "${API_URL}/auth/send-test-email")
check "SMTP_TEST_EMAIL" "$R" || true
wait_between; sep

# ─── 4. NOTIFICATION TEST ────────────────────────────────────────────────────
log "Step 4/14 — POST /notifications/test"
R=$(curl -s -X POST "${API_URL}/notifications/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"lawyer_id\":$LAWYER_ID}")
check "NOTIFICATION_TEST" "$R" || true
wait_between; sep

# ─── Resolve a service type the lawyer is configured for ─────────────────────
LAWYER_SVC=$(curl -s "${API_URL}/lawyers-services/lawyer/${LAWYER_ID}" \
  -H "Authorization: Bearer $TOKEN")
SVC_TYPE_ID=$(echo "$LAWYER_SVC" | jq -r '.[0].service_type_id // .data[0].service_type_id // empty' 2>/dev/null)
if [[ -n "$SVC_TYPE_ID" && "$SVC_TYPE_ID" != "null" ]]; then
  SVC_NAME=$(curl -s "${API_URL}/service_types/${SVC_TYPE_ID}" | jq -r '.name // .data.name // "Criminal Defense"' 2>/dev/null)
else
  SVC_NAME="Criminal Defense"
fi
log "  Lawyer service type: ${SVC_NAME}"

# ─── 5. LEAD_POOL_NEW (create clean lead) ────────────────────────────────────
log "Step 5/14 — Create clean lead → LEAD_POOL_NEW"
R=$(curl -s -X POST "${API_URL}/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name":"Email Trigger Test","number":"5559876543",
    "email":"clean-trigger@example.com","lawyer_type":"'"${SVC_NAME}"'",
    "description":"Testing LEAD_POOL_NEW notification trigger","comments":""
  }')
check "LEAD_POOL_NEW" "$R" || true
LEAD_ID=$(echo "$R" | jq -r '.data.id // empty')

# Fallback: grab a lead from the pool
if [[ -z "$LEAD_ID" || "$LEAD_ID" == "null" ]]; then
  log "  Fetching lead from pool as fallback..."
  POOL=$(curl -s "${API_URL}/leads/pool?limit=1" -H "Authorization: Bearer $TOKEN")
  LEAD_ID=$(echo "$POOL" | jq -r '.data.data[0].id // .data[0].id // empty')
fi

if [[ -z "$LEAD_ID" || "$LEAD_ID" == "null" ]]; then
  echo -e "${RED}FATAL: No lead available — cannot continue trigger tests${NC}"
  exit 1
fi
log "  Using lead ID: ${LEAD_ID}"
wait_between; sep

# ─── 6. LEAD_SPAM_FLAGGED (create spammy lead) ───────────────────────────────
log "Step 6/14 — Create spam lead → LEAD_SPAM_FLAGGED"
R=$(curl -s -X POST "${API_URL}/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name":"xzxzxzxz","number":"123",
    "email":"spam@mailinator.com","lawyer_type":"'"${SVC_NAME}"'",
    "description":"buy now","comments":""
  }')
check "LEAD_SPAM_FLAGGED" "$R" || true
SPAM_ID=$(echo "$R" | jq -r '.data.id // empty')
wait_between; sep

# ─── 7. LEAD_ASSIGNED ────────────────────────────────────────────────────────
log "Step 7/14 — Assign lead → LEAD_ASSIGNED"
R=$(curl -s -X PATCH "${API_URL}/leads/${LEAD_ID}/assign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"lawyer_id\":$LAWYER_ID,\"comment\":\"trigger test\"}")
check "LEAD_ASSIGNED" "$R" || true
wait_between; sep

# ─── 8. LEAD_STATUS_PROBLEMATIC ──────────────────────────────────────────────
log "Step 8/14 — Status → PROBLEMATIC"
R=$(curl -s -X PATCH "${API_URL}/leads/bulk/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"lead_ids\":[$LEAD_ID],\"status\":\"PROBLEMATIC\",\"comment\":\"trigger test\"}")
check "LEAD_STATUS_PROBLEMATIC" "$R" || true
wait_between; sep

# ─── 9. LEAD_CLOSED ──────────────────────────────────────────────────────────
log "Step 9/14 — Status → CLOSED"
R=$(curl -s -X PATCH "${API_URL}/leads/bulk/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"lead_ids\":[$LEAD_ID],\"status\":\"CLOSED\",\"comment\":\"trigger test\"}")
check "LEAD_CLOSED" "$R" || true
wait_between; sep

# ─── 10. LEAD_UNASSIGNED ─────────────────────────────────────────────────────
log "Step 10/14 — Unassign lead → LEAD_UNASSIGNED"
R=$(curl -s -X PATCH "${API_URL}/leads/${LEAD_ID}/unassign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"comment":"trigger test"}')
check "LEAD_UNASSIGNED" "$R" || true
wait_between; sep

# ─── 11. LEAD_PULLED (reset to NEW first) ────────────────────────────────────
log "Step 11/14 — Reset to NEW, then pull → LEAD_PULLED"
curl -s -X PATCH "${API_URL}/leads/bulk/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"lead_ids\":[$LEAD_ID],\"status\":\"NEW\",\"comment\":\"reset\"}" > /dev/null 2>&1
sleep 1

R=$(curl -s -X POST "${API_URL}/leads/pull" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"lead_id\":$LEAD_ID,\"lawyer_id\":$LAWYER_ID,\"comment\":\"trigger test\"}")
check "LEAD_PULLED" "$R" || true
wait_between; sep

# ─── 12. LEAD_RESTORED (trash then restore) ──────────────────────────────────
log "Step 12/14 — Trash → Restore → LEAD_RESTORED"
curl -s -X PUT "${API_URL}/leads/${LEAD_ID}/trash" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"comment":"trigger test"}' > /dev/null 2>&1
sleep 1

R=$(curl -s -X PATCH "${API_URL}/leads/${LEAD_ID}/restore" \
  -H "Authorization: Bearer $TOKEN")
check "LEAD_RESTORED" "$R" || true
wait_between; sep

# ─── 13. BULK_COMPLETED (archive) ────────────────────────────────────────────
log "Step 13/14 — Bulk archive → BULK_COMPLETED"
R=$(curl -s -X PATCH "${API_URL}/leads/bulk/archive" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"lead_ids\":[$LEAD_ID],\"comment\":\"trigger test\"}")
check "BULK_COMPLETED" "$R" || true
wait_between; sep

# ─── 14. SCHEDULED NOTIFICATION ──────────────────────────────────────────────
SCHED=$(date -u -v+5M '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '+5 minutes' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || echo "2026-06-25T23:59:00Z")
log "Step 14/14 — Schedule notification (${SCHED})"
R=$(curl -s -X POST "${API_URL}/notifications/schedule" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"lawyer_id\":$LAWYER_ID,
    \"lead_id\":$LEAD_ID,
    \"type\":\"SCHEDULED\",
    \"scheduled_at\":\"$SCHED\",
    \"message\":\"Test scheduled notification — trigger suite\"
  }")
check "SCHEDULED_NOTIFICATION" "$R" || true
sep

# ─── CLEANUP ──────────────────────────────────────────────────────────────────
if [[ -n "${SPAM_ID:-}" && "$SPAM_ID" != "null" ]]; then
  log "Cleanup: confirming spam lead $SPAM_ID → TRASHED"
  curl -s -X PATCH "${API_URL}/leads/${SPAM_ID}/mark-spam" \
    -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
fi

# ─── REPORT ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLD}  RESULTS${NC}"
echo -e "${BLD}═══════════════════════════════════════════════════════${NC}"
for r in "${results[@]}"; do
  case "$r" in
    ✓*) echo -e "  ${GRN}$r${NC}" ;;
    ✗*) echo -e "  ${RED}$r${NC}" ;;
    *)  echo -e "  ${YLW}$r${NC}" ;;
  esac
done
echo ""
echo -e "  ${GRN}Passed: $passed${NC}  |  ${RED}Failed: $failed${NC}"
echo ""
echo -e "${YLW}  Triggers automáticos (no testeables por curl):${NC}"
echo -e "  • LEAD_EXPIRED / LEAD_EXPIRING_SOON  (cron 12h)"
echo -e "  • LEAD_DISABLED                      (cron 12h)"
echo -e "  • DAILY_SUMMARY / WEEKLY_SUMMARY     (cron programado)"
echo ""
echo -e "${CYN}  → Revisa inbox de ${TARGET_EMAIL}${NC}"
echo -e "${BLD}═══════════════════════════════════════════════════════${NC}"
