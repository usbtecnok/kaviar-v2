#!/bin/bash

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
EVIDENCE_DIR="../../docs/evidencias/staging-driver-pwa-${TIMESTAMP}"

mkdir -p "$EVIDENCE_DIR"

echo "📸 Gerando evidências em: $EVIDENCE_DIR"

cat > "$EVIDENCE_DIR/README.md" << 'EOF'
# Evidências - Driver PWA MVP

## Fluxo Testado
1. Login driver
2. Toggle Online/Offline
3. GPS ping automático
4. Receber offers via SSE
5. Accept offer

## Arquivos
- `app-logs.txt` - Logs do console do app
- `network-trace.har` - Trace de rede (se capturado)
- `screenshots/` - Prints de tela
- `cloudwatch-queries.txt` - Queries para validar no CloudWatch

## Como Validar

### CloudWatch Logs
```bash
# Login events
aws logs filter-log-events \
  --log-group-name /aws/lambda/kaviar-auth \
  --filter-pattern "driver/login" \
  --start-time $(date -d '5 minutes ago' +%s)000

# GPS updates
aws logs filter-log-events \
  --log-group-name /aws/lambda/kaviar-driver \
  --filter-pattern "location" \
  --start-time $(date -d '5 minutes ago' +%s)000

# Offer accepts
aws logs filter-log-events \
  --log-group-name /aws/lambda/kaviar-driver \
  --filter-pattern "offer/accept" \
  --start-time $(date -d '5 minutes ago' +%s)000
```

### DynamoDB
```bash
# Verificar status do driver
aws dynamodb get-item \
  --table-name kaviar-drivers-staging \
  --key '{"id": {"S": "DRIVER_ID"}}'

# Verificar offers aceitas
aws dynamodb query \
  --table-name kaviar-rides-staging \
  --index-name driver-index \
  --key-condition-expression "driverId = :did" \
  --expression-attribute-values '{":did": {"S": "DRIVER_ID"}}'
```
EOF

cat > "$EVIDENCE_DIR/cloudwatch-queries.txt" << 'EOF'
# CloudWatch Insights Queries

## 1. Login Events (últimos 15min)
fields @timestamp, @message
| filter @message like /driver\/login/
| sort @timestamp desc
| limit 20

## 2. GPS Updates
fields @timestamp, body.lat, body.lng
| filter @message like /location/
| sort @timestamp desc
| limit 50

## 3. Offer Accepts
fields @timestamp, offerId, driverId, status
| filter @message like /offer.*accept/
| sort @timestamp desc
| limit 20

## 4. SSE Connections
fields @timestamp, @message
| filter @message like /realtime/
| sort @timestamp desc
| limit 20
EOF

cat > "$EVIDENCE_DIR/test-checklist.md" << 'EOF'
# Test Checklist

## Pre-requisitos
- [ ] Backend staging rodando
- [ ] Credenciais de driver válidas
- [ ] Browser com DevTools aberto

## Testes

### 1. Login
- [ ] Abrir app em http://localhost:5173
- [ ] Inserir email/password
- [ ] Verificar token salvo no localStorage
- [ ] Verificar log "✓ Login success"

### 2. GPS
- [ ] Permitir acesso à localização
- [ ] Verificar coordenadas exibidas
- [ ] Aguardar 10s e verificar log "✓ GPS sent"
- [ ] Repetir 3x para confirmar intervalo

### 3. Online/Offline
- [ ] Clicar em "OFFLINE" → deve ficar "ONLINE" (verde)
- [ ] Verificar log "✓ Status: ONLINE"
- [ ] Clicar novamente → deve voltar "OFFLINE" (vermelho)

### 4. SSE Offers
- [ ] Colocar driver ONLINE
- [ ] Criar offer no sistema (via admin ou API)
- [ ] Verificar log "✓ Offer received"
- [ ] Verificar card de offer apareceu

### 5. Accept Offer
- [ ] Clicar em "Accept" no card
- [ ] Verificar log "✓ Accepted offer"
- [ ] Verificar card desapareceu
- [ ] Validar no CloudWatch/DB

## Evidências Coletadas
- [ ] Screenshot do login
- [ ] Screenshot do GPS funcionando
- [ ] Screenshot de offer recebida
- [ ] Screenshot de offer aceita
- [ ] Logs do console (copiar para app-logs.txt)
- [ ] Network HAR export (opcional)
EOF

mkdir -p "$EVIDENCE_DIR/screenshots"

echo "✅ Estrutura de evidências criada!"
echo ""
echo "📋 Próximos passos:"
echo "1. npm run dev"
echo "2. Abrir http://localhost:5173"
echo "3. Seguir test-checklist.md"
echo "4. Salvar screenshots em $EVIDENCE_DIR/screenshots/"
echo "5. Copiar logs do console para $EVIDENCE_DIR/app-logs.txt"
