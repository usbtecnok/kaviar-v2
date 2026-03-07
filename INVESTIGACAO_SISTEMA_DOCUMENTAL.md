# INVESTIGAÇÃO COMPLETA: SISTEMA DOCUMENTAL KAVIAR

**Data:** 2026-03-07  
**Modo:** KAVIAR (sem workarounds, fluxo oficial)  
**Objetivo:** Mapear fonte de verdade, armazenamento, auditoria e gaps do sistema documental

---

## 1. FONTE DE VERDADE: REQUISITOS DE APROVAÇÃO

### 1.1 Documentos Obrigatórios

**Arquivo:** `backend/src/services/driver-verification.ts` (linhas 50-120)

```typescript
const requiredDocs = ['CPF', 'RG', 'CNH', 'PROOF_OF_ADDRESS', 'VEHICLE_PHOTO', 'BACKGROUND_CHECK'];
```

**Validação de aprovação:**
- LGPD consent (obrigatório)
- vehicle_color (obrigatório)
- 6 documentos com status `VERIFIED` ou `SUBMITTED`

**Status aceitos para aprovação:**
```typescript
const isDocValid = doc && (doc.status === 'VERIFIED' || doc.status === 'SUBMITTED');
```

### 1.2 Tabelas de Documentos

#### Tabela 1: `driver_documents` (validação de aprovação)

**Schema:** `backend/prisma/schema.prisma` (linhas 117-145)

```prisma
model driver_documents {
  id                   String    @id
  driver_id            String
  type                 String
  document_url         String    @default("")
  file_url             String?
  status               String    @default("pending")
  submitted_at         DateTime?
  verified_at          DateTime?
  verified_by_admin_id String?
  rejected_at          DateTime?
  rejected_by_admin_id String?
  reject_reason        String?
  created_at           DateTime  @default(now())
  updated_at           DateTime

  @@unique([driver_id, type])
}
```

**Tipos de status:**
- `pending` - aguardando análise
- `SUBMITTED` - enviado (aceito para aprovação)
- `VERIFIED` - verificado pelo admin (aceito para aprovação)
- `rejected` - rejeitado

**Uso:** Lida por `evaluateEligibility()` para determinar se motorista pode ser aprovado

#### Tabela 2: `driver_compliance_documents` (revalidação anual)

**Schema:** `backend/prisma/schema.prisma` (linhas 641-670)

```prisma
model driver_compliance_documents {
  id                    String    @id
  driver_id             String
  type                  String    @default("criminal_record")
  file_url              String
  status                String    @default("pending")
  valid_from            DateTime?
  valid_until           DateTime?
  approved_by           String?
  approved_at           DateTime?
  rejected_by           String?
  rejected_at           DateTime?
  rejection_reason      String?
  is_current            Boolean   @default(false)
  lgpd_consent_accepted Boolean   @default(false)
  lgpd_consent_ip       String?
  lgpd_consent_at       DateTime?
  created_at            DateTime
  updated_at            DateTime

  @@index([driver_id])
  @@index([status])
  @@index([is_current])
  @@index([valid_until])
}
```

**Uso:** Revalidação anual de antecedentes criminais (12 meses)

---

## 2. ARMAZENAMENTO: INFRAESTRUTURA S3

### 2.1 Configuração S3

**Arquivo:** `backend/src/config/s3-upload.ts`

```typescript
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2'
});

const bucket = process.env.AWS_S3_BUCKET || 'kaviar-uploads-1769655575';
```

**Multer S3 Storage:**
- Bucket: `kaviar-uploads-1769655575`
- Path: `certidoes/{timestamp}-{random}.{ext}`
- Limite: 10MB por arquivo
- Tipos aceitos: JPEG, PNG, PDF

**Presigned URLs:**
```typescript
export async function getPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
```

### 2.2 Endpoint de Upload

**Arquivo:** `backend/src/routes/drivers.ts` (linhas 119-380)

**Endpoint:** `POST /api/drivers/me/documents`

**Campos aceitos:**
```typescript
uploadToS3.fields([
  { name: 'cpf', maxCount: 1 },
  { name: 'rg', maxCount: 1 },
  { name: 'cnh', maxCount: 1 },
  { name: 'proofOfAddress', maxCount: 1 },
  { name: 'vehiclePhoto', maxCount: 5 },
  { name: 'backgroundCheck', maxCount: 1 },
  { name: 'certidao', maxCount: 1 } // alias
])
```

**Validações:**
- MIME types: `image/jpeg`, `image/jpg`, `image/png`, `application/pdf`
- Tamanho máximo: 5MB por arquivo
- Rate limiting: 3 uploads a cada 10 minutos

**Persistência (transação):**
1. Atualiza `drivers` table (campos legacy: `certidao_nada_consta_url`, `vehicle_color`, etc)
2. Upsert em `driver_documents` (6 documentos com status `SUBMITTED`)
3. Cria em `driver_compliance_documents` (background check)
4. Sync LGPD consent em `consents` table
5. Sync community em `driver_verifications`

