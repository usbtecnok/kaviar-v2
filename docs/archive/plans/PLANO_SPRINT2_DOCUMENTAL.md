# GAP ANALYSIS E PLANO SPRINT 2 DOCUMENTAL

**Continuação de:** INVESTIGACAO_SISTEMA_DOCUMENTAL.md

---

## 6. GAP ANALYSIS

### 6.1 ✅ O QUE JÁ EXISTE NO BACKEND

| Componente | Status | Detalhes |
|------------|--------|----------|
| Tabela `driver_documents` | ✅ Existe | 6 tipos de documentos, status, auditoria básica |
| Tabela `driver_compliance_documents` | ✅ Existe | Revalidação anual, auditoria completa |
| Upload S3 | ✅ Funcional | Bucket configurado, presigned URLs |
| Endpoint de upload | ✅ Funcional | `POST /api/drivers/me/documents` |
| Validação de aprovação | ✅ Funcional | `evaluateEligibility()` lê `driver_documents` |
| Endpoints admin compliance | ✅ Funcionais | Aprovar/rejeitar/listar |
| Rate limiting | ✅ Implementado | 3 uploads / 10 minutos |
| Validação MIME/tamanho | ✅ Implementado | JPEG, PNG, PDF / 5MB |
| LGPD consent tracking | ✅ Implementado | IP, timestamp, user-agent |

### 6.2 ✅ O QUE JÁ EXISTE NO ADMIN WEB

| Componente | Status | Detalhes |
|------------|--------|----------|
| Página ComplianceManagement | ✅ Existe | Aprovar/rejeitar documentos de compliance |
| Página DriverApproval | ✅ Existe | Lista motoristas, mostra veículo |
| API service | ✅ Existe | `getDriverDocuments()` |
| Endpoint backend | ✅ Existe | `GET /api/admin/drivers/:id/documents` |
| Visualização de documentos | ✅ Existe | Presigned URLs, fallback |

### 6.3 ❌ O QUE FALTA NO APP (DRIVER)

| Componente | Status | Problema |
|------------|--------|----------|
| Tela de upload de documentos | ❌ NÃO EXISTE | Motorista não consegue enviar documentos |
| Preview de documentos | ❌ NÃO EXISTE | Motorista não vê o que enviou |
| Status de aprovação | ❌ NÃO EXISTE | Motorista não sabe se foi aprovado/rejeitado |
| Feedback de rejeição | ❌ NÃO EXISTE | Motorista não vê motivo da rejeição |
| Reenvio de documentos | ❌ NÃO EXISTE | Motorista não consegue reenviar após rejeição |
| Indicador de progresso | ❌ NÃO EXISTE | Motorista não sabe quantos docs faltam |

### 6.4 ⚠️ O QUE FALTA NA STORAGE

| Componente | Status | Problema |
|------------|--------|----------|
| Organização de paths | ⚠️ LIMITADO | Tudo em `certidoes/`, sem separação por tipo |
| Metadados S3 | ⚠️ LIMITADO | Apenas `fieldName`, falta `driverId`, `docType` |
| Lifecycle policy | ❌ NÃO EXISTE | Documentos rejeitados não são arquivados |
| Backup/replicação | ❓ DESCONHECIDO | Não verificado |

### 6.5 ⚠️ O QUE FALTA NA AUDITORIA

| Componente | Status | Problema |
|------------|--------|----------|
| Histórico de mudanças | ❌ NÃO EXISTE | `driver_documents` faz UPSERT (perde histórico) |
| Log de acessos | ❌ NÃO EXISTE | Não rastreia quem visualizou documentos |
| Notificações | ❌ NÃO EXISTE | Motorista não é notificado de aprovação/rejeição |
| Métricas de tempo | ❌ NÃO EXISTE | Não rastreia tempo de análise |

### 6.6 ⚠️ O QUE FALTA NO ADMIN WEB

