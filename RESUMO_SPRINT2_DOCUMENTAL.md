# RESUMO EXECUTIVO: SISTEMA DOCUMENTAL KAVIAR

**Data:** 2026-03-07  
**Modo:** KAVIAR (fluxo oficial, sem WhatsApp)

---

## SITUAÇÃO ATUAL

### ✅ O QUE JÁ FUNCIONA

**Backend:**
- Infraestrutura S3 completa (bucket, presigned URLs, upload)
- Endpoint de upload: `POST /api/drivers/me/documents`
- Validação de aprovação: `evaluateEligibility()` lê 6 documentos obrigatórios
- Tabelas: `driver_documents` (aprovação) e `driver_compliance_documents` (revalidação)
- Endpoints admin: aprovar/rejeitar/listar documentos
- Auditoria básica: admin_id, timestamps, motivo de rejeição

**Admin Web:**
- Página ComplianceManagement: aprovar/rejeitar documentos
- Página DriverApproval: lista motoristas, mostra veículo, carrega documentos
- Visualização de documentos via presigned URLs

### ❌ O QUE FALTA

**App (Driver):**
- ❌ Tela de upload de documentos (motorista não consegue enviar)
- ❌ Preview e status de documentos
- ❌ Feedback de rejeição
- ❌ Reenvio após rejeição

**Backend:**
- ⚠️ Histórico de mudanças (driver_documents faz UPSERT, perde histórico)
- ❌ Endpoint `GET /api/drivers/me/documents` (motorista ver seus docs)

**Admin Web:**
- ⚠️ Visualização inline (abre em nova aba)
- ⚠️ Filtros limitados

**Storage:**
- ⚠️ Path S3 não estruturado (tudo em `certidoes/`)
- ⚠️ Metadados S3 limitados

---

## DOCUMENTOS OBRIGATÓRIOS

**Fonte de verdade:** `backend/src/services/driver-verification.ts`

```typescript
const requiredDocs = [
  'CPF',
  'RG', 
  'CNH',
  'PROOF_OF_ADDRESS',
  'VEHICLE_PHOTO',
  'BACKGROUND_CHECK'
];
```

**Status aceitos para aprovação:**
- `SUBMITTED` (enviado pelo motorista)
- `VERIFIED` (verificado pelo admin)

---

## FLUXO ATUAL (INCOMPLETO)

```
1. Motorista se cadastra (Sprint 1) ✅
   ↓
2. Motorista envia documentos via WhatsApp ❌ (workaround)
   ↓
3. Admin recebe por WhatsApp ❌
   ↓
4. Admin faz upload manual no sistema ❌
   ↓
5. Admin aprova motorista ✅
```

---

## FLUXO DESEJADO (SPRINT 2)

```
1. Motorista se cadastra (Sprint 1) ✅
   ↓
2. Motorista acessa tela de upload no app ✅ (Sprint 2)
   ↓
3. Motorista tira foto/escolhe arquivo ✅ (Sprint 2)
   ↓
4. App envia para S3 via backend ✅ (já existe)
   ↓
5. Backend persiste em driver_documents ✅ (já existe)
   ↓
6. Admin vê documentos no painel ✅ (já existe)
   ↓
7. Admin aprova/rejeita ✅ (já existe)
   ↓
8. Motorista vê status atualizado ✅ (Sprint 2)
   ↓
9. Se rejeitado, motorista reenvia ✅ (Sprint 2)
```

---

## PLANO SPRINT 2

### FASE 1: APP - UPLOAD (Prioridade MÁXIMA)
**Duração:** 2-3 dias

**Entregas:**
- Tela de upload com 6 tipos de documentos
- Seleção de foto/arquivo (expo-image-picker, expo-document-picker)
- Preview antes de enviar
- Upload para endpoint existente: `POST /api/drivers/me/documents`
- Indicador de progresso (X/6 documentos)
- Feedback visual (pendente, enviado, aprovado, rejeitado)

**Arquivos a criar:**
- `app/screens/DocumentUpload.tsx`
- `app/components/DocumentCard.tsx`
- `app/services/documentApi.ts`

---

### FASE 2: APP - STATUS E REENVIO
**Duração:** 1-2 dias

**Entregas:**
- Tela de status de documentos
- Consulta de status via API
- Reenvio de documentos rejeitados
- Motivo de rejeição visível

