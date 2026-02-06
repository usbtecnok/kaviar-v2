# Scripts de Validação - Sistema de Território Kaviar

Scripts para validação do sistema de território com coordenadas reais obtidas via PostGIS.

## Região AWS
Todos os scripts usam **us-east-2** (fixo).

## Pré-requisitos
- AWS CLI configurado
- `jq` instalado
- Acesso SSM ao EC2 backend (i-0e2e0c435c0e1e5e5)
- Secrets Manager: `kaviar-prod-db-password`

## Scripts Disponíveis

### 1. test_neighborhoods_smart.sh
Testa endpoint `/api/neighborhoods/smart-list` com detecção automática via GPS.

**Execução:**
```bash
./scripts/test_neighborhoods_smart.sh
```

**O que faz:**
1. Obtém coordenadas reais de Zumbi via `ST_PointOnSurface`
2. Testa detecção automática (GPS dentro de geofence)
3. Testa lista sem GPS (fallback)

**Saída esperada:**
```json
{
  "detected": {
    "id": "uuid",
    "name": "Zumbi",
    "hasGeofence": true,
    "minFee": 7,
    "maxFee": 20
  },
  "nearby": []
}
```

### 2. validate_territory_fee.sh
Valida sistema completo de cálculo de taxa baseado em território.

**Execução:**
```bash
./scripts/validate_territory_fee.sh
```

**O que faz:**
1. Obtém coordenadas reais via `ST_PointOnSurface` de:
   - Zumbi (mesmo bairro)
   - Del Castilho (adjacente)
   - Acari (fora da cerca)
2. Testa 3 cenários de fee:
   - **SAME_NEIGHBORHOOD**: 7%
   - **ADJACENT_NEIGHBORHOOD**: 12%
   - **OUTSIDE_FENCE**: 20%

**Saída esperada:**
```
✅ TODOS OS CENÁRIOS PASSARAM
Cenário A (SAME): 7% (esperado 7%)
Cenário B (ADJACENT): 12% (esperado 12%)
Cenário C (OUTSIDE): 20% (esperado 20%)
```

## Comandos Úteis

### Testar endpoint manualmente
```bash
# Com GPS (detecção automática)
curl -s "https://api.kaviar.com.br/api/neighborhoods/smart-list?lat=-22.8857&lng=-43.2994" | \
  jq '{detected: .data.detected, nearby: (.data.nearby[0:5])}'

# Sem GPS (lista completa)
curl -s "https://api.kaviar.com.br/api/neighborhoods/smart-list" | \
  jq '{detected: .data.detected, nearby: .data.nearby, all: (.data.all[0:5])}'
```

### Obter coordenadas de um bairro
```bash
aws ssm send-command \
  --region us-east-2 \
  --instance-ids i-0e2e0c435c0e1e5e5 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "export PGPASSWORD=$(aws secretsmanager get-secret-value --region us-east-2 --secret-id kaviar-prod-db-password --query SecretString --output text)",
    "psql -h kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com -U kaviar_admin -d kaviar -t -c \"SELECT ST_Y(ST_PointOnSurface(ng.geom)) as lat, ST_X(ST_PointOnSurface(ng.geom)) as lng FROM neighborhood_geofences ng INNER JOIN neighborhoods n ON n.id = ng.neighborhood_id WHERE n.name = '\''Zumbi'\'' LIMIT 1;\""
  ]'
```

## Arquitetura

### Detecção de Território
- **Service**: `backend/src/services/territory-service.ts`
- **Função**: `detectTerritoryFromGPS(lat, lng)`
- **Método**: PostGIS `ST_Contains` para verificar se ponto está dentro do geofence

### Endpoint Smart List
- **Rota**: `GET /api/neighborhoods/smart-list`
- **Params**: `?lat=X&lng=Y` (opcional)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "detected": {...},  // Bairro detectado via GPS
      "nearby": [...],    // Bairros próximos (se não detectado)
      "all": [...]        // Todos os bairros ativos
    }
  }
  ```

### Cálculo de Taxa
- **Rota**: `POST /api/trips/estimate-fee`
- **Lógica**: 
  - 7% se pickup/dropoff no mesmo bairro do motorista
  - 12% se adjacente (ST_Touches)
  - 20% se fora da cerca

## Segurança
- ✅ Sem credenciais hardcoded
- ✅ Usa Secrets Manager para senha do banco
- ✅ Região fixa (us-east-2)
- ✅ Comandos SSM com audit trail

## Troubleshooting

### Erro: "Command not found"
```bash
chmod +x ./scripts/*.sh
```

### Erro: "jq: command not found"
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq
```

### Erro: "Access Denied" no SSM
Verificar IAM role do EC2 tem permissão `ssm:SendCommand`.

### Coordenadas retornam vazias
Verificar se bairro tem geofence:
```sql
SELECT n.name, ng.id 
FROM neighborhoods n 
LEFT JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id 
WHERE n.name = 'Zumbi';
```
