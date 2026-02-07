# PR #3: Community Auto-Activation by Driver Mass

## 🎯 Objetivo

Implementar ativação automática de comunidades baseada na quantidade de motoristas aptos, com histerese para evitar oscilação.

## 🔧 Regras Implementadas

### 1. Critérios de Ativação
- **Ativar**: ≥5 motoristas aptos
- **Desativar**: ≤3 motoristas aptos (histerese)
- **Motorista apto**: `status='approved' AND suspendedAt IS NULL`

### 2. Histerese (Anti-Oscilação)
- Comunidade com 4 motoristas **permanece no estado atual**
- Evita "liga/desliga" constante entre 4-5 motoristas
- Estabilidade operacional garantida

### 3. Proteção de Operações Ativas
- Desativação afeta apenas **novas solicitações** de corrida comunidade
- Corridas em andamento **continuam normalmente** até conclusão
- Não invalida operações já iniciadas

### 4. Auditoria Completa
- Histórico de mudanças em `CommunityStatusHistory`
- Log: `communityId, fromIsActive, toIsActive, driverCount, reason, changedBy, timestamp`
- Rastreabilidade total das ativações/desativações

## 📋 Arquivos Implementados

### Novos Arquivos
- `src/services/community-activation.ts` - Serviço de ativação
- `tests/community-activation.test.ts` - Testes automatizados
- `docs/pr3-community-activation.md` - Esta documentação

### Arquivos Modificados
- `prisma/schema.prisma` - Campos de ativação + tabela de histórico
- `src/modules/admin/service.ts` - Integração com reavaliação automática

## 🗄️ Modelo de Dados

### Community (campos adicionados)
```sql
minActiveDrivers      Int     @default(5)   -- Threshold para ativar
deactivationThreshold Int     @default(3)   -- Threshold para desativar
autoActivation        Boolean @default(true) -- Se deve ativar automaticamente
lastEvaluatedAt       DateTime?             -- Última avaliação
```

### CommunityStatusHistory (nova tabela)
```sql
id           String   @id @default(cuid())
communityId  String   -- FK para Community
fromIsActive Boolean  -- Estado anterior
toIsActive   Boolean  -- Novo estado
driverCount  Int      -- Quantidade de motoristas no momento
reason       String   -- Motivo da mudança
changedBy    String   -- 'system' ou admin ID
createdAt    DateTime -- Timestamp da mudança
```

## 🧪 Como Testar

### Teste Automatizado
```bash
npm test -- community-activation.test.ts
```

### Teste Manual com curl

#### 1. Verificar Status da Comunidade
```bash
# Obter token admin
TOKEN=$(curl -s -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"<ADMIN_PASSWORD>"}' | jq -r '.token')

# Listar comunidades
curl -X GET http://localhost:3001/api/governance/communities \
  -H "Authorization: Bearer $TOKEN"
```

#### 2. Aprovar Motoristas (Trigger de Ativação)
```bash
# Listar motoristas pendentes
curl -X GET "http://localhost:3001/api/admin/drivers?status=pending" \
  -H "Authorization: Bearer $TOKEN"

# Aprovar motorista (reavalia comunidade automaticamente)
curl -X PUT http://localhost:3001/api/admin/drivers/DRIVER_ID/approve \
  -H "Authorization: Bearer $TOKEN"
```

#### 3. Suspender Motorista (Trigger de Desativação)
```bash
curl -X PUT http://localhost:3001/api/admin/drivers/DRIVER_ID/suspend \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Teste de desativação da comunidade"}'
```

## 📊 Cenários de Teste

### Cenário 1: Ativação por Massa Crítica
```bash
# Estado inicial: 0 motoristas, comunidade inativa
# Aprovar 4 motoristas → comunidade permanece inativa
# Aprovar 5º motorista → comunidade ativa automaticamente
```

### Cenário 2: Histerese (Anti-Oscilação)
```bash
# Estado: 5 motoristas, comunidade ativa
# Suspender 1 motorista (4 restantes) → comunidade permanece ativa
# Suspender mais 1 motorista (3 restantes) → comunidade desativa
```

### Cenário 3: Proteção de Operações
```bash
# Comunidade ativa com corridas em andamento
# Desativar comunidade → corridas ativas continuam
# Novas solicitações de corrida comunidade são bloqueadas
```

## 🔍 Logs e Monitoramento

### Log de Ativação
```
🏘️ Community community-123: Inactive → Active (5 drivers)
```

### Log de Desativação
```
🏘️ Community community-123: Active → Inactive (3 drivers)
```

### Consultar Histórico
```sql
SELECT * FROM community_status_history 
WHERE community_id = 'community-123' 
ORDER BY created_at DESC;
```

## ⚙️ Configuração

### Por Comunidade (flexível)
```sql
UPDATE communities SET 
  min_active_drivers = 8,        -- Ativa com 8 motoristas
  deactivation_threshold = 5,    -- Desativa com 5 motoristas
  auto_activation = true         -- Ativação automática habilitada
WHERE id = 'community-123';
```

### Desabilitar Auto-Ativação
```sql
UPDATE communities SET auto_activation = false WHERE id = 'community-123';
```

## 🔄 Integração com Admin Actions

### Reavaliação Automática
- **Aprovar motorista** → `evaluateCommunityActivation()`
- **Suspender motorista** → `evaluateCommunityActivation()`
- **Reativar motorista** → `evaluateCommunityActivation()`

### Batch Processing
```typescript
// Reavaliar todas as comunidades (cron job)
await activationService.evaluateAllCommunities();
```

## ✅ Critérios de Aceite Validados

- ✅ **Ativação automática**: Comunidade ativa quando ≥5 motoristas aptos
- ✅ **Desativação com histerese**: Desativa apenas quando ≤3 motoristas aptos
- ✅ **Reavaliação automática**: Ao aprovar/suspender/reativar motorista
- ✅ **Contagem correta**: Apenas motoristas `approved` e não suspensos
- ✅ **Configuração flexível**: Thresholds configuráveis por comunidade
- ✅ **Auditoria completa**: Histórico de mudanças registrado
- ✅ **Proteção operacional**: Corridas ativas não são afetadas
- ✅ **Anti-oscilação**: Histerese previne liga/desliga constante

## 🚀 Próximos Passos

Este PR estabelece a base para:
- **PR #4**: Geofence e validação de proximidade
- **PR #5**: Sistema de corridas diamante
- **PR #6**: Pontuação e status premium de motoristas

## 🛡️ Considerações de Performance

### Otimizações Implementadas
- Contagem eficiente com índices no `communityId` + `status`
- Transações atômicas para consistência
- Avaliação sob demanda (não polling)
- Cleanup automático de histórico antigo (futuro)

### Monitoramento Recomendado
- Frequência de mudanças de status por comunidade
- Tempo de resposta das avaliações
- Distribuição de motoristas por comunidade

**Status: ✅ PRONTO PARA PRODUÇÃO**
