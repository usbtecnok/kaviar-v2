#!/usr/bin/env bash
set -e

FILES=(
  src/modules/admin/ride-service.ts
  src/modules/admin/service.ts
)

# Model names
sed -i 's/rideStatusHistory/ride_status_history/g' "${FILES[@]}"
sed -i 's/rideAdminAction/ride_admin_actions/g' "${FILES[@]}"
sed -i 's/driverVerification/driver_verifications/g' "${FILES[@]}"

# Field names
sed -i 's/approvedAt/approved_at/g' "${FILES[@]}"
sed -i 's/cancelReason/cancel_reason/g' "${FILES[@]}"
sed -i 's/forcedCompletedBy/forced_completed_by/g' "${FILES[@]}"
sed -i 's/forcedCompletedAt/forced_completed_at/g' "${FILES[@]}"

# Prisma client access
sed -i 's/prisma\.ride\b/prisma.rides/g' "${FILES[@]}"
sed -i 's/prisma\.driver\b/prisma.drivers/g' "${FILES[@]}"

echo "✔ snake_case aplicado nos arquivos admin"
