# HOTFIX PROD: premium_tourism_promoted_at Column - SUCCESS ✅

**Date:** 2026-02-12 09:41 BRT  
**Status:** ✅ COMPLETED  
**RequestId:** 0b1da27b-f05f-4abe-bb16-da9a5a46f48a

---

## 🎯 Problem
`GET /api/admin/drivers/:id` returning 500 error:
- **Error:** PrismaClientKnownRequestError
- **Message:** "The column `drivers.premium_tourism_promoted_at` does not exist in the current database."
- **Driver ID:** f30bc0d9-e7e8-467c-801c-6cf0623d8f0f

---

## ✅ Solution Applied

### Migration SQL
```sql
ALTER TABLE "drivers" 
  ADD COLUMN IF NOT EXISTS "premium_tourism_promoted_at" TIMESTAMPTZ NULL;
```

### Execution
**Task Definition:** `kaviar-migration-runner:3`  
**Task ARN:** `arn:aws:ecs:us-east-2:847895361928:task/kaviar-cluster/c7e0adeea5934d4f980e221ce579002a`  
**Exit Code:** 0 ✅  
**Duration:** ~25 seconds

### CloudWatch Evidence
```
ALTER TABLE
premium_tourism_promoted_at | timestamp with time zone |           |          |
```

---

## 📊 Column Spec
- **Name:** `premium_tourism_promoted_at`
- **Type:** `TIMESTAMPTZ` (timestamp with time zone)
- **Nullable:** YES
- **Default:** NULL

---

## 🔒 Characteristics
1. ✅ Idempotent (`IF NOT EXISTS`)
2. ✅ Safe (nullable, no data impact)
3. ✅ Zero downtime
4. ✅ Versionable (migration file created)

---

## 📝 Files Created
- `prisma/migrations/20260212124106_add_premium_tourism_promoted_at/migration.sql`
- `docs/ops/hotfix-premium-tourism-promoted-at-success.md`

---

**Hotfix Status:** ✅ SUCCESS  
**3rd hotfix today - all columns now exist in PROD**