| Componente | Status | Problema |
|------------|--------|----------|
| Visualização inline | ⚠️ LIMITADO | Abre em nova aba, não mostra inline |
| Comparação lado a lado | ❌ NÃO EXISTE | Não compara doc antigo vs novo |
| Bulk approval | ❌ NÃO EXISTE | Não aprova múltiplos docs de uma vez |
| Filtros avançados | ⚠️ LIMITADO | Não filtra por tipo de documento |
| Dashboard de métricas | ⚠️ LIMITADO | Métricas básicas, falta tempo médio de análise |

---

## 7. PLANO SPRINT 2 DOCUMENTAL

### 7.1 OBJETIVO

Implementar fluxo completo de upload, análise e aprovação de documentos no sistema KAVIAR, eliminando dependência de WhatsApp.

### 7.2 ESCOPO

**IN SCOPE:**
- Tela de upload de documentos no app (6 tipos)
- Preview e status de documentos no app
- Feedback de rejeição no app
- Melhorias na UI do admin para análise
- Auditoria básica de mudanças

**OUT OF SCOPE (futuro):**
- OCR/validação automática de documentos
- Notificações push
- Bulk approval
- Lifecycle policy S3
- Comparação lado a lado

### 7.3 ORDEM DE IMPLEMENTAÇÃO

#### FASE 1: APP - UPLOAD DE DOCUMENTOS (Prioridade MÁXIMA)

**Objetivo:** Motorista consegue enviar os 6 documentos obrigatórios

**Tarefas:**

1. **Criar tela de upload (`app/screens/DocumentUpload.tsx`)**
   - Lista os 6 tipos de documentos
   - Botão "Enviar Foto" ou "Escolher Arquivo"
   - Indicador de progresso (0/6, 3/6, 6/6)
   - Status por documento (pendente, enviado, aprovado, rejeitado)

2. **Implementar seleção de arquivo**
   - `expo-image-picker` para fotos
   - `expo-document-picker` para PDFs
   - Preview antes de enviar
   - Validação de tamanho (5MB) e tipo (JPEG, PNG, PDF)

3. **Implementar upload para S3**
   - Usar endpoint existente: `POST /api/drivers/me/documents`
   - Enviar multipart/form-data
   - Progress bar durante upload
   - Retry em caso de falha

4. **Implementar feedback visual**
   - ✅ Verde: documento aprovado
   - ⏳ Amarelo: documento em análise
   - ❌ Vermelho: documento rejeitado (mostrar motivo)
   - 📤 Cinza: documento não enviado

**Arquivos a criar:**
- `app/screens/DocumentUpload.tsx`
- `app/components/DocumentCard.tsx`
- `app/services/documentApi.ts`

**Dependências:**
```json
{
  "expo-image-picker": "~14.x",
  "expo-document-picker": "~11.x"
}
```

**Estimativa:** 2-3 dias

---

#### FASE 2: APP - VISUALIZAÇÃO E STATUS

**Objetivo:** Motorista vê status dos documentos e pode reenviar se rejeitado

**Tarefas:**

1. **Criar tela de status (`app/screens/DocumentStatus.tsx`)**
   - Lista documentos enviados
   - Mostra thumbnail/preview
   - Mostra status e data de envio
   - Mostra motivo de rejeição (se rejeitado)

2. **Implementar reenvio**
   - Botão "Reenviar" em documentos rejeitados
   - Reutiliza fluxo de upload
   - Atualiza status após reenvio

3. **Implementar consulta de status**
   - Endpoint: `GET /api/drivers/me/documents` (criar se não existir)
   - Polling a cada 30s quando na tela
   - Pull-to-refresh

**Arquivos a criar:**
- `app/screens/DocumentStatus.tsx`
- `app/components/DocumentStatusCard.tsx`

**Endpoint backend a criar:**
```typescript
// GET /api/drivers/me/documents
router.get('/me/documents', authenticateDriver, async (req, res) => {
  const driverId = req.userId;
  const documents = await prisma.driver_documents.findMany({
    where: { driver_id: driverId },
    orderBy: { created_at: 'desc' }
  });
  res.json({ success: true, data: documents });
});
```

**Estimativa:** 1-2 dias

---

#### FASE 3: BACKEND - MELHORIAS DE AUDITORIA

