# CORREÇÃO BUG CRÍTICO - FLUXO ONBOARDING MOTORISTA
**Data:** 2026-03-09  
**Status:** ✅ CORRIGIDO

---

## CAUSA RAIZ IDENTIFICADA

O sistema estava encerrando o fluxo de documentos prematuramente e deixando motoristas em estado inconsistente:

### Problemas Identificados

1. **Frontend não validava documentos completos**
   - `app/(driver)/documents.tsx` permitia upload parcial
   - Não verificava se TODOS os 6 documentos obrigatórios foram enviados
   - Não redirecionava após upload (motorista ficava na mesma tela)

2. **Redirecionamento automático incorreto**
   - `app/index.tsx` e `app/(auth)/login.tsx` redirecionavam TODOS os motoristas para `/(driver)/online`
   - Não verificavam se motorista estava `pending` ou `approved`
   - Motorista pending caía direto na tela "Bem-vindo" que o bloqueava

3. **Falta de tela intermediária**
   - Não existia tela de "Aguardando Aprovação"
   - Motorista ficava sem feedback após enviar documentos
   - Não havia como verificar status da aprovação

4. **Backend validava status mas não documentos**
   - `backend/src/routes/drivers.ts` linha 110: valida `status === 'approved'` para ficar online
   - Mas não impedia upload parcial de documentos
   - Admin recebia motoristas com documentação incompleta

---

## ARQUIVOS MODIFICADOS

### Frontend

#### 1. `app/(driver)/documents.tsx`
**Mudanças:**
- ✅ Adicionado `useRouter` para navegação
- ✅ Validação obrigatória: só permite enviar se TODOS os 6 documentos estiverem selecionados
- ✅ Mensagem clara mostrando quais documentos faltam
- ✅ Após upload bem-sucedido, redireciona para `/(driver)/pending-approval`

**Código crítico adicionado:**
```typescript
// Validar se TODOS os documentos obrigatórios foram selecionados
const allRequiredDocs = DOCUMENT_TYPES.filter(d => d.required).map(d => d.type);
const uploadedOrSelected = Object.entries(documents)
  .filter(([_, doc]) => doc && (doc.status === 'uploaded' || doc.status === 'verified' || doc.status === 'selected'))
  .map(([type, _]) => type);

const missingDocs = allRequiredDocs.filter(type => !uploadedOrSelected.includes(type));

if (missingDocs.length > 0) {
  Alert.alert(
    'Documentos Incompletos',
    `Você precisa enviar TODOS os documentos obrigatórios antes de prosseguir.\n\nFaltam: ${missingLabels}`
  );
  return;
}
```

#### 2. `app/(driver)/pending-approval.tsx` (NOVO)
**Criado do zero:**
- ✅ Tela de aguardando aprovação
- ✅ Mostra status atual do motorista
- ✅ Polling automático a cada 30s para verificar se foi aprovado
- ✅ Redireciona automaticamente para `/(driver)/online` quando aprovado
- ✅ Botão de atualizar status manual
- ✅ Mensagem clara sobre tempo de aprovação (até 48h)

#### 3. `app/index.tsx`
**Mudanças:**
- ✅ Verifica `user.status` antes de redirecionar
- ✅ Se `status === 'pending'` → redireciona para `/(driver)/pending-approval`
- ✅ Se `status === 'approved'` → redireciona para `/(driver)/online`

#### 4. `app/(auth)/login.tsx`
**Mudanças:**
- ✅ Verifica `user.status` após login
- ✅ Redireciona para tela correta baseado no status

### Backend

#### 5. `backend/src/routes/drivers.ts`
**Mudanças:**
- ✅ Adicionado endpoint `GET /api/drivers/me`
- ✅ Retorna dados completos do motorista incluindo `status`
- ✅ Usado pela tela `pending-approval.tsx` para polling

**Código adicionado:**
```typescript
// GET /api/drivers/me - Retornar dados do motorista autenticado
router.get('/me', authenticateDriver, async (req: Request, res: Response) => {
  const driver = await prisma.drivers.findUnique({
    where: { id: driverId },
    select: {
      id: true,
      name: true,
      status: true,
      // ... outros campos
    }
  });
  res.json({ success: true, driver });
});
```

---

## FLUXO CORRIGIDO

### Cadastro Novo Motorista

1. **Cadastro** (`register.tsx`)
   - Motorista preenche dados pessoais, veículo, território
   - Status inicial: `pending`
   - Redireciona para `/(driver)/documents`

2. **Upload de Documentos** (`documents.tsx`)
   - Motorista seleciona os 6 documentos obrigatórios:
     - CPF
     - RG
     - CNH
     - Comprovante de Residência
     - Foto do Veículo
     - Antecedentes Criminais
   - **VALIDAÇÃO:** Sistema só permite enviar se TODOS estiverem selecionados
   - Após envio bem-sucedido, redireciona para `/(driver)/pending-approval`

3. **Aguardando Aprovação** (`pending-approval.tsx`)
   - Mostra status "EM ANÁLISE"
   - Polling automático a cada 30s
   - Quando admin aprovar, redireciona automaticamente para `/(driver)/online`

4. **Aprovação no Admin**
   - Admin acessa painel de aprovação
   - Valida documentos (backend já garante que todos foram enviados)
   - Aprova motorista
   - Status muda para `approved`

