# PR: Driver Governance - Approval Gates + Documents + LGPD

## 🎯 Objetivo

Implementar sistema completo de governança para aprovação de motoristas com gates obrigatórios: LGPD, documentos, fotos do veículo, comprovante de residência e verificação de antecedentes.

## 🔧 Regras Implementadas

### Gates de Aprovação (Obrigatórios)
- ✅ **Consentimento LGPD** aceito pelo motorista
- ✅ **Documentos pessoais** verificados (CPF, RG, CNH)
- ✅ **Fotos do veículo** enviadas e verificadas
- ✅ **Comprovante de residência** verificado
- ✅ **Antecedentes criminais** com status mínimo "SUBMITTED"
- ✅ **Comunidade atribuída** (manual por admin)

### Status Granular por Documento
- `MISSING` → `SUBMITTED` → `VERIFIED` / `REJECTED`
- Rastreabilidade completa com admin responsável
- Motivo de rejeição registrado

### Retrocompatibilidade
- Motoristas existentes recebem `DriverVerification` com status `PENDING`
- Documentos faltantes marcados como `MISSING`
- Não quebra endpoints existentes

## 📋 Arquivos Implementados

### Novos Arquivos
- `src/services/driver-verification.ts` - Serviço de elegibilidade
- `src/modules/governance/driver-controller.ts` - Controller público
- `src/modules/governance/driver-schemas.ts` - Validações Zod
- `src/modules/admin/driver-admin-controller.ts` - Controller admin
- `tests/driver-governance.test.ts` - Testes completos
- `docs/pr-driver-governance.md` - Esta documentação

### Arquivos Modificados
- `prisma/schema.prisma` - Models: Consent, DriverVerification, DriverDocument
- `src/modules/admin/service.ts` - Gates no approveDriver()
- `src/modules/admin/controller.ts` - Error handling estruturado
- `src/routes/governance.ts` - Endpoints públicos
- `src/routes/admin.ts` - Endpoints admin

## 🗄️ Modelos de Dados

### Consent (Genérico)
```sql
subjectType  String   -- PASSENGER, DRIVER
subjectId    String   -- ID do passageiro/motorista
consentType  String   -- lgpd, terms, privacy
termVersion  String   -- Versão dos termos
accepted     Boolean  -- Se foi aceito
acceptedAt   DateTime -- Quando foi aceito
ipAddress    String   -- IP do usuário
userAgent    String   -- User agent do browser
```

### DriverVerification (1:1 com Driver)
```sql
driverId             String   -- FK para Driver
communityId          String   -- Comunidade atribuída
status               String   -- PENDING, ELIGIBLE, APPROVED, REJECTED
eligibilityCheckedAt DateTime -- Última verificação
approvedAt           DateTime -- Quando foi aprovado
approvedByAdminId    String   -- Admin que aprovou
rejectedAt           DateTime -- Quando foi rejeitado
rejectionReason      String   -- Motivo da rejeição
```

### DriverDocument (1:N com Driver)
```sql
driverId          String   -- FK para Driver
type              String   -- CPF, RG, CNH, PROOF_OF_ADDRESS, VEHICLE_PHOTO, BACKGROUND_CHECK
status            String   -- MISSING, SUBMITTED, VERIFIED, REJECTED
fileUrl           String   -- URL do arquivo
submittedAt       DateTime -- Quando foi enviado
verifiedAt        DateTime -- Quando foi verificado
verifiedByAdminId String   -- Admin que verificou
rejectReason      String   -- Motivo da rejeição
```

## 🔌 Endpoints Implementados

### Governance (Público)

#### POST /api/governance/driver/consent
```bash
curl -X POST http://localhost:3001/api/governance/driver/consent \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "driver-123",
    "consentType": "lgpd",
    "accepted": true,
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "consent-123",
    "accepted": true,
    "acceptedAt": "2026-01-03T21:00:00Z"
  },
  "message": "Consentimento registrado com sucesso"
}
```

#### PUT /api/governance/driver/:id/documents
```bash
curl -X PUT http://localhost:3001/api/governance/driver/driver-123/documents \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "type": "CPF",
        "fileUrl": "https://storage.com/cpf.pdf"
      },
      {
        "type": "VEHICLE_PHOTO",
        "fileUrl": "https://storage.com/car-front.jpg"
      }
    ],
    "communityId": "community-123"
  }'
```

### Admin (Protegido)

#### GET /api/admin/drivers/:id/verification
```bash
curl -X GET http://localhost:3001/api/admin/drivers/driver-123/verification \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isEligible": false,
    "missingRequirements": ["LGPD_CONSENT", "VEHICLE_PHOTO"],
    "checklist": {
      "lgpdConsent": { "status": "MISSING", "required": true },
      "communityAssigned": { "status": "ASSIGNED", "required": true },
      "documents": {
        "CPF": { "status": "VERIFIED", "required": true, "verifiedAt": "2026-01-03T21:00:00Z" },
        "VEHICLE_PHOTO": { "status": "MISSING", "required": true }
      }
    }
  }
}
```

