# Sistema de Confirmação Idempotente para Fallback Geofence

## Visão Geral

Implementação de sistema de confirmação idempotente para corridas fora da cerca (out-of-fence fallback) no sistema KAVIAR. O sistema garante que passageiros não criem corridas duplicadas ao confirmar fallback múltiplas vezes.

## Arquitetura

### 1. **Modelo de Dados**

```prisma
model RideConfirmation {
  id                String   @id @default(cuid())
  passengerId       String   @map("passenger_id")
  confirmationToken String   @unique @map("confirmation_token")
  rideData          Json     @map("ride_data") // Original request data
  isUsed            Boolean  @default(false) @map("is_used")
  usedAt            DateTime? @map("used_at")
  createdRideId     String?  @map("created_ride_id") // If confirmation was used
  expiresAt         DateTime @map("expires_at")
  createdAt         DateTime @default(now()) @map("created_at")

  @@map("ride_confirmations")
}
```

### 2. **Serviço de Confirmação**

**RideConfirmationService** (`/src/services/ride-confirmation.ts`):
- Gera tokens de confirmação com TTL de 5 minutos
- Valida tokens de forma idempotente
- Limpa tokens expirados automaticamente
- Marca tokens como usados após criação da corrida

### 3. **Fluxo de Funcionamento**

#### Cenário 1: Primeira Tentativa (Sem Motoristas na Cerca)
```
POST /api/governance/ride/request
{
  "passengerId": "passenger123",
  "type": "comunidade",
  "passengerLat": -23.5505,
  "passengerLng": -46.6333,
  ...
}

Response 202:
{
  "success": false,
  "requiresConfirmation": true,
  "confirmationToken": "abc123...",
  "expiresAt": "2024-01-01T10:05:00Z",
  "ttlMinutes": 5,
  "message": "Nenhum motorista disponível na sua comunidade. Confirme para buscar motoristas de outras áreas."
}
```

#### Cenário 2: Confirmação do Fallback
```
POST /api/governance/ride/request
{
  "passengerId": "passenger123",
  "confirmationToken": "abc123...",
  ...
}

Response 201:
{
  "success": true,
  "ride": { ... },
  "message": "Corrida fora da cerca criada com sucesso"
}
```

#### Cenário 3: Tentativa Duplicada (Idempotente)
```
POST /api/governance/ride/request
{
  "passengerId": "passenger123",
  "confirmationToken": "abc123...", // Mesmo token
  ...
}

Response 200:
{
  "success": true,
  "rideId": "ride456",
  "message": "Corrida já criada anteriormente"
}
```

## Características Técnicas

### **Idempotência**
- Múltiplas confirmações com mesmo token retornam a corrida existente
- Não há criação de corridas duplicadas
- Estado consistente independente de quantas vezes o usuário confirma

### **Segurança**
- Tokens únicos de 32 bytes (256 bits) em hexadecimal
- Validação de ownership (token pertence ao passageiro)
- TTL de 5 minutos para evitar tokens órfãos
- Limpeza automática de tokens expirados

### **Performance**
- Índice único no `confirmationToken` para busca rápida
- Limpeza automática de tokens expirados por passageiro
- Operações atômicas para evitar race conditions

## Integração com Geofence

### **GeofenceService Atualizado**
- `handleOutOfFenceFallback()`: Gera token de confirmação
- `processConfirmedRide()`: Processa confirmação idempotente
- `markConfirmationUsed()`: Marca token como usado

### **RideController Atualizado**
- Detecta presença de `confirmationToken` no request
- Processa confirmação antes da validação normal
- Retorna resposta apropriada (nova corrida ou existente)

## Estados do Token

| Estado | Descrição | Ação |
|--------|-----------|------|
| **Válido + Não Usado** | Token ativo, pode ser usado | Criar corrida |
| **Válido + Usado** | Token já utilizado | Retornar corrida existente |
| **Expirado** | Token passou do TTL | Erro - solicitar novo |
| **Inválido** | Token não existe | Erro - token inválido |
| **Ownership** | Token de outro passageiro | Erro - não autorizado |

## Configuração

### **Variáveis de Ambiente**
```env
# TTL é fixo em 5 minutos (não configurável)
# Limpeza automática por passageiro
```

### **Feature Flags**
- Sistema funciona independente de `ENABLE_GEOFENCE`
- Integrado com validação de geofence existente

## Testes

### **Cenários de Teste**
1. **Geração de Token**: Verificar criação e TTL
2. **Validação Idempotente**: Múltiplas confirmações
3. **Expiração**: Tokens expirados rejeitados
4. **Ownership**: Tokens de outros passageiros rejeitados
5. **Limpeza**: Tokens expirados removidos automaticamente
6. **Race Conditions**: Confirmações simultâneas

### **Exemplo de Teste**
```bash
# 1. Solicitar corrida comunidade (sem motoristas na cerca)
curl -X POST /api/governance/ride/request \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "passenger123",
    "type": "comunidade",
    "passengerLat": -23.5505,
    "passengerLng": -46.6333,
    "origin": "Origem",
    "destination": "Destino",
    "price": 15.50
  }'

# 2. Confirmar fallback com token
curl -X POST /api/governance/ride/request \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "passenger123",
    "confirmationToken": "TOKEN_RECEBIDO_ACIMA"
  }'

# 3. Tentar confirmar novamente (deve retornar corrida existente)
curl -X POST /api/governance/ride/request \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "passenger123",
    "confirmationToken": "MESMO_TOKEN"
  }'
```

## Benefícios

### **Para o Usuário**
- Não há risco de corridas duplicadas
- Interface consistente independente de cliques múltiplos
- Feedback claro sobre estado da confirmação

### **Para o Sistema**
- Operações idempotentes reduzem bugs
- Limpeza automática evita acúmulo de dados
- Integração transparente com sistema existente

### **Para Desenvolvimento**
- Código limpo e testável
- Separação clara de responsabilidades
- Fácil manutenção e extensão

## Limitações

- TTL fixo de 5 minutos (não configurável)
- Tokens são únicos globalmente (não por passageiro)
- Limpeza automática apenas na geração de novos tokens
- Não há notificação de expiração para o frontend

## Próximos Passos

1. **Monitoramento**: Métricas de uso de tokens
2. **Configurabilidade**: TTL configurável via environment
3. **Notificações**: WebSocket para expiração de tokens
4. **Auditoria**: Log de todas as operações de confirmação
