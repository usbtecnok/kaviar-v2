# Fix: Driver Detail 500 Error - Structured Logging

**Date:** 2026-02-12 08:58 BRT  
**Commit:** `8bf9bb1`  
**Status:** ✅ DEPLOYED TO PROD

---

## 🐛 Bug Report

**Endpoint:** `GET /api/admin/drivers/:id`  
**Error:** 500 "Erro ao buscar motorista"  
**Request ID:** `aace99c4-a2c3-447b-b7d1-f9cc56e939c0`  
**Driver ID:** `f30bc0d9-e7e8-467c-801c-6cf0623d8f0f`

### Evidence
- ✅ `GET /api/admin/drivers?limit=5` works (200)
- ❌ `GET /api/admin/drivers/f30bc0d9-e7e8-467c-801c-6cf0623d8f0f` returns 500
- ✅ `GET /api/admin/rides/audit` works (200)
- ✅ ECS deployment successful

---

## 🔧 Fix Applied

### 1. Added Structured Error Logging

**Before:**
```typescript
} catch (error) {
  console.error('Error getting driver:', error);
  res.status(500).json({
    success: false,
    error: 'Erro ao buscar motorista'
  });
}
```

**After:**
```typescript
} catch (error: any) {
  // Log estruturado com stack + requestId
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'error',
    requestId,
    path: req.path,
    driverId: req.params.id,
    error: error?.message || String(error),
    stack: error?.stack
  }));
  
  res.status(500).json({
    success: false,
    error: 'Erro ao buscar motorista',
    requestId
  });
}
```

### 2. Added RequestId Capture

```typescript
const requestId = (req as any).requestId || req.headers['x-request-id'] || 'unknown';
```

### 3. Include RequestId in Responses

- 404 responses now include `requestId`
- 500 responses now include `requestId`

---

## 🔍 Investigation Steps

### Step 1: Reproduce Error in PROD

```bash
# Get admin token
TOKEN=$(curl -sS https://api.kaviar.com.br/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' | jq -r '.token')

# Test with problematic driver ID
curl -sS -i "https://api.kaviar.com.br/api/admin/drivers/f30bc0d9-e7e8-467c-801c-6cf0623d8f0f" \
  -H "Authorization: Bearer $TOKEN" | head -n 60
```

### Step 2: Check CloudWatch Logs

If 500 error occurs, the structured log will now show:
- `requestId` - For correlation
- `driverId` - The ID that caused the error
- `error` - Error message
- `stack` - Full stack trace

**Query:**
```
fields @timestamp, @message
| filter @message like /error/
| filter @message like /f30bc0d9-e7e8-467c-801c-6cf0623d8f0f/
| sort @timestamp desc
| limit 20
```

### Step 3: Analyze Possible Causes

#### A. Prisma Relation Error
The query includes:
```typescript
include: {
  driver_consents: true,      // 1:1 relation (optional)
  neighborhoods: { ... },      // Many-to-one
  communities: { ... }         // Many-to-one
}
```

**Possible issues:**
- `driver_consents` table doesn't exist
- Foreign key constraint violation
- Column mismatch in migration

#### B. Data Type Error
- Driver has invalid data in a field
- Decimal precision issue with lat/lng
- Boolean field stored as string

#### C. Database Connection
- Connection pool exhausted
- Query timeout
- Database unreachable

---

## 🧪 Validation Tests

### Test 1: List Drivers (Should Work)
```bash
curl -sS "https://api.kaviar.com.br/api/admin/drivers?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[].id'
```

### Test 2: Get Driver by UUID
```bash
curl -sS "https://api.kaviar.com.br/api/admin/drivers/f30bc0d9-e7e8-467c-801c-6cf0623d8f0f" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:**
- 200 OK with driver data
- OR 404 if driver doesn't exist
- OR 500 with requestId and stack trace in CloudWatch

### Test 3: Get Driver by Legacy ID Format
```bash
# If list returns "driver-<timestamp>" format
curl -sS "https://api.kaviar.com.br/api/admin/drivers/driver-1234567890" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 📊 Schema Validation

### Driver Model Relations
```prisma
model drivers {
  driver_consents  driver_consents?  // Optional 1:1
  neighborhoods    neighborhoods?    // Optional many-to-one
  communities      communities?      // Optional many-to-one
}
```

All relations are **optional** (`?`), so missing data should return `null`, not throw error.

### Potential Migration Issues

Check if these tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('driver_consents', 'neighborhoods', 'communities');
```

---

## 🎯 Next Steps

1. ✅ Deploy with structured logging (DONE)
2. ⏳ Reproduce error in PROD with curl
3. ⏳ Check CloudWatch for stack trace
4. ⏳ Identify root cause from stack trace
5. ⏳ Apply specific fix based on root cause

---

## 📝 Notes

- The endpoint accepts UUID and legacy "driver-<timestamp>" formats
- The query uses `findFirst` with `OR` conditions (id, email, phone)
- All Prisma relations are optional, so missing data shouldn't cause 500
- If error persists, check database schema vs Prisma schema alignment

---

**Status:** Waiting for error reproduction with new logging to identify root cause.
