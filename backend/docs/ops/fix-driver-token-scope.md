# Fix: Driver Token Scope Detection

**Date**: 2026-02-12  
**Issue**: Driver token not being sent in Authorization header for `/api/driver/*` endpoints

## Problem

The API client's `getTokenScope()` function only detected driver scope for URLs containing `/api/drivers/` (plural), but the driver onboarding endpoint is `/api/driver/onboarding` (singular).

This caused:
- Driver onboarding requests to be treated as "passenger" scope
- Wrong token key lookup (`kaviar_token` instead of `kaviar_driver_token`)
- Missing Authorization header in driver-related requests

## Root Cause

```javascript
// ❌ Before - only matched plural
const getTokenScope = (url) => {
  if (url?.includes('/api/drivers/')) return 'driver';
  if (url?.includes('/api/admin/')) return 'admin';
  return 'passenger';
};
```

This missed:
- `/api/driver/onboarding` (singular)
- `/api/auth/driver/login` (auth route, but good to detect scope)

## Solution

```javascript
// ✅ After - matches both singular and plural
const getTokenScope = (url) => {
  if (url?.includes('/api/driver')) return 'driver'; // Covers /api/driver/* and /api/drivers/*
  if (url?.includes('/api/admin/')) return 'admin';
  return 'passenger';
};
```

## Driver Onboarding Flow

### 1. Registration (CompleteOnboarding.jsx)
```javascript
// Step 1: Create driver account (public endpoint, no auth)
const response = await fetch('/api/driver/onboarding', {
  method: 'POST',
  body: JSON.stringify({ name, email, password, neighborhoodId })
});

// Step 2: Auto-login to get token
const loginResponse = await api.post('/api/auth/driver/login', {
  email, password
});

// Step 3: Save token
localStorage.setItem('kaviar_driver_token', loginResponse.data.token);
localStorage.setItem('kaviar_driver_data', JSON.stringify(loginResponse.data.user));
```

### 2. Token Usage (api/index.js)
```javascript
// Interceptor detects scope and injects correct token
if (url.includes('/api/driver')) {
  token = localStorage.getItem('kaviar_driver_token');
  config.headers.Authorization = `Bearer ${token}`;
}
```

## Token Storage Keys

| User Type | Storage Key | Endpoints |
|-----------|-------------|-----------|
| Passenger | `kaviar_token` | `/api/passengers/*`, `/api/trips/*` |
| Driver | `kaviar_driver_token` | `/api/driver/*`, `/api/drivers/*` |
| Admin | `kaviar_admin_token` | `/api/admin/*`, `/api/governance/*` |

## Verification

### Browser Console
```
[API] Auth route - NO token: POST /api/auth/driver/login
[API] ✅ Request: POST /api/driver/onboarding { scope: 'driver', storageKey: 'kaviar_driver_token', hasToken: false }
[API] ✅ Request: GET /api/drivers/me { scope: 'driver', storageKey: 'kaviar_driver_token', hasToken: true }
```

### localStorage
```javascript
localStorage.getItem('kaviar_driver_token') // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
localStorage.getItem('kaviar_driver_data')  // '{"id":"driver-123","name":"João",...}'
```

### Network Tab
```
GET /api/drivers/me/compliance/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Files Modified

- `frontend-app/src/api/index.js` - Fixed `getTokenScope()` to match `/api/driver` (singular)

## Related Fixes

- Previous: Driver onboarding separation (commit 69297df) - Created public `/api/driver/onboarding` endpoint
- Previous: Neighborhoods token auth (commit d63ebe1) - Fixed admin pages to use api client
- This fix: Ensures driver scope is correctly detected for all driver endpoints
