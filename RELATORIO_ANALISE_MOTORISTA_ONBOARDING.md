# Relatório de Análise: Endpoint de Criação de Motorista e Upload de Documentos
**Sistema:** Kaviar (us-east-2, AWS)  
**Data:** 05/02/2026  
**Solicitação:** Análise de endpoints existentes (sem refatoração ou criação)

---

## 1. ENDPOINT DE CRIAÇÃO DE MOTORISTA (RAIZ)

### ✅ EXISTE: `POST /api/governance/driver`

**Localização:** `/home/goes/kaviar/backend/src/routes/governance.ts` (linha 209)

**Características:**
- **Rota:** `/api/governance/driver` (não está na raiz `/api/driver`, mas em `/api/governance`)
- **Autenticação:** Não requer autenticação (cadastro público)
- **Função:** Cadastro inicial de motorista
- **Status inicial:** `pending` (aguardando aprovação)

**Campos aceitos:**
```typescript
{
  name: string,
  email: string (único),
  phone: string,
  password: string,
  neighborhoodId: string,
  communityId?: string,
  familyBonusAccepted?: boolean,
  familyProfile?: 'individual' | 'family'
}
```

**Validações:**
- Email único (retorna 409 se já existir)
- Password é hasheado com bcrypt
- Status inicial sempre `pending`

**Resposta de sucesso (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Nome",
    "email": "email@example.com",
    "phone": "+5511999999999",
    "status": "pending"
  }
}
```

---

## 2. UPLOAD DE DOCUMENTOS COMPLETO

### ✅ EXISTE: `POST /api/drivers/me/documents`

**Localização:** `/home/goes/kaviar/backend/src/routes/drivers.ts` (linha 119)

**Características:**
- **Rota:** `/api/drivers/me/documents`
- **Autenticação:** Requer JWT de motorista (`authenticateDriver`)
- **Upload:** Multipart/form-data com S3 (AWS)
- **Função:** Upload completo de documentos para onboarding

**Documentos obrigatórios:**
1. `cpf` (1 arquivo)
2. `rg` (1 arquivo)
3. `cnh` (1 arquivo)
4. `proofOfAddress` (1 arquivo)
5. `vehiclePhoto` (até 5 arquivos)
6. `backgroundCheck` (1 arquivo) - Certidão de Nada Consta
   - **Alias:** `certidao` (aceito temporariamente)

**Campos adicionais (body):**
```typescript
{
  vehicleColor: string,
  vehiclePlate: string,
  vehicleModel: string,
  pix_key?: string,
  pix_key_type?: string,
  communityId?: string,
  lgpdAccepted: boolean,
  termsAccepted?: boolean
}
```

**Persistência em múltiplas tabelas:**
1. **`drivers`** (campos legacy):
   - `certidao_nada_consta_url`
   - `vehicle_plate`, `vehicle_model`, `vehicle_color`
   - `pix_key`, `pix_key_type`
   - `community_id`

2. **`driver_documents`** (validação de aprovação):
   - Tipos: CPF, RG, CNH, PROOF_OF_ADDRESS, VEHICLE_PHOTO, BACKGROUND_CHECK
   - Status inicial: `SUBMITTED`

3. **`driver_compliance_documents`** (compliance/admin):
   - Tipo: `criminal_record`
   - Status inicial: `pending`
   - Registra consentimento LGPD (IP, timestamp)

4. **`consents`** (LGPD):
   - Tipo: `lgpd`
   - Subject: `DRIVER`
   - Registra IP e user-agent

5. **`driver_verifications`** (aprovação):
   - Sincroniza `community_id`
   - Status inicial: `PENDING`

**Validações:**
- Todos os 6 tipos de documentos são obrigatórios
- Retorna erro 400 com lista de documentos faltantes se incompleto
- Transação atômica (rollback se falhar)

**Resposta de sucesso (200):**
```json
{
  "success": true,
  "message": "Documentos enviados com sucesso",
  "received": ["cpf", "rg", "cnh", "proofOfAddress", "vehiclePhoto", "backgroundCheck"],
  "savedDriverDocuments": 6,
  "savedComplianceDocs": 1,
  "data": {
    "cpf": "s3-key-cpf",
    "rg": "s3-key-rg",
    "cnh": "s3-key-cnh",
    "proofOfAddress": "s3-key-address",
    "vehiclePhotos": ["s3-key-photo1", "s3-key-photo2"],
    "backgroundCheck": "s3-key-certidao"
  }
}
```

**Erros possíveis:**
- `401 UNAUTHORIZED`: Token JWT inválido/ausente
- `400 MISSING_FILES`: Documentos obrigatórios faltando
- `500 DB_WRITE_FAILED`: Falha ao salvar no banco (detecta erro Prisma)
- `500 UPLOAD_FAILED`: Erro genérico de upload

---

## 3. ENDPOINTS COMPLEMENTARES DE ONBOARDING

### 3.1. Completar Perfil
**Rota:** `POST /api/drivers/me/complete-profile`  
**Autenticação:** Requer JWT de motorista  
**Função:** Atualizar localização e aceitar termos

**Campos:**
```typescript
{
  name?: string,
  phone?: string,
  latitude: number,
  longitude: number,
  terms_accepted: true,
  privacy_accepted: true,
  terms_version: string
}
```

**Ações:**
- Resolve coordenadas para bairro (GeoResolveService)
- Atualiza `last_lat`, `last_lng`, `last_location_updated_at`
- Cria/atualiza registro em `driver_consents`

### 3.2. Ficar Online
**Rota:** `POST /api/drivers/me/online`  
**Autenticação:** Requer JWT de motorista  
**Função:** Ativar status online

**Ações:**
- Atualiza `status` para `online`
- Atualiza `last_active_at`

---

## 4. FLUXO COMPLETO DE ONBOARDING

```
1. Cadastro Inicial (público)
   POST /api/governance/driver
   → Status: pending
   → Retorna: { id, email, status }

