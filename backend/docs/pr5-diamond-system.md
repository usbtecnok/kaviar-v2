# PR #5 - Sistema Diamond (Bônus com "Morre ao Cancelar")

## Visão Geral

Implementação do sistema de bônus Diamond para corridas comunidade no KAVIAR. O sistema incentiva motoristas a não cancelarem corridas através de um bônus que é perdido permanentemente se o motorista candidato cancelar.

## Regra Central: "Dies on Cancel"

Uma corrida é **DIAMOND** enquanto ela **AINDA NÃO FOI cancelada** por nenhum motorista que a aceitou. No momento em que um motorista aceita e depois cancela, essa corrida perde o diamante permanentemente.

## Arquitetura

### **Feature Flag**
```env
ENABLE_DIAMOND=false  # Default OFF
```

### **Single Source of Truth**
- `DiamondService` (`/src/services/diamond.ts`) - Toda lógica centralizada
- Integração mínima nos demais services

### **Estados do Diamond**
```typescript
enum DiamondState {
  ELIGIBLE = 'ELIGIBLE',                    // Elegível para bônus
  LOST_BY_DRIVER_CANCEL = 'LOST_BY_DRIVER_CANCEL',  // Perdeu por cancelamento
  EARNED = 'EARNED'                         // Bônus conquistado
}
```

## Fluxo de Estados

### **1. Criação da Corrida**
```
Corrida comunidade criada → diamondState = ELIGIBLE
```

### **2. Aceite do Motorista**
```
Motorista aceita → diamondCandidateDriverId = driverId
                → diamondState = ELIGIBLE (mantém)
```

### **3. Cancelamento (Dies on Cancel)**
```
SE: driverId == diamondCandidateDriverId E diamondState == ELIGIBLE
ENTÃO:
  - diamondState = LOST_BY_DRIVER_CANCEL
  - isDiamondEligible = false
  - diamondLostAt = now
  - diamondLostReason = "CANCELLED_BY_DRIVER"
  - Auditoria registrada
```

### **4. Conclusão com Bônus**
```
SE: diamondState == ELIGIBLE na conclusão
ENTÃO:
  - diamondState = EARNED
  - bonusAmount = valor fixo
  - bonusAppliedAt = now
  - Auditoria registrada
```

## Modelagem de Dados

### **Campos Adicionados ao Ride (Opcionais)**
```prisma
isDiamondEligible       Boolean   @default(false)
diamondState            String?   // ELIGIBLE | LOST_BY_DRIVER_CANCEL | EARNED
diamondCandidateDriverId String?
diamondLostAt           DateTime?
diamondLostReason       String?
bonusAmount             Decimal?  @db.Decimal(10, 2)
bonusAppliedAt          DateTime?
```

### **Auditoria Separada**
```prisma
model DiamondAuditLog {
  id              String   @id @default(cuid())
  rideId          String
  driverId        String?
  diamondStateFrom String?
  diamondStateTo   String
  reason          String?
  bonusAmount     Decimal? @db.Decimal(10, 2)
  createdAt       DateTime @default(now())
}
```

## API Response

### **Flag OFF (Comportamento Atual)**
```json
{
  "ride": { ... },
  "diamondInfo": null
}
```

### **Flag ON - Corrida Elegível**
```json
{
  "ride": { 
    "isDiamondEligible": true,
    "diamondState": "ELIGIBLE"
  },
  "diamondInfo": {
    "isEligible": true,
    "state": "ELIGIBLE",
    "message": "💎 Corrida Diamante - Bônus de R$ 5,00 se não cancelar",
    "bonusAmount": 5.00,
    "candidateDriverId": null
  }
}
```

### **Flag ON - Diamante Perdido**
```json
{
  "ride": { 
    "isDiamondEligible": false,
    "diamondState": "LOST_BY_DRIVER_CANCEL"
  },
  "diamondInfo": {
    "isEligible": false,
    "state": "LOST_BY_DRIVER_CANCEL",
    "message": "Diamante perdido - motorista cancelou",
    "bonusAmount": null,
    "lostAt": "2026-01-03T22:10:21Z",
    "lostReason": "CANCELLED_BY_DRIVER"
  }
}
```

## Configuração

### **Variáveis de Ambiente**
```env
ENABLE_DIAMOND=false
DIAMOND_BONUS_FIXED=5.00
DIAMOND_BONUS_DAILY_CAP=25.00
```

### **Daily Cap Implementation**
- **Timezone**: America/Sao_Paulo (configurável)
- **Validação**: Consulta agregada na `DiamondAuditLog`
- **Concorrência**: Protegida por `prisma.$transaction()`
- **Comportamento**: Cap atingido → sem bônus + auditoria `DAILY_CAP_REACHED`

### **Critérios de Elegibilidade**
- Tipo: `comunidade`
- Comunidade ativa (`isActive = true`)
- Feature flag habilitada

## Integração

### **DiamondService Methods**
```typescript
initializeDiamond(rideId, rideType, communityId?)     // Criação
handleDriverAccept(rideId, driverId)                  // Aceite
handleDriverCancel(rideId, driverId, cancelReason?)   // Cancelamento
handleRideComplete(rideId, driverId?)                 // Conclusão
getDiamondInfo(ride): DiamondInfo | null              // Response
```

### **Pontos de Integração**
- **Governance RideService**: `initializeDiamond()` na criação
- **Admin RideService**: `handleRideComplete()` no force complete
- **Controllers**: `getDiamondInfo()` nas responses

## Características Técnicas

### **Idempotência**
- Estados não são reprocessados se já finalizados
- Auditoria não duplica registros
- Transições inválidas são ignoradas

### **Retrocompatibilidade**
- Campos opcionais com defaults seguros
- Flag OFF = comportamento idêntico ao atual
- Sem refatoração de código existente

### **Performance**
- Lógica executada apenas quando flag ON
- Queries mínimas e otimizadas
- Auditoria assíncrona

## Limitações MVP

- Bônus fixo (não percentual)
- **Daily Cap**: Implementado com validação por motorista/dia
- Sem integração com pagamento real
- Apenas corridas comunidade

## Testes

### **Cenários Cobertos**
1. **Flag OFF**: Comportamento inalterado
2. **Criação**: Corrida comunidade vira ELIGIBLE
3. **Aceite**: Candidato registrado, estado mantido
4. **Cancelamento**: Candidato cancela → LOST_BY_DRIVER_CANCEL
5. **Conclusão**: ELIGIBLE → EARNED com bônus
6. **Idempotência**: Chamadas repetidas não alteram estado
7. **Auditoria**: Todos os eventos registrados

### **Casos Especiais**
- Cancelamento por passageiro/admin não "queima" diamante
- Corridas não-comunidade não são elegíveis
- Comunidades inativas não geram diamonds
- Estados finais (LOST/EARNED) não são alterados

## Benefícios

### **Para Motoristas**
- Incentivo claro para não cancelar
- Transparência sobre status do bônus
- Recompensa por compromisso

### **Para o Sistema**
- Redução de cancelamentos
- Melhoria na experiência do passageiro
- Dados para análise de comportamento

### **Para Desenvolvimento**
- Código limpo e testável
- Integração não-invasiva
- Fácil desabilitação via flag
