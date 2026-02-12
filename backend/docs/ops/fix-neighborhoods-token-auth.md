# Fix: Neighborhoods Token Authentication

**Date**: 2026-02-12  
**Issue**: "Token ausente" error when accessing neighborhoods pages in admin panel

## Problem

Admin pages for neighborhoods and communities were using raw `fetch()` calls without Authorization headers, causing 401 errors when accessing `/api/governance/*` endpoints that require admin authentication.

### Root Cause

1. `/api/governance/neighborhoods` and `/api/governance/communities` require admin auth (`authenticateAdmin` + `requireRole`)
2. Frontend pages used raw `fetch()` instead of the `api` axios instance
3. The axios interceptor that adds Authorization headers only works with the `api` instance
4. Result: Requests sent without Bearer token → 401 Unauthorized → "Token ausente"

## Solution

### 1. Fixed Pages to Use API Client

Replaced raw `fetch()` with `api` axios instance in:

- `frontend-app/src/pages/admin/NeighborhoodsByCity.jsx`
- `frontend-app/src/pages/admin/NeighborhoodsManagement.jsx`
- `frontend-app/src/pages/admin/CommunitiesManagement.jsx`
- `frontend-app/src/pages/admin/GeofenceManagement.jsx`

**Before**:
```javascript
const response = await fetch(`${API_BASE_URL}/api/governance/neighborhoods`);
const data = await response.json();
```

**After**:
```javascript
const response = await api.get('/api/governance/neighborhoods');
// response.data already contains the JSON
```

### 2. Enhanced API Client Logging

Added detailed logging to `frontend-app/src/api/index.js`:

```javascript
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
  console.log('[API] ✅ Request:', method, url, { scope, storageKey, hasToken: true });
} else {
  console.warn('[API] ⚠️ Request WITHOUT token:', method, url, { scope, storageKey, hasToken: false });
}
```

Now shows:
- Which storage key is being read (`kaviar_admin_token`, `kaviar_driver_token`, `kaviar_token`)
- Whether token was found
- Request scope (admin/driver/passenger)

### 3. Better Error Handling

Added 401-specific error messages:

```javascript
catch (err) {
  if (err.response?.status === 401) {
    setError('Token ausente ou inválido. Faça login novamente.');
  } else {
    setError('Erro de conexão com o servidor');
  }
}
```

## Token Storage Keys

| Scope | Storage Key | Used For |
|-------|-------------|----------|
| Passenger | `kaviar_token` | `/api/passengers/*`, `/api/trips/*` |
| Driver | `kaviar_driver_token` | `/api/drivers/*` |
| Admin | `kaviar_admin_token` | `/api/admin/*`, `/api/governance/*` |

## Verification

After fix, browser console should show:

```
[API] ✅ Request: GET /api/governance/neighborhoods { scope: 'admin', storageKey: 'kaviar_admin_token', hasToken: true }
```

Network tab should show:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Files Modified

- `frontend-app/src/api/index.js` - Enhanced logging
- `frontend-app/src/pages/admin/NeighborhoodsByCity.jsx` - Use api client
- `frontend-app/src/pages/admin/NeighborhoodsManagement.jsx` - Use api client
- `frontend-app/src/pages/admin/CommunitiesManagement.jsx` - Use api client
- `frontend-app/src/pages/admin/GeofenceManagement.jsx` - Use api client

## Related Issues

- Driver onboarding separation (commit 69297df) - Fixed passenger token being sent to driver registration
- This fix ensures admin token is properly sent to governance endpoints