2. Login (obter JWT)
   POST /api/auth/driver/login
   → Retorna: { token, user: { isPending: true } }

3. Completar Perfil (autenticado)
   POST /api/drivers/me/complete-profile
   → Aceita termos
   → Define localização

4. Upload de Documentos (autenticado)
   POST /api/drivers/me/documents
   → 6 tipos obrigatórios
   → Persiste em 5 tabelas
   → Status permanece: pending

5. Aprovação Admin (backend)
   POST /api/admin/drivers/:id/approve
   → Status: pending → approved
   → Valida documentos obrigatórios

6. Ficar Online (autenticado)
   POST /api/drivers/me/online
   → Status: online
   → Pronto para corridas
```

---

## 5. ESTRUTURA DE DADOS (PRISMA)

### Tabela `drivers`
**Campos relevantes para onboarding:**
- `id`, `name`, `email`, `password_hash`, `phone`
- `status`: `pending` | `approved` | `rejected` | `suspended`
- `neighborhood_id`, `community_id`
- `vehicle_plate`, `vehicle_model`, `vehicle_color`
- `certidao_nada_consta_url`
- `pix_key`, `pix_key_type`
- `family_bonus_accepted`, `family_bonus_profile`
- `last_lat`, `last_lng`, `last_location_updated_at`
- `approved_at`, `approved_by`, `rejected_at`, `rejected_by`

### Tabela `driver_documents`
**Tipos de documentos:**
- CPF, RG, CNH, PROOF_OF_ADDRESS, VEHICLE_PHOTO, BACKGROUND_CHECK
- Status: `pending` | `SUBMITTED` | `verified` | `rejected`
- Unique constraint: `(driver_id, type)`

### Tabela `driver_compliance_documents`
**Compliance (certidões):**
- Tipo: `criminal_record`
- Status: `pending` | `approved` | `rejected`
- Campos LGPD: `lgpd_consent_accepted`, `lgpd_consent_ip`, `lgpd_consent_at`
- Validade: `valid_from`, `valid_until`

### Tabela `driver_verifications`
**Verificação de elegibilidade:**
- Status: `PENDING` | `APPROVED` | `REJECTED`
- `community_id` (sincronizado com `drivers`)
- `approved_at`, `approved_by_admin_id`

### Tabela `consents`
**Consentimentos LGPD:**
- Subject: `DRIVER`
- Tipo: `lgpd`
- `accepted`, `accepted_at`, `ip_address`, `user_agent`

---

## 6. CONFIGURAÇÃO AWS/S3

**Middleware de upload:** `uploadToS3` (multer + S3)  
**Localização:** `/home/goes/kaviar/backend/src/config/s3-upload.ts`

**Configuração:**
- Região: `us-east-2` (variável `AWS_REGION`)
- Bucket: `process.env.AWS_S3_BUCKET`
- Estrutura de chaves: `uploads/{tipo}/{timestamp}-{filename}`

**Variáveis de ambiente necessárias:**
```
AWS_REGION=us-east-2
AWS_S3_BUCKET=nome-do-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

