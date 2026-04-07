# GitHub Actions - Manual Update Required

## Context
The Dockerfile now accepts a `GIT_COMMIT` build argument to expose the git SHA in the `/api/health` endpoint.

## Required Change
Update `.github/workflows/deploy-backend.yml` line 28:

**Before:**
```yaml
docker build -t kaviar-backend:${{ github.sha }} .
```

**After:**
```yaml
docker build --build-arg GIT_COMMIT=${{ github.sha }} -t kaviar-backend:${{ github.sha }} .
```

## Why Manual?
GitHub OAuth token lacks `workflow` scope to update workflow files via push.

## Verification
After the next deployment, check:
```bash
curl https://api.kaviar.com.br/api/health | jq '.version'
```

Should return the git SHA instead of "unknown".

## Related Commit
- Dockerfile update: `1ad7fb6`
