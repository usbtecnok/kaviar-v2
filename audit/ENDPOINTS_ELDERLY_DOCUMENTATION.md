# ENDPOINTS ELDERLY - DOCUMENTAÇÃO COMPLETA

## SEGURANÇA IMPLEMENTADA

### Autenticação e Autorização:
- ✅ **JWT obrigatório:** Todos os endpoints exigem token admin válido
- ✅ **Role admin:** Verificação de role administrativo
- ✅ **Rate limiting:** 100 req/min específico para elderly operations
- ✅ **Validação Zod:** Todos os inputs validados com schemas rigorosos

### Privacidade e Dados Sensíveis:
- ✅ **Sanitização:** medical_notes, emergency_contact removidos de listagens
- ✅ **Logs seguros:** Dados sensíveis marcados como [REDACTED] nos logs
- ✅ **Acesso controlado:** Dados médicos só retornados quando necessário

### Auditoria:
- ✅ **Log completo:** admin_id, ação, timestamp, motivo
- ✅ **Rastreabilidade:** Todas as mudanças de status auditadas
- ✅ **IP tracking:** Endereço IP registrado para auditoria

---

## LISTA FINAL DOS ENDPOINTS

### 1. GET /api/admin/elderly/contracts
**Descrição:** Lista contratos de acompanhamento com filtros e paginação

**Filtros disponíveis:**
- `communityId` (string, cuid): Filtrar por bairro específico
- `status` (enum): ACTIVE, INACTIVE, CANCELLED
- `serviceType` (string): Tipo de serviço (padrão: ACOMPANHAMENTO_ATIVO)
- `activeOnly` (boolean): Mostrar apenas contratos ativos

**Paginação:**
- `page` (number, min: 1, default: 1): Página atual
- `pageSize` (number, min: 1, max: 100, default: 10): Itens por página

**Resposta:**
```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": "contract_id",
        "status": "ACTIVE",
        "serviceType": "ACOMPANHAMENTO_ATIVO",
        "startsAt": "2026-01-05T12:00:00Z",
        "endsAt": null,
        "elderlyProfile": {
          "id": "profile_id",
          "careLevel": "basic",
          "medicalNotes": "[CONFIDENCIAL]",
          "emergencyContact": "[CONFIDENCIAL]",
          "passenger": {
            "id": "passenger_id",
            "name": "Nome do Idoso",
            "email": "idoso@email.com"
          }
        },
        "community": {
          "id": "community_id",
          "name": "Mata Machado"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### 2. POST /api/admin/elderly/contracts
**Descrição:** Criar novo contrato de acompanhamento

**Payload:**
```json
{
  "passengerId": "passenger_cuid",
  "responsibleId": "responsible_cuid", // opcional
  "communityId": "community_cuid",
  "serviceType": "ACOMPANHAMENTO_ATIVO",
  "startsAt": "2026-01-05T12:00:00Z",
  "endsAt": "2026-12-31T23:59:59Z", // opcional
  "notes": "Observações do contrato",
  "elderlyProfile": { // opcional se já existir
    "emergencyContact": "Contato de emergência",
    "emergencyPhone": "(71) 99999-9999",
    "medicalNotes": "Observações médicas",
    "careLevel": "basic" // basic, intensive, medical
  }
}
```

**Validações:**
- ✅ **FK validation:** Verifica se passenger, responsible e community existem
- ✅ **Date validation:** startsAt obrigatório, endsAt opcional mas deve ser posterior
- ✅ **Profile creation:** Cria ElderlyProfile automaticamente se não existir

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "new_contract_id",
    "status": "ACTIVE",
    "serviceType": "ACOMPANHAMENTO_ATIVO",
    "startsAt": "2026-01-05T12:00:00Z",
    "elderlyProfile": {
      "passenger": {
        "name": "Nome do Idoso"
      }
    },
    "community": {
      "name": "Mata Machado"
    }
  }
}
```

### 3. PATCH /api/admin/elderly/contracts/:id/status
**Descrição:** Alterar status de contrato existente

**Payload:**
```json
{
  "status": "INACTIVE", // ACTIVE, INACTIVE, CANCELLED
  "reason": "Motivo da alteração" // opcional
}
```