**Objetivo:** Rastrear histórico de mudanças de status

**Tarefas:**

1. **Criar tabela de histórico**

```sql
CREATE TABLE driver_document_history (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  changed_by_admin_id TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_document_history_document_id ON driver_document_history(document_id);
CREATE INDEX idx_document_history_driver_id ON driver_document_history(driver_id);
```

2. **Adicionar trigger ou service layer**
   - Ao aprovar/rejeitar documento, inserir em `driver_document_history`
   - Manter `driver_documents` como estado atual
   - `driver_document_history` como log imutável

3. **Criar endpoint de histórico**
```typescript
// GET /api/admin/drivers/:id/documents/history
router.get('/drivers/:id/documents/history', allowReadAccess, async (req, res) => {
  const { id } = req.params;
  const history = await prisma.driver_document_history.findMany({
    where: { driver_id: id },
    orderBy: { created_at: 'desc' }
  });
  res.json({ success: true, data: history });
});
```

**Arquivos a modificar:**
- `backend/prisma/schema.prisma`
- `backend/src/routes/admin-drivers.ts`
- `backend/src/services/driver-verification.ts`

**Estimativa:** 1 dia

---

#### FASE 4: ADMIN WEB - MELHORIAS DE UI

**Objetivo:** Admin consegue analisar documentos de forma eficiente

**Tarefas:**

1. **Melhorar modal de documentos em DriverApproval**
   - Mostrar thumbnail inline (não abrir nova aba)
   - Botões "Aprovar" e "Rejeitar" por documento
   - Campo de texto para motivo de rejeição
   - Indicador visual de status

2. **Adicionar filtros em ComplianceManagement**
   - Filtrar por tipo de documento
   - Filtrar por motorista
   - Filtrar por data de envio

3. **Adicionar histórico de mudanças**
   - Mostrar timeline de mudanças de status
   - Quem aprovou/rejeitou e quando
   - Motivos de rejeição anteriores

**Arquivos a modificar:**
- `frontend-app/src/pages/admin/DriverApproval.jsx`
- `frontend-app/src/pages/admin/ComplianceManagement.jsx`
- `frontend-app/src/components/admin/DocumentViewer.jsx` (criar)

**Estimativa:** 2 dias

---

#### FASE 5: STORAGE - MELHORIAS DE ORGANIZAÇÃO

**Objetivo:** Organizar documentos no S3 de forma estruturada

**Tarefas:**

1. **Atualizar path S3**
```typescript
// De: certidoes/{timestamp}-{random}.{ext}
// Para: documents/{driverId}/{docType}/{timestamp}.{ext}

key: (req, file, cb) => {
  const driverId = req.userId;
  const docType = file.fieldname; // cpf, rg, cnh, etc
  const timestamp = Date.now();
  const ext = path.extname(file.originalname);
  cb(null, `documents/${driverId}/${docType}/${timestamp}${ext}`);
}
```

2. **Adicionar metadados S3**
```typescript
metadata: (req, file, cb) => {
  cb(null, {
    driverId: req.userId,
    docType: file.fieldname,
    uploadedAt: new Date().toISOString()
  });
}
```

3. **Criar lifecycle policy (opcional)**
   - Mover documentos rejeitados para Glacier após 90 dias
   - Deletar documentos rejeitados após 1 ano

**Arquivos a modificar:**
- `backend/src/config/s3-upload.ts`

**Estimativa:** 0.5 dia

---

### 7.4 CHECKLIST DE VALIDAÇÃO

#### App (Driver)
- [ ] Motorista consegue acessar tela de upload
- [ ] Motorista consegue tirar foto ou escolher arquivo
- [ ] Motorista vê preview antes de enviar
- [ ] Motorista vê progress bar durante upload
- [ ] Motorista vê indicador de progresso (X/6 documentos)
- [ ] Motorista vê status de cada documento
- [ ] Motorista vê motivo de rejeição
- [ ] Motorista consegue reenviar documento rejeitado
- [ ] Motorista vê confirmação de sucesso após upload

