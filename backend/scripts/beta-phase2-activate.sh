#!/bin/bash
# Activate Phase 2: 1% Rollout
# Prerequisites: Phase 1 Go/No-Go decision = GO

set -e

echo "========================================="
echo "ACTIVATING PHASE 2: 1% ROLLOUT"
echo "Time: $(date +"%Y-%m-%d %H:%M:%S BRT")"
echo "========================================="
echo ""

# Get admin token
TOKEN=$(curl -s -X POST "https://api.kaviar.com.br/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"suporte@usbtecnok.com.br","password":"z4939ia4"}' | jq -r '.token')

# Confirm current state
echo "Current state:"
FLAG_STATE=$(curl -s "https://api.kaviar.com.br/api/admin/feature-flags/passenger_favorites_matching" \
  -H "Authorization: Bearer $TOKEN")

echo $FLAG_STATE | jq '{enabled: .flag.enabled, rolloutPercentage: .flag.rolloutPercentage}'
echo ""

read -p "Proceed with Phase 2 (1% rollout)? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

# Update to 1% rollout
echo ""
echo "Updating rollout to 1%..."
RESULT=$(curl -s -X PUT "https://api.kaviar.com.br/api/admin/feature-flags/passenger_favorites_matching" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"rolloutPercentage":1}')

if [ "$(echo $RESULT | jq -r '.success')" == "true" ]; then
  echo "✅ Rollout updated to 1%"
else
  echo "✗ Failed to update rollout"
  echo $RESULT | jq '.'
  exit 1
fi

# Verify
echo ""
echo "Verifying new state..."
NEW_STATE=$(curl -s "https://api.kaviar.com.br/api/admin/feature-flags/passenger_favorites_matching" \
  -H "Authorization: Bearer $TOKEN")

echo $NEW_STATE | jq '{
  enabled: .flag.enabled,
  rolloutPercentage: .flag.rolloutPercentage,
  updatedAt: .flag.updatedAt
}'

ALLOWLIST_COUNT=$(curl -s "https://api.kaviar.com.br/api/admin/feature-flags/passenger_favorites_matching/allowlist" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.pagination.total')

echo ""
echo "Allowlist: $ALLOWLIST_COUNT passengers (maintained)"
echo ""

# Create Phase 2 doc
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > /home/goes/kaviar/docs/BETA_PHASE2_ROLLOUT_1P_$(date +%Y-%m-%d).md << EOF
# Beta Phase 2 - 1% Rollout
**Start Date:** $(date +%Y-%m-%d)
**Start Time:** $TIMESTAMP
**Duration:** 24-48 hours
**Status:** 🟢 ACTIVE

---

## Configuration

**Feature Flag:** \`passenger_favorites_matching\`
- **Enabled:** \`true\`
- **Rollout Percentage:** \`1%\`
- **Allowlist:** $ALLOWLIST_COUNT passengers (maintained from Phase 1)

---

## Rollout Behavior

**Allowlist (10 passengers):** Feature ENABLED (highest priority)
**1% Deterministic Rollout:** ~1% of remaining passengers get feature
**Remaining ~99%:** Feature DISABLED

**Total Impact:** ~10 + 1% of base = estimated 10-50 passengers

---

## Phase 1 Results Summary

✅ All Phase 1 success criteria met:
- Zero increase in 5xx errors
- No significant latency increase
- Matching success rate ≥ baseline
- Zero critical complaints
- Deterministic behavior confirmed

---

## Monitoring Plan (24-48h)

### Checkpoints
- T+6h: $(date -d "+6 hours" +"%Y-%m-%d %H:%M UTC")
- T+12h: $(date -d "+12 hours" +"%Y-%m-%d %H:%M UTC")
- T+24h: $(date -d "+24 hours" +"%Y-%m-%d %H:%M UTC")
- T+48h: $(date -d "+48 hours" +"%Y-%m-%d %H:%M UTC")

### Key Metrics
1. Matching success rate (1% cohort vs baseline)
2. Time-to-match p50/p95
3. API latency p95
4. Error rate 4xx/5xx
5. Operational complaints

### Success Criteria (Phase 2 → Phase 3)
- 5xx errors: zero increase
- p95 latency: < baseline +20%
- Success rate: ≥ baseline
- Complaints: 0 critical
- Determinism: confirmed

---

## Rollback

**Level 1 (< 1 min):** Set \`rolloutPercentage=0\` (back to allowlist-only)
**Level 2 (< 1 min):** Set \`enabled=false\` (full disable)
**Level 3 (3-5 min):** Task definition rollback

---

## Updates

### $TIMESTAMP - Phase 2 Started
- Rollout increased from 0% to 1%
- Allowlist maintained ($ALLOWLIST_COUNT passengers)
- Monitoring active
EOF

echo "========================================="
echo "✅ PHASE 2 ACTIVATED"
echo "========================================="
echo ""
echo "Configuration:"
echo "  enabled: true"
echo "  rollout_percentage: 1%"
echo "  allowlist: $ALLOWLIST_COUNT passengers"
echo ""
echo "Documentation:"
echo "  /home/goes/kaviar/docs/BETA_PHASE2_ROLLOUT_1P_$(date +%Y-%m-%d).md"
echo ""
echo "Next checkpoint: T+6h ($(date -d "+6 hours" +"%Y-%m-%d %H:%M BRT"))"
echo ""
echo "Monitor with:"
echo "  cd /home/goes/kaviar/backend"
echo "  ./scripts/beta-phase1-checkpoint.sh \"Phase2-T+6h\""
echo ""
echo "========================================="