#### PUT /api/admin/drivers/:id/documents/:docId/verify
```bash
curl -X PUT http://localhost:3001/api/admin/drivers/driver-123/documents/doc-456/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"adminId": "admin-123"}'
```

#### PUT /api/admin/drivers/:id/approve (Modificado)
```bash
curl -X PUT http://localhost:3001/api/admin/drivers/driver-123/approve \
  -H "Authorization: Bearer $TOKEN"
```

**Error Response (quando não elegível):**
```json
{
  "success": false,
  "error": "DRIVER_NOT_ELIGIBLE",
  "missingRequirements": ["LGPD_CONSENT", "VEHICLE_PHOTO", "PROOF_OF_ADDRESS"],
  "details": {
    "lgpdConsent": "Consentimento LGPD não aceito",
    "vehiclePhotos": "Fotos do veículo não enviadas ou não verificadas",
    "proofOfAddress": "Comprovante de residência não verificado"
  }
}
```

## 🧪 Fluxo Completo de Teste

### 1. Cadastro e Consentimento
```bash
# 1. Motorista aceita LGPD
curl -X POST http://localhost:3001/api/governance/driver/consent \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "driver-123",
    "consentType": "lgpd",
    "accepted": true,
    "ipAddress": "192.168.1.1"
  }'
```

### 2. Envio de Documentos
```bash
# 2. Motorista envia documentos
curl -X PUT http://localhost:3001/api/governance/driver/driver-123/documents \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {"type": "CPF", "fileUrl": "https://storage.com/cpf.pdf"},
      {"type": "RG", "fileUrl": "https://storage.com/rg.pdf"},
      {"type": "CNH", "fileUrl": "https://storage.com/cnh.pdf"},
      {"type": "PROOF_OF_ADDRESS", "fileUrl": "https://storage.com/address.pdf"},
      {"type": "VEHICLE_PHOTO", "fileUrl": "https://storage.com/car.jpg"},
      {"type": "BACKGROUND_CHECK", "fileUrl": "https://storage.com/background.pdf"}
    ],
    "communityId": "community-123"
  }'
```

### 3. Verificação Admin
```bash
# 3. Admin verifica status
TOKEN=$(curl -s -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"<ADMIN_PASSWORD>"}' | jq -r '.token')

curl -X GET http://localhost:3001/api/admin/drivers/driver-123/verification \
  -H "Authorization: Bearer $TOKEN"

# 4. Admin verifica cada documento
curl -X PUT http://localhost:3001/api/admin/drivers/driver-123/documents/doc-id/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"adminId": "admin-123"}'
```

### 4. Aprovação Final
```bash
# 5. Admin aprova motorista (só funciona se todos os gates estiverem OK)
curl -X PUT http://localhost:3001/api/admin/drivers/driver-123/approve \
  -H "Authorization: Bearer $TOKEN"
```

## ✅ Critérios de Aceite Validados

- ✅ **Gates obrigatórios**: Não aprova sem LGPD + docs + fotos + comprovante + antecedentes + comunidade
- ✅ **Retorno estruturado**: Error com `missingRequirements` e `details` quando falhar
- ✅ **Status granular**: MISSING/SUBMITTED/VERIFIED/REJECTED por documento
- ✅ **Auditoria completa**: Admin responsável e timestamp em todas as ações
- ✅ **Retrocompatibilidade**: Motoristas existentes não quebram
- ✅ **Testes abrangentes**: Cada gate testado individualmente + fluxo completo

## 🔍 Validação de Funcionamento

### Teste de Gates Individuais
```bash
# Teste: tentar aprovar sem LGPD
curl -X PUT http://localhost:3001/api/admin/drivers/driver-123/approve \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 400 com "LGPD_CONSENT" em missingRequirements

# Teste: tentar aprovar sem fotos do veículo
# (após aceitar LGPD e enviar outros docs)
# Esperado: 400 com "VEHICLE_PHOTO" em missingRequirements
```

### Teste de Fluxo Completo
```bash
# Após completar todos os gates
curl -X PUT http://localhost:3001/api/admin/drivers/driver-123/approve \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 200 com motorista aprovado
```

## 🚀 Próximos Passos

Este PR estabelece a base para:
- **Integração com storage** (AWS S3, Cloudinary) para upload de arquivos
- **Verificação automática** de antecedentes via APIs externas
- **Geolocalização automática** para determinação de comunidade
- **Workflow de aprovação** com múltiplos níveis de admin

**Status: ✅ PRONTO PARA PRODUÇÃO**