#### Backend
- [ ] Endpoint `POST /api/drivers/me/documents` aceita 6 tipos
- [ ] Endpoint valida MIME type e tamanho
- [ ] Endpoint persiste em `driver_documents` com status `SUBMITTED`
- [ ] Endpoint retorna erro claro em caso de falha
- [ ] Endpoint `GET /api/drivers/me/documents` retorna lista de documentos
- [ ] Histórico de mudanças é registrado em `driver_document_history`
- [ ] Admin consegue aprovar/rejeitar via API
- [ ] Aprovação atualiza status para `VERIFIED`
- [ ] Rejeição atualiza status para `rejected` e salva motivo

#### Admin Web
- [ ] Admin vê lista de motoristas pendentes
- [ ] Admin consegue abrir modal com documentos
- [ ] Admin vê thumbnail de cada documento
- [ ] Admin consegue abrir documento em tamanho real
- [ ] Admin consegue aprovar documento individual
- [ ] Admin consegue rejeitar documento com motivo
- [ ] Admin vê histórico de mudanças de status
- [ ] Admin vê métricas de documentos pendentes

#### Storage
- [ ] Documentos são salvos em S3 com path estruturado
- [ ] Metadados incluem driverId e docType
- [ ] Presigned URLs funcionam corretamente
- [ ] Documentos são acessíveis apenas por admin/motorista dono

#### Auditoria
- [ ] Toda mudança de status é registrada em histórico
- [ ] Histórico inclui admin_id, timestamp, motivo
- [ ] Histórico é imutável (apenas INSERT)
- [ ] LGPD consent é registrado com IP e timestamp

---

### 7.5 RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Upload falha em rede lenta | Alta | Médio | Implementar retry automático, chunked upload |
| Motorista envia documento errado | Alta | Baixo | Preview antes de enviar, permitir reenvio |
| Admin rejeita por engano | Média | Médio | Confirmação antes de rejeitar, histórico completo |
| S3 bucket cheio | Baixa | Alto | Monitorar uso, lifecycle policy |
| Documentos sensíveis vazam | Baixa | Crítico | Presigned URLs com expiração, ACL privado |

---

### 7.6 MÉTRICAS DE SUCESSO

**Quantitativas:**
- 90% dos motoristas enviam todos os 6 documentos
- Tempo médio de análise < 24h
- Taxa de rejeição < 20%
- Taxa de reenvio após rejeição > 80%

**Qualitativas:**
- Motoristas não precisam usar WhatsApp para enviar documentos
- Admins conseguem analisar documentos de forma eficiente
- Auditoria completa de todas as mudanças de status

---

### 7.7 CRONOGRAMA ESTIMADO

| Fase | Duração | Dependências |
|------|---------|--------------|
| Fase 1: App Upload | 2-3 dias | Nenhuma |
| Fase 2: App Status | 1-2 dias | Fase 1 |
| Fase 3: Backend Auditoria | 1 dia | Nenhuma (paralelo) |
| Fase 4: Admin UI | 2 dias | Fase 3 |
| Fase 5: Storage | 0.5 dia | Nenhuma (paralelo) |
| **TOTAL** | **5-7 dias** | |

**Caminho crítico:** Fase 1 → Fase 2 → Validação end-to-end

---

## 8. PRÓXIMOS PASSOS IMEDIATOS

1. **Validar plano com stakeholders**
   - Confirmar escopo da Sprint 2
   - Confirmar prioridades (app > backend > admin)

2. **Preparar ambiente de desenvolvimento**
   - Instalar dependências: `expo-image-picker`, `expo-document-picker`
   - Configurar bucket S3 de staging (se não existir)

3. **Iniciar Fase 1: App Upload**
   - Criar branch: `feature/sprint2-document-upload`
   - Criar tela de upload
   - Implementar seleção de arquivo
   - Implementar upload para S3

4. **Testar end-to-end**
   - Motorista envia documento
   - Admin aprova/rejeita
   - Motorista vê status atualizado

---

**FIM DO PLANO SPRINT 2 DOCUMENTAL**
