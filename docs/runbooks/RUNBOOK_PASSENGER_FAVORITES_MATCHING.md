# RUNBOOK - Passenger Favorites Matching

**Feature Key:** `passenger_favorites_matching`  
**Current Phase:** Phase 1 Beta (Allowlist Only)  
**Owner:** DevOps / Backend Team  
**Last Updated:** 2026-02-01

---

## 1. Context

### Feature Overview
Passenger Favorites Matching enables passengers to save favorite locations and receive optimized driver matching based on their preferences.

### Current State
- **Phase:** Phase 1 Beta
- **Rollout:** 0% (allowlist only)
- **Beta Group:** 10 passengers
- **Start Date:** 2026-02-01 05:04 UTC

### Links
- **UI Feature Flags:** https://app.kaviar.com.br/admin/feature-flags
- **UI Beta Monitor:** https://app.kaviar.com.br/admin/beta-monitor
- **API Docs:** Internal

---

## 2. Health Signals

### 🟢 GREEN (Healthy)
- 5xx errors: 0
- Config drift: None
- Determinism: PASS (beta passengers in allowlist)
- Complaints: 0
- Matching success rate: ≥ baseline

### 🟡 YELLOW (Warning)
- 4xx errors increasing (401/403/429)
- Latency p95 approaching threshold
- Minor config drift (allowlist count ±1)
- Non-critical warnings in logs

### 🔴 RED (Critical)
- 5xx error rate > baseline + 10%
- Config drift: enabled/rollout changed unexpectedly
- Determinism: FAIL
- Critical complaint from beta passenger
- Matching success rate < baseline - 10%

---

## 3. Monitoring Checkpoints

### Automated Checkpoints
- **Frequency:** Hourly (via EventBridge)
- **Script:** `beta-monitor-dog.js`
- **Storage:** `beta_monitor_checkpoints` table

### Manual Checkpoints
```bash
# Via UI: Click "Executar agora" button
# Via API:
curl -X POST https://api.kaviar.com.br/api/admin/beta-monitor/passenger_favorites_matching/run \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"phase":"phase1_beta"}'
```

### What to Validate
1. **Config Snapshot**
   - enabled: true
   - rollout_percentage: 0
   - allowlist_count: 10

2. **Metrics**
   - HTTP status breakdown (2xx/3xx/4xx/5xx)
   - Error rates (total and 5xx only)
   - Feature flag requests
   - Matching requests

3. **Determinism**
   - Test IDs: pass_beta_001_2026, pass_beta_005_2026
   - Expected: Both IN ALLOWLIST
   - Result: PASS if both found

4. **Alerts**
   - CONFIG_DRIFT
   - ERROR_RATE_5XX
   - DETERMINISM_FAIL

---

## 4. Rollback Procedures

### Level 1: Immediate (< 1 minute)
**Action:** Disable feature via UI or API

```bash
# Option A: Disable feature
curl -X PUT https://api.kaviar.com.br/api/admin/feature-flags/passenger_favorites_matching \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"enabled":false,"rolloutPercentage":0}'

# Option B: Clear allowlist (keep enabled=true, rollout=0)
# Via UI: Remove all passengers from allowlist
```

**When to use:**
- 5xx error rate spike
- Critical complaint confirmed
- Determinism failure

### Level 2: Master Switch (< 5 minutes)
**Action:** Force OFF via environment variable

```bash
# Set env var FEATURE_PASSENGER_FAVORITES_MATCHING=false
aws ecs update-service \
  --cluster kaviar-prod \
  --service kaviar-backend-service \
  --region us-east-1 \
  --force-new-deployment
```

**When to use:**
- Level 1 didn't resolve issue
- Need global override

### Level 3: Task Definition Rollback (3-5 minutes)
**Action:** Revert to previous stable version

```bash
# Rollback to task definition 32 (or earlier stable version)
aws ecs update-service \
  --cluster kaviar-prod \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:32 \
  --region us-east-1
```

**When to use:**
- Code regression detected
- Multiple issues after deployment

---

## 5. Go/No-Go Decision (T+24h)

