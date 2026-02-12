# HOTFIX PROD: active_since Column - SUCCESS ✅

**Date:** 2026-02-12 09:20 BRT  
**Status:** ✅ COMPLETED

---

## 🎯 Problem
`GET /api/admin/drivers/:id` returning 500 error:
- **Error:** PrismaClientKnownRequestError
- **Message:** "The column `drivers.active_since` does not exist in the current database."
- **Request ID:** `aace99c4-a2c3-447b-b7d1-f9cc56e939c0`
- **Driver ID:** `f30bc0d9-e7e8-467c-801c-6cf0623d8f0f`

---

## ✅ Solution Applied

### Migration SQL
```sql
ALTER TABLE "drivers" 
  ADD COLUMN IF NOT EXISTS "active_since" TIMESTAMPTZ NULL;
```

### Execution Method: ECS Run-Task (Plano B)

**Why Plano B?**
- `ecs execute-command` requires interactive mode (not suitable for automation)
- Container doesn't have `psql` installed
- Run-task with postgres:16-alpine image is cleaner and idempotent

**Task Definition:** `kaviar-migration-runner:1`
- Image: `postgres:16-alpine`
- CPU: 256
- Memory: 512
- Network: Same VPC/subnet/security-group as backend
- Command: Execute ALTER TABLE + verify with `\d drivers`

**Execution:**
```bash
Task ARN: arn:aws:ecs:us-east-2:847895361928:task/kaviar-cluster/126b6442191a4373be103d8f787a7003
Exit Code: 0
Duration: ~24 seconds
```

**CloudWatch Logs:**
```
ALTER TABLE
active_since | timestamp with time zone |           |          |
```

---

## 🧪 Validation

### 1. Column Created Successfully
✅ CloudWatch logs confirm column exists with correct type (`timestamptz`)

### 2. Test Endpoint (Next Step)
```bash
curl -sS -i "https://api.kaviar.com.br/api/admin/drivers/f30bc0d9-e7e8-467c-801c-6cf0623d8f0f" \
  -H "Authorization: Bearer $TOKEN" | head -n 80
```

**Expected:** 200 OK with driver data (no more Prisma error)

---

## 📊 Technical Details

### Network Configuration
- **Cluster:** kaviar-cluster
- **Security Group:** sg-0a54bc7272cae4623
- **Subnets:** subnet-01a498f7b4f3fcff5, subnet-046613642f742faa2
- **Public IP:** Enabled (for pulling postgres image)

### Database
- **Host:** kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com
- **Port:** 5432
- **Database:** kaviar
- **SSL:** Required

### Column Spec
- **Name:** `active_since`
- **Type:** `TIMESTAMPTZ` (timestamp with time zone)
- **Nullable:** YES
- **Default:** NULL

---

## 🔒 Why This Approach is Clean

1. **Idempotent:** `IF NOT EXISTS` prevents errors on re-run
2. **Minimal:** Single column addition, no data migration
3. **Safe:** Nullable column, no risk to existing data
4. **Versionable:** Can generate formal migration later when dev env is healthy
5. **No Frankenstein:** Avoids `prisma migrate dev` issues with shadow DB

---

## 📝 Files Created

- `migration-runner-task-def.json` - ECS task definition
- `hotfix-active-since.sh` - Helper script (not used, kept for reference)
- `docs/ops/hotfix-active-since-success.md` - This document

---

## 🚀 Next Steps

1. ✅ Column created in PROD
2. ⏳ Test driver detail endpoint
3. ⏳ Verify no more Prisma errors in CloudWatch
4. ⏳ Create formal migration file when dev environment is fixed
5. ⏳ Document in schema.prisma comments

---

**Hotfix Status:** ✅ SUCCESS  
**Production Impact:** ZERO (nullable column, no downtime)  
**Rollback:** Not needed (idempotent, safe change)