**Endpoint backend a criar:**
```typescript
GET /api/drivers/me/documents
```

---

### FASE 3: BACKEND - AUDITORIA
**Duração:** 1 dia

**Entregas:**
- Tabela `driver_document_history` (log imutável)
- Trigger/service para registrar mudanças
- Endpoint de histórico para admin

---

### FASE 4: ADMIN WEB - MELHORIAS
**Duração:** 2 dias

**Entregas:**
- Visualização inline de documentos
- Botões aprovar/rejeitar por documento
- Histórico de mudanças visível
- Filtros avançados

---

### FASE 5: STORAGE - ORGANIZAÇÃO
**Duração:** 0.5 dia

**Entregas:**
- Path S3 estruturado: `documents/{driverId}/{docType}/{timestamp}.{ext}`
- Metadados S3 completos (driverId, docType, uploadedAt)

---

## CRONOGRAMA

| Fase | Duração | Pode iniciar |
|------|---------|--------------|
| Fase 1: App Upload | 2-3 dias | Imediatamente |
| Fase 2: App Status | 1-2 dias | Após Fase 1 |
| Fase 3: Backend Auditoria | 1 dia | Paralelo (Fase 1) |
| Fase 4: Admin UI | 2 dias | Após Fase 3 |
| Fase 5: Storage | 0.5 dia | Paralelo (qualquer momento) |
| **TOTAL** | **5-7 dias** | |

---

## VALIDAÇÃO END-TO-END

**Cenário de sucesso:**

1. ✅ Motorista abre app e vê tela "Enviar Documentos"
2. ✅ Motorista tira foto do CPF e envia
3. ✅ App mostra "CPF enviado, aguardando análise"
4. ✅ Admin abre painel e vê documento do motorista
5. ✅ Admin aprova CPF
6. ✅ Motorista vê "CPF aprovado ✅"
7. ✅ Motorista repete para os 6 documentos
8. ✅ Sistema valida elegibilidade (6/6 documentos)
9. ✅ Admin aprova motorista
10. ✅ Motorista recebe acesso completo

**Cenário de rejeição:**

1. ✅ Admin rejeita CNH (motivo: "foto borrada")
2. ✅ Motorista vê "CNH rejeitada ❌ - foto borrada"
3. ✅ Motorista clica "Reenviar"
4. ✅ Motorista tira nova foto e envia
5. ✅ Admin aprova nova CNH
6. ✅ Motorista vê "CNH aprovada ✅"

---

## MÉTRICAS DE SUCESSO

**Quantitativas:**
- 90% dos motoristas enviam todos os 6 documentos
- Tempo médio de análise < 24h
- Taxa de rejeição < 20%
- Taxa de reenvio após rejeição > 80%

**Qualitativas:**
- ✅ Motoristas não usam WhatsApp para enviar documentos
- ✅ Admins analisam documentos de forma eficiente
- ✅ Auditoria completa de todas as mudanças

---

## PRÓXIMOS PASSOS IMEDIATOS

1. **Validar plano** (este documento)
2. **Instalar dependências:**
   ```bash
   cd /home/goes/kaviar
   npx expo install expo-image-picker expo-document-picker
   ```
3. **Criar branch:**
   ```bash
   git checkout -b feature/sprint2-document-upload
   ```
4. **Iniciar Fase 1:**
   - Criar `app/screens/DocumentUpload.tsx`
   - Implementar seleção de arquivo
   - Implementar upload

---

## ARQUIVOS DE REFERÊNCIA

**Investigação completa:**
- `INVESTIGACAO_SISTEMA_DOCUMENTAL.md` - Mapeamento completo do sistema

**Plano detalhado:**
- `PLANO_SPRINT2_DOCUMENTAL.md` - Gap analysis e plano de implementação

**Código existente:**
- `backend/src/routes/drivers.ts` (linhas 119-380) - Endpoint de upload
- `backend/src/services/driver-verification.ts` (linhas 50-120) - Validação
- `backend/src/config/s3-upload.ts` - Configuração S3
- `frontend-app/src/pages/admin/DriverApproval.jsx` - UI admin
- `frontend-app/src/pages/admin/ComplianceManagement.jsx` - UI compliance

---

**STATUS:** Pronto para iniciar implementação  
**BLOQUEADORES:** Nenhum  
**DEPENDÊNCIAS EXTERNAS:** Nenhuma
