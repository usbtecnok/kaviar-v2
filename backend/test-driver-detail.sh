#!/bin/bash

# Test driver detail endpoint
API="https://api.kaviar.com.br"
DRIVER_ID="f30bc0d9-e7e8-467c-801c-6cf0623d8f0f"

echo "=== Testing Driver Detail Endpoint ==="
echo ""
echo "1. First, get a list of drivers to find valid IDs:"
echo "   curl -sS \"$API/api/admin/drivers?limit=5\" -H \"Authorization: Bearer \$TOKEN\""
echo ""
echo "2. Test with UUID driver ID:"
echo "   curl -sS -i \"$API/api/admin/drivers/$DRIVER_ID\" -H \"Authorization: Bearer \$TOKEN\" | head -n 60"
echo ""
echo "3. Check CloudWatch logs for requestId if 500 error occurs"
echo ""
echo "Expected: 200 OK with driver data OR 404 if driver doesn't exist"
echo "Should NOT return: 500 without stack trace in logs"
