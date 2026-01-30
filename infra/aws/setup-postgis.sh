#!/bin/bash
# Setup PostGIS no RDS (DEVE rodar DENTRO da VPC)
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "🔧 Instalando PostGIS no RDS..."
echo "📍 Conectando em: $RDS_ENDPOINT:$RDS_PORT"
echo ""

# Criar database kaviar
echo "1️⃣ Criando database kaviar..."
PGPASSWORD=$RDS_PASSWORD psql \
  -h $RDS_ENDPOINT \
  -U $RDS_USERNAME \
  -d postgres \
  -c "CREATE DATABASE kaviar;"

echo "✅ Database criada"

# Instalar extensões PostGIS
echo ""
echo "2️⃣ Instalando extensões PostGIS..."
PGPASSWORD=$RDS_PASSWORD psql \
  -h $RDS_ENDPOINT \
  -U $RDS_USERNAME \
  -d kaviar \
  -c "CREATE EXTENSION IF NOT EXISTS postgis;"

PGPASSWORD=$RDS_PASSWORD psql \
  -h $RDS_ENDPOINT \
  -U $RDS_USERNAME \
  -d kaviar \
  -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"

echo "✅ Extensões instaladas"

# Validar instalação
echo ""
echo "3️⃣ Validando PostGIS..."
POSTGIS_VERSION=$(PGPASSWORD=$RDS_PASSWORD psql \
  -h $RDS_ENDPOINT \
  -U $RDS_USERNAME \
  -d kaviar \
  -t -c "SELECT PostGIS_Version();")

echo "✅ PostGIS instalado: $POSTGIS_VERSION"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ POSTGIS CONFIGURADO COM SUCESSO                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