**S3 Keys retornados:**
```typescript
const cpfUrl = (files.cpf[0] as any).key; // "certidoes/1234567890-123456789.jpg"
```

---

## 3. AUDITORIA: TRILHA COMPLETA

### 3.1 Campos de Auditoria em `driver_documents`

✅ **Tipo do documento:** `type` (CPF, RG, CNH, etc)  
✅ **Motorista vinculado:** `driver_id`  
✅ **Data/hora de upload:** `submitted_at`  
✅ **Status:** `status` (pending, SUBMITTED, VERIFIED, rejected)  
✅ **Reviewer/admin:** `verified_by_admin_id`, `rejected_by_admin_id`  
✅ **Motivo de rejeição:** `reject_reason`  
✅ **Data de verificação:** `verified_at`, `rejected_at`  
✅ **Timestamps:** `created_at`, `updated_at`

### 3.2 Campos de Auditoria em `driver_compliance_documents`

✅ **Tipo do documento:** `type` (criminal_record)  
✅ **Motorista vinculado:** `driver_id`  
✅ **Data/hora de upload:** `created_at`  
✅ **Status:** `status` (pending, approved, rejected)  
✅ **Reviewer/admin:** `approved_by`, `rejected_by`  
✅ **Motivo de rejeição:** `rejection_reason`  
✅ **Data de aprovação/rejeição:** `approved_at`, `rejected_at`  
✅ **Validade:** `valid_from`, `valid_until` (12 meses)  
✅ **Documento vigente:** `is_current` (boolean)  
✅ **LGPD consent:** `lgpd_consent_accepted`, `lgpd_consent_ip`, `lgpd_consent_at`  
✅ **Timestamps:** `created_at`, `updated_at`

### 3.3 Histórico de Mudanças

❌ **NÃO EXISTE** tabela de histórico de mudanças de status

**Workaround atual:**
- `driver_compliance_documents` mantém histórico completo (não deleta, apenas marca `is_current = false`)
- `driver_documents` faz UPSERT (sobrescreve registro anterior)

---

## 4. ENDPOINTS EXISTENTES

### 4.1 Motorista (Driver)

**Upload de documentos:**
```
POST /api/drivers/me/documents
Headers: Authorization: Bearer <driver_token>
Body: multipart/form-data (cpf, rg, cnh, proofOfAddress, vehiclePhoto, backgroundCheck)
```

**Criar documento de compliance:**
```
POST /api/drivers/me/compliance/documents
Headers: Authorization: Bearer <driver_token>
Body: { fileUrl, lgpdConsentAccepted }
```

**Ver meus documentos:**
```
GET /api/drivers/me/compliance/documents
Headers: Authorization: Bearer <driver_token>
```

**Ver status de revalidação:**
```
GET /api/drivers/me/compliance/status
Headers: Authorization: Bearer <driver_token>
```

### 4.2 Admin

**Listar documentos pendentes:**
```
GET /api/admin/compliance/documents/pending
Headers: Authorization: Bearer <admin_token>
```

**Listar documentos vencendo:**
```
GET /api/admin/compliance/documents/expiring
Headers: Authorization: Bearer <admin_token>
```

**Ver documentos de um motorista:**
```
GET /api/admin/drivers/:id/documents
Headers: Authorization: Bearer <admin_token>
```

**Aprovar documento:**
```
POST /api/admin/compliance/documents/:documentId/approve
Headers: Authorization: Bearer <admin_token>
```

**Rejeitar documento:**
```
POST /api/admin/compliance/documents/:documentId/reject
Headers: Authorization: Bearer <admin_token>
Body: { reason: "motivo com mínimo 10 caracteres" }
```

---

## 5. ADMIN WEB UI

### 5.1 Página de Compliance

**Arquivo:** `frontend-app/src/pages/admin/ComplianceManagement.jsx`

✅ **Funcionalidades:**
- Métricas: pending, expiring, blocked
- Lista de documentos pendentes
- Histórico de documentos por motorista
- Aprovar/rejeitar documentos
- Visualizar documento (presigned URL)

### 5.2 Página de Aprovação de Motoristas

**Arquivo:** `frontend-app/src/pages/admin/DriverApproval.jsx`

✅ **Funcionalidades:**
- Lista motoristas pendentes
- Abre modal com detalhes do motorista
- Carrega documentos via `adminApi.getDriverDocuments(driver.id)`
- Endpoint: `GET /api/admin/drivers/:id/documents`
- Mostra Placa, Modelo, Cor na tabela

### 5.3 API Service

**Arquivo:** `frontend-app/src/services/adminApi.js`

```javascript
async getDriverDocuments(id) {
  return this.get(`/api/admin/drivers/${id}/documents`);
}
```

---

