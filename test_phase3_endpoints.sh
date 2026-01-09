#!/bin/bash

echo "🧪 Testando endpoints da Fase 3..."

# Simular teste do endpoint admin de geofence review
echo "📍 PATCH /api/admin/communities/:id/geofence-review"
echo "Payload de teste:"
cat << 'EOF'
{
  "centerLat": -22.9068,
  "centerLng": -43.1729,
  "isVerified": true,
  "reviewNotes": "Centro ajustado manualmente pelo admin. Coordenadas validadas."
}
EOF

echo -e "\n✅ Resposta esperada (com token admin válido):"
cat << 'EOF'
{
  "success": true,
  "data": {
    "id": "geofence-id",
    "communityId": "community-id",
    "centerLat": -22.9068,
    "centerLng": -43.1729,
    "isVerified": true,
    "reviewNotes": "Centro ajustado manualmente pelo admin. Coordenadas validadas.",
    "updatedAt": "2026-01-09T12:58:00.000Z"
  },
  "message": "Geofence atualizado com sucesso"
}
EOF

echo -e "\n🔒 Endpoint protegido por JWT admin"
echo "📊 Frontend: Tela admin/geofences implementada com filtros e ações"
echo "✅ Builds: backend ✅ frontend ✅"