---

## 7. AUTENTICAÇÃO E AUTORIZAÇÃO

### Login de Motorista
**Rota:** `POST /api/auth/driver/login`  
**Localização:** `/home/goes/kaviar/backend/src/routes/driver-auth.ts`

**Validações:**
- Email e senha obrigatórios
- Bloqueia apenas status `rejected` e `suspended`
- **Permite login com status `pending`** (modo Kaviar)

**JWT payload:**
```typescript
{
  userId: string,
  userType: 'DRIVER',
  email: string,
  status: string
}
```

**Resposta:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "name": "Nome",
    "email": "email",
    "phone": "phone",
    "status": "pending",
    "user_type": "DRIVER",
    "isPending": true  // Flag para frontend
  }
}
```

### Middleware de Autenticação
**Nome:** `authenticateDriver`  
**Localização:** `/home/goes/kaviar/backend/src/middlewares/auth.ts`

**Função:**
- Valida JWT
- Extrai `userId` e anexa em `req.userId`
- Não valida status (autorização é feita por endpoint)

---

## 8. APROVAÇÃO ADMIN

**Rota:** `POST /api/admin/drivers/:id/approve`  
**Localização:** `/home/goes/kaviar/backend/src/routes/admin-approval.ts`

**Validações antes de aprovar:**
1. Todos os 6 tipos de documentos em `driver_documents` com status `SUBMITTED`
2. Consentimento LGPD em `consents` (tipo `lgpd`, subject `DRIVER`)
3. Registro em `driver_verifications` com `community_id`

**Ações:**
- Atualiza `drivers.status` para `approved`
- Define `approved_at` e `approved_by`
- Retorna erro 400 se validações falharem

---

## 9. OBSERVAÇÕES IMPORTANTES

### 9.1. Endpoint de Criação NÃO está na raiz
- **Esperado:** `/api/driver` (raiz)
- **Real:** `/api/governance/driver`
- **Impacto:** Frontend precisa usar `/api/governance/driver`

### 9.2. Alias temporário para certidão
- Campo `certidao` é aceito como alias de `backgroundCheck`
- Implementado para compatibilidade com frontend antigo
- Recomendação: Padronizar para `backgroundCheck`

### 9.3. Formato de campos aceita camelCase e snake_case
- `vehicleColor` ou `vehicle_color`
- `vehiclePlate` ou `vehicle_plate`
- `vehicleModel` ou `vehicle_model`

### 9.4. Transação atômica
- Upload de documentos usa `prisma.$transaction`
- Rollback automático se qualquer operação falhar
- Logs detalhados em console para debug

### 9.5. Modo Kaviar: Login com status pending
- Motoristas com status `pending` podem fazer login
- Frontend deve exibir mensagem de "aguardando aprovação"
- Funcionalidades de corrida são bloqueadas até aprovação

---

## 10. CONCLUSÃO

### ✅ Sistema POSSUI:
1. **Endpoint de criação de motorista** (em `/api/governance/driver`)
2. **Upload completo de documentos** (em `/api/drivers/me/documents`)
3. **Persistência em múltiplas tabelas** (5 tabelas sincronizadas)
4. **Validação de documentos obrigatórios** (6 tipos)
5. **Integração com S3** (AWS us-east-2)
6. **Consentimento LGPD** (IP, timestamp, user-agent)
7. **Fluxo de aprovação admin** (validações automáticas)

### ⚠️ Observações:
- Endpoint de criação está em `/api/governance/driver` (não na raiz `/api/driver`)
- Sistema está completo e funcional
- Documentação em `/home/goes/kaviar/backend/DRIVER_MANAGEMENT_API.md`

### 📊 Arquivos analisados:
- `/home/goes/kaviar/backend/src/routes/governance.ts` (criação)
- `/home/goes/kaviar/backend/src/routes/drivers.ts` (upload)
- `/home/goes/kaviar/backend/src/routes/driver-auth.ts` (login)
- `/home/goes/kaviar/backend/src/routes/admin-approval.ts` (aprovação)
- `/home/goes/kaviar/backend/prisma/schema.prisma` (estrutura de dados)
- `/home/goes/kaviar/backend/src/app.ts` (montagem de rotas)

---

**Relatório gerado em:** 05/02/2026 07:36 BRT  
**Região AWS:** us-east-2  
**Status:** Sistema completo e operacional