**Funcionalidades:**
- ✅ **Status validation:** Apenas valores válidos aceitos
- ✅ **Reason logging:** Motivo adicionado às notas do contrato
- ✅ **Audit trail:** Mudança registrada com admin_id e timestamp

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "contract_id",
    "status": "INACTIVE",
    "notes": "Notas anteriores\n[2026-01-05T12:00:00Z] Status alterado para INACTIVE: Motivo da alteração",
    "elderlyProfile": {
      "passenger": {
        "name": "Nome do Idoso"
      }
    }
  }
}
```

### 4. GET /api/admin/elderly/dashboard
**Descrição:** Dashboard com métricas de contratos por bairro

**Resposta:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total": 25,
      "active": 18,
      "inactive": 5,
      "cancelled": 2
    },
    "byCommunity": [
      {
        "id": "community_id_1",
        "name": "Mata Machado",
        "active": 4,
        "inactive": 1,
        "cancelled": 0,
        "total": 5
      },
      {
        "id": "community_id_2", 
        "name": "Furnas",
        "active": 3,
        "inactive": 2,
        "cancelled": 1,
        "total": 6
      }
    ]
  }
}
```

---

## COMANDOS CURL DE TESTE

### 1. Listar contratos (com filtros)
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/api/admin/elderly/contracts?communityId=community_id&status=ACTIVE&page=1&pageSize=5"
```

### 2. Criar contrato
```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "passenger_id",
    "communityId": "community_id",
    "startsAt": "2026-01-05T12:00:00Z",
    "elderlyProfile": {
      "careLevel": "basic",
      "emergencyContact": "Família Silva"
    }
  }' \
  http://localhost:3001/api/admin/elderly/contracts
```

### 3. Alterar status
```bash
curl -X PATCH \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "INACTIVE",
    "reason": "Suspensão temporária a pedido da família"
  }' \
  http://localhost:3001/api/admin/elderly/contracts/contract_id/status
```

### 4. Dashboard
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/admin/elderly/dashboard
```

---

## TESTES DE SEGURANÇA (401/403)

### Teste sem token (401):
```bash
curl http://localhost:3001/api/admin/elderly/contracts
# Resposta esperada: {"success": false, "error": "Token não fornecido"}
```

### Teste com token inválido (401):
```bash
curl -H "Authorization: Bearer invalid_token" \
  http://localhost:3001/api/admin/elderly/contracts
# Resposta esperada: {"success": false, "error": "Token inválido"}
```

### Teste com token de usuário não-admin (403):
```bash
curl -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3001/api/admin/elderly/contracts
# Resposta esperada: {"success": false, "error": "Acesso negado"}
```

### Teste de rate limiting (429):
```bash
# Fazer 101 requests em 1 minuto
for i in {1..101}; do
  curl -H "Authorization: Bearer $ADMIN_TOKEN" \
    http://localhost:3001/api/admin/elderly/dashboard
done
# Resposta esperada na 101ª: {"success": false, "error": "Muitas operações administrativas"}
```

---

## AUDITORIA IMPLEMENTADA

### Logs de Auditoria:
```
[AUDIT] ELDERLY_CONTRACT_CREATED by admin admin_id on elderly_contract:contract_id
[AUDIT] ELDERLY_CONTRACT_STATUS_CHANGED by admin admin_id on elderly_contract:contract_id
```

### Dados Auditados:
- ✅ **Admin ID:** Quem fez a ação
- ✅ **Timestamp:** Quando foi feita
- ✅ **Ação:** Tipo de operação (CREATE, STATUS_CHANGE)
- ✅ **Entity:** Tipo e ID da entidade afetada
- ✅ **Motivo:** Reason fornecido pelo admin
- ✅ **IP Address:** Endereço IP da requisição
- ✅ **Dados sanitizados:** Informações sensíveis removidas dos logs

---

## VALIDAÇÕES IMPLEMENTADAS

### Validação de Entrada (Zod):
- ✅ **CUIDs:** Todos os IDs validados como CUID válidos
- ✅ **Enums:** Status e careLevel com valores específicos
- ✅ **Datas:** ISO 8601 datetime validation
- ✅ **Strings:** Limites de tamanho para notes, reason, etc.
- ✅ **Opcionais:** Campos opcionais tratados corretamente

### Validação de Negócio:
- ✅ **FK existence:** Verifica se passenger, community, responsible existem
- ✅ **Profile creation:** Cria ElderlyProfile se necessário
- ✅ **Status transitions:** Permite mudanças de status válidas
- ✅ **Date logic:** endsAt deve ser posterior a startsAt (se fornecido)

---

## PRIVACIDADE E GDPR

### Dados Sensíveis Protegidos:
- ✅ **medical_notes:** Não retornado em listagens, apenas em detalhes específicos
- ✅ **emergency_contact:** Mascarado como [CONFIDENCIAL] em listagens
- ✅ **emergency_phone:** Mascarado como [CONFIDENCIAL] em listagens
- ✅ **Logs sanitizados:** Dados sensíveis marcados como [REDACTED]

### Controle de Acesso:
- ✅ **Admin only:** Apenas admins podem acessar dados elderly
- ✅ **Selective exposure:** Dados sensíveis só retornados quando necessário
- ✅ **Audit trail:** Todas as visualizações/mudanças auditadas