5. **Motorista Aprovado** (`online.tsx`)
   - Motorista pode clicar em "Ficar Online"
   - Sistema valida `status === 'approved'` ✅
   - Motorista começa a trabalhar

### Login Motorista Existente

1. **Login** (`login.tsx`)
   - Verifica `user.status`
   - Se `pending` → `/(driver)/pending-approval`
   - Se `approved` → `/(driver)/online`

---

## VALIDAÇÃO DO FLUXO

### Checklist de Teste

- [ ] **Cadastro completo**
  - [ ] Preencher formulário de cadastro
  - [ ] Verificar redirecionamento para tela de documentos
  
- [ ] **Upload de documentos**
  - [ ] Tentar enviar apenas 1 documento → deve bloquear com mensagem clara
  - [ ] Selecionar todos os 6 documentos obrigatórios
  - [ ] Enviar → deve mostrar sucesso e redirecionar para pending-approval
  
- [ ] **Tela de aguardando aprovação**
  - [ ] Verificar se mostra "EM ANÁLISE"
  - [ ] Verificar se polling está funcionando (console logs)
  - [ ] Clicar em "Atualizar Status" → deve buscar status atual
  
- [ ] **Aprovação no admin**
  - [ ] Admin acessa painel de motoristas pendentes
  - [ ] Verifica que motorista tem TODOS os documentos
  - [ ] Aprova motorista
  - [ ] Verifica que status mudou para `approved`
  
- [ ] **Motorista aprovado**
  - [ ] App do motorista detecta aprovação automaticamente
  - [ ] Mostra alert "Parabéns! Sua conta foi aprovada!"
  - [ ] Redireciona para tela online
  - [ ] Motorista clica em "Ficar Online" → deve funcionar ✅
  
- [ ] **Login após aprovação**
  - [ ] Fazer logout
  - [ ] Fazer login novamente
  - [ ] Verificar que vai direto para tela online (não para pending-approval)

---

## DOCUMENTOS OBRIGATÓRIOS

Definidos em `app/(driver)/documents.tsx`:

```typescript
const DOCUMENT_TYPES = [
  { type: 'cpf', label: 'CPF', required: true },
  { type: 'rg', label: 'RG', required: true },
  { type: 'cnh', label: 'CNH', required: true },
  { type: 'proofOfAddress', label: 'Comprovante de Residência', required: true },
  { type: 'vehiclePhoto', label: 'Foto do Veículo', required: true },
  { type: 'backgroundCheck', label: 'Antecedentes Criminais', required: true },
];
```

Validados no backend em `backend/src/routes/drivers.ts` (linhas 280-295):

```typescript
const missing: string[] = [];
requireOne('cpf');
requireOne('rg');
requireOne('cnh');
requireOne('proofOfAddress');
requireOne('vehiclePhoto');
requireOne('backgroundCheck');

if (missing.length > 0) {
  return res.status(400).json({
    success: false,
    error: 'MISSING_FILES',
    message: 'Documentos obrigatórios pendentes',
    missingFiles: missing
  });
}
```

---

## ESTADOS DO MOTORISTA

| Status | Descrição | Pode Ficar Online? | Tela |
|--------|-----------|-------------------|------|
| `pending` | Aguardando aprovação | ❌ Não | `pending-approval` |
| `approved` | Aprovado pelo admin | ✅ Sim | `online` |
| `rejected` | Rejeitado pelo admin | ❌ Não | `pending-approval` (com mensagem) |
| `suspended` | Suspenso temporariamente | ❌ Não | `online` (com bloqueio) |

---

## ENDPOINTS RELEVANTES

### Frontend → Backend

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/drivers/me/documents` | Upload de documentos (multipart/form-data) |
| GET | `/api/drivers/me` | Buscar dados do motorista (incluindo status) |
| POST | `/api/drivers/me/online` | Tentar ficar online (valida status) |

### Admin → Backend

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| PUT | `/api/admin/drivers/:id/approve` | Aprovar motorista |
| GET | `/api/admin/drivers?status=pending` | Listar motoristas pendentes |

---

## LOGS IMPORTANTES

### Frontend
```
[LOGIN] Resposta recebida: { user: { status: 'pending' } }
[PENDING_APPROVAL] Verificando status...
[PENDING_APPROVAL] Status atual: pending
[PENDING_APPROVAL] Status mudou para: approved
```

### Backend
```
[UPLOAD] Driver ID: driver-123
[UPLOAD] Files received: ['cpf', 'rg', 'cnh', 'proofOfAddress', 'vehiclePhoto', 'backgroundCheck']
✓ Upserted driver_document: CPF
✓ Upserted driver_document: RG
...
[APPROVE] Driver driver-123 approved
```

---

## PRÓXIMOS PASSOS

1. ✅ Testar fluxo completo em desenvolvimento
2. ✅ Validar com motorista real
3. ✅ Deploy em staging
4. ✅ Teste de regressão
5. ✅ Deploy em produção
6. ✅ Monitorar logs de aprovação

---

## NOTAS TÉCNICAS

- **Polling:** A tela `pending-approval.tsx` faz polling a cada 30s. Considerar usar WebSocket/Push Notification no futuro para notificação em tempo real.
- **Cache:** O `authStore` pode cachear o status. Garantir que `checkStatus()` sempre busca do backend.
- **Timeout:** Aprovação pode levar até 48h. Considerar adicionar notificação por email/SMS quando aprovado.
