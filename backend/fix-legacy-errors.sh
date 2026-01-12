#!/bin/bash

# Script para corrigir erros de compilação legados
# Substitui nomes de tabelas Prisma desatualizados

echo "Corrigindo nomes de tabelas Prisma..."

# Substituições básicas de nomes de tabelas
find src -name "*.ts" -type f -exec sed -i 's/prisma\.admin\./prisma.admins./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.driver\./prisma.drivers./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.passenger\./prisma.passengers./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.ride\./prisma.rides./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.community\./prisma.communities./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.neighborhood\./prisma.neighborhoods./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.role\./prisma.roles./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.rating\./prisma.ratings./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.consent\./prisma.consents./g' {} \;

# Substituições de nomes compostos
find src -name "*.ts" -type f -exec sed -i 's/prisma\.elderlyProfile\./prisma.elderly_profiles./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.elderlyContract\./prisma.elderly_contracts./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.touristGuide\./prisma.tourist_guides./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.tourPackage\./prisma.tour_packages./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.tourBooking\./prisma.tour_bookings./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.userConsent\./prisma.user_consents./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.rideConfirmation\./prisma.ride_confirmations./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.rideStatusHistory\./prisma.ride_status_history./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.rideAdminAction\./prisma.ride_admin_actions./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.driverVerification\./prisma.driver_verifications./g' {} \;
find src -name "\.ts" -type f -exec sed -i 's/prisma\.driverDocument\./prisma.driver_documents./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.driverEnforcementHistory\./prisma.driver_enforcement_history./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.ratingStats\./prisma.rating_stats./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.diamondAuditLog\./prisma.diamond_audit_logs./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.communityGeofence\./prisma.community_geofences./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.neighborhoodGeofence\./prisma.neighborhood_geofences./g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/prisma\.communityStatusHistory\./prisma.community_status_history./g' {} \;

# Substituições de campos de data
find src -name "*.ts" -type f -exec sed -i 's/createdAt:/created_at:/g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/updatedAt:/updated_at:/g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/\.createdAt/.created_at/g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/\.updatedAt/.updated_at/g' {} \;

echo "Correções aplicadas!"