### Automated Criteria
- ✅ 5xx error rate: 0% (no increase)
- ✅ Config stable: enabled=true, rollout=0%, allowlist=10
- ✅ No rollback triggers activated

### Manual Review Checklist
- [ ] Matching success rate ≥ baseline
- [ ] Time-to-match p50/p95 < baseline + 20%
- [ ] API latency p95 < baseline + 50%
- [ ] Zero critical complaints from beta passengers
- [ ] Resolver determinism confirmed (2+ calls same ID)

### Decision Matrix

| Criteria | Status | Action |
|----------|--------|--------|
| All automated PASS + All manual PASS | GO | Proceed to Phase 2 (1% rollout) |
| Automated PASS + Manual WARN | EXTEND | Continue Phase 1 for 24h |
| Any FAIL | NO-GO | Investigate, fix, restart Phase 1 |

### Phase 2 Activation
```bash
# Update rollout to 1%
curl -X PUT https://api.kaviar.com.br/api/admin/feature-flags/passenger_favorites_matching \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"rolloutPercentage":1}'

# Allowlist remains active (highest priority)
```

---

## 6. Escalation

### Severity Levels

**P0 - Critical (Immediate)**
- 5xx error rate > 10%
- Service degradation affecting users
- Data loss or corruption

**Action:** Execute Level 1 rollback immediately, notify on-call engineer

**P1 - High (< 1 hour)**
- Config drift detected
- Determinism failure
- Latency spike > 50%

**Action:** Investigate logs, prepare rollback if needed

**P2 - Medium (< 4 hours)**
- Minor warnings
- 4xx rate increase
- Non-critical alerts

**Action:** Monitor, document, address in next checkpoint

### Contact Points
- **On-Call Engineer:** [To be defined]
- **Product Owner:** [To be defined]
- **DevOps Team:** [To be defined]

---

## 7. Logs & Observability

### CloudWatch Logs
- **Log Group:** `/ecs/kaviar-backend`
- **Filter Pattern:** `feature_key=passenger_favorites_matching`

### Useful Queries
```bash
# Recent checkpoints
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --filter-pattern "Beta Monitor Dog" \
  --start-time $(($(date +%s) * 1000 - 3600000)) \
  --region us-east-1

# Errors
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --filter-pattern "ERROR" \
  --start-time $(($(date +%s) * 1000 - 3600000)) \
  --region us-east-1
```

### Database Queries
```sql
-- Recent checkpoints
SELECT 
  checkpoint_label,
  status,
  created_at,
  (alerts_json::jsonb) as alerts
FROM beta_monitor_checkpoints
WHERE feature_key = 'passenger_favorites_matching'
ORDER BY created_at DESC
LIMIT 10;

-- Failed checkpoints
SELECT * FROM beta_monitor_checkpoints
WHERE feature_key = 'passenger_favorites_matching'
  AND status = 'FAIL'
ORDER BY created_at DESC;
```

---

## 8. Evidence Documents

- **Production Evidence:** `/docs/FEATURE_FLAGS_PROD_EVIDENCE_2026-02-01.md`
- **Beta Phase 1:** `/docs/BETA_PHASE1_2026-02-01.md`
- **Beta Monitor Evidence:** `/docs/BETA_MONITOR_EVIDENCE_2026-02-01.md`

---

## 9. FAQ

**Q: How often does the dog run?**  
A: Hourly via EventBridge schedule. Manual runs available via UI.

**Q: What happens if a checkpoint fails?**  
A: Status=FAIL is recorded, exit code 2, alerts saved. Review alerts_json for details.

**Q: Can ANGEL_VIEWER trigger manual runs?**  
A: No. Only SUPER_ADMIN and OPERATOR roles can trigger manual runs.

**Q: How to disable automatic monitoring?**  
A: Disable EventBridge rule `kaviar-beta-monitor-hourly`.

**Q: Where are credentials stored?**  
A: AWS Secrets Manager. Never in code or logs.

---

**Version:** 1.0  
**Status:** Active  
**Next Review:** 2026-02-02 (T+24h)
