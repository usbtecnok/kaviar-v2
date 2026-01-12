#!/bin/bash

# Desabilitar arquivos legados problemáticos
echo "Desabilitando arquivos legados..."

# Lista de arquivos para desabilitar
LEGACY_FILES=(
  "src/controllers/community.ts"
  "src/controllers/geofence.ts"
  "src/services/community-activation.ts"
  "src/services/diamond.ts"
  "src/services/driver-enforcement.ts"
  "src/services/driver-verification.ts"
  "src/services/geofence.ts"
  "src/services/premium-tourism.ts"
  "src/services/rating.ts"
  "src/services/ride-confirmation.ts"
  "src/utils/geofence-validator.ts"
  "src/routes/admin-geofence.ts"
  "src/routes/admin-management.ts"
  "src/routes/admin.ts"
  "src/routes/elderly.ts"
  "src/routes/governance.ts"
  "src/routes/password-reset.ts"
  "src/routes/user-auth.ts"
  "src/modules/admin/dashboard-service.ts"
  "src/modules/admin/ride-service.ts"
  "src/modules/admin/service.ts"
  "src/modules/auth/service.ts"
  "src/modules/governance/ride-controller.ts"
  "src/modules/governance/ride-service.ts"
  "src/middlewares/auth.ts"
)

# Renomear arquivos para .ts.disabled
for file in "${LEGACY_FILES[@]}"; do
  if [ -f "$file" ]; then
    mv "$file" "${file}.disabled"
    echo "Desabilitado: $file"
  fi
done

echo "Arquivos legados desabilitados!"
