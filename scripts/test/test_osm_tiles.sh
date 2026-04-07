#!/bin/bash

echo "🌐 Testando conectividade com tiles OpenStreetMap..."

# Testar diferentes servidores de tiles OSM
TILE_SERVERS=(
  "https://a.tile.openstreetmap.org/10/512/512.png"
  "https://b.tile.openstreetmap.org/10/512/512.png" 
  "https://c.tile.openstreetmap.org/10/512/512.png"
)

for server in "${TILE_SERVERS[@]}"; do
  echo "Testando: $server"
  
  response=$(curl -s -o /dev/null -w "%{http_code}" "$server")
  
  if [ "$response" = "200" ]; then
    echo "✅ $server - OK (200)"
  elif [ "$response" = "403" ]; then
    echo "❌ $server - BLOQUEADO (403) - Possível rate limit ou bloqueio de IP"
  elif [ "$response" = "429" ]; then
    echo "❌ $server - RATE LIMIT (429) - Muitas requisições"
  else
    echo "⚠️  $server - Status: $response"
  fi
done

echo ""
echo "🔍 Testando tile específico do Rio de Janeiro (zoom 15)..."
RJ_TILE="https://a.tile.openstreetmap.org/15/16384/12288.png"
response=$(curl -s -o /dev/null -w "%{http_code}" "$RJ_TILE")

if [ "$response" = "200" ]; then
  echo "✅ Tile RJ - OK (200)"
else
  echo "❌ Tile RJ - Status: $response"
fi

echo ""
echo "📊 Resumo:"
echo "- Se todos retornarem 200: Tiles OK, problema pode ser no frontend"
echo "- Se retornarem 403/429: Bloqueio de IP ou rate limit"
echo "- Verificar Network tab no browser para confirmar requests"
