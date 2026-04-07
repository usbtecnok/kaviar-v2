# Sprint 1: Onboarding Motorista - Entrega

## Commit

**Hash:** `702bf7e`  
**Mensagem:** feat: add required fields for driver registration (CPF, terms, vehicle)

**Mudanças:**
- `app/(auth)/register.tsx` - 3 steps, novos campos obrigatórios
- `backend/src/routes/driver-auth.ts` - Schema + persist + consent LGPD

---

## Próximo Build

```bash
cd /home/goes/kaviar
eas build --platform android --profile driver-apk
```

---

## Checklist de Teste

### 1. Teste no Celular (App)

**Step 1 - Dados Pessoais:**
- [ ] Nome completo
- [ ] Email
- [ ] Telefone
- [ ] CPF (11 dígitos)
- [ ] Senha (mínimo 6 caracteres)
- [ ] Checkbox "Aceito os termos" (obrigatório)
- [ ] Validação: CPF vazio → erro
- [ ] Validação: Termos não aceitos → erro
- [ ] Botão "Continuar" → Step 2

**Step 2 - Dados do Veículo:**
- [ ] Cor do veículo (obrigatório)
- [ ] Modelo do veículo (opcional)
- [ ] Placa do veículo (opcional)
- [ ] Validação: Cor vazia → erro
- [ ] Botão "Voltar" → Step 1
- [ ] Botão "Continuar" → Step 3

**Step 3 - Território:**
- [ ] Solicita permissão de localização
- [ ] Carrega lista de bairros
- [ ] Permite selecionar bairro (opcional)
- [ ] Botão "Voltar" → Step 2
- [ ] Botão "Cadastrar" → Envia dados

**Resultado esperado:**
- [ ] Mensagem "Cadastro Realizado! Aguarde aprovação do admin"
- [ ] Redireciona para tela /(driver)/online
- [ ] App não crasha

---

### 2. Teste no Backend (Logs)

```bash
# Ver logs do backend
docker logs kaviar-backend-prod --tail 100 -f
```

**Verificar:**
- [ ] POST /api/auth/driver/register → 201 Created
- [ ] Driver criado com status `pending`
- [ ] Campos persistidos:
  - [ ] document_cpf
  - [ ] vehicle_color
  - [ ] vehicle_model (se preenchido)
  - [ ] vehicle_plate (se preenchido)
- [ ] Consent LGPD criado na tabela `consents`
- [ ] Driver verification criado na tabela `driver_verifications`

---

### 3. Teste no Admin (Aprovação)

**Acessar:** https://admin.kaviar.com.br

**Verificar motorista cadastrado:**
- [ ] Aparece na lista de motoristas pendentes
- [ ] Status: `pending`
- [ ] Nome, email, telefone visíveis
- [ ] CPF visível
- [ ] Cor do veículo visível
- [ ] Modelo/placa visíveis (se preenchidos)

**Tentar aprovar:**
- [ ] Clicar em "Aprovar"
- [ ] Verificar mensagem de erro:
  - ✅ Se aparecer "Documentos obrigatórios pendentes" → CORRETO (falta RG, CNH, etc)
  - ❌ Se aparecer "CPF obrigatório" → ERRO (não deveria mais aparecer)
  - ❌ Se aparecer "Cor do veículo obrigatória" → ERRO (não deveria mais aparecer)

**Verificar checklist de elegibilidade:**
```
✅ LGPD Consent: VERIFIED
✅ Vehicle Color: PRESENT
✅ CPF: PRESENT
❌ RG: MISSING (obrigatório)
❌ CNH: MISSING (obrigatório)
❌ PROOF_OF_ADDRESS: MISSING (obrigatório)
❌ VEHICLE_PHOTO: MISSING (obrigatório)
❌ BACKGROUND_CHECK: MISSING (obrigatório - antecedentes criminais)
```

**IMPORTANTE:** Todos os 6 documentos são **obrigatórios** para aprovação. O motorista permanecerá com status `pending` até que todos sejam enviados e verificados.

---

## Critérios de Sucesso

### ✅ Sprint 1 Completa se:

1. **App coleta dados mínimos:**
   - CPF ✅
   - Termos LGPD ✅
   - Cor do veículo ✅

2. **Backend persiste corretamente:**
   - Campos salvos no banco ✅
   - Consent LGPD registrado ✅
   - Driver verification criado ✅

3. **Admin reconhece dados:**
   - Motorista aparece com dados completos ✅
   - Erro de aprovação menciona apenas documentos faltantes ✅
   - Não menciona mais CPF ou cor do veículo ✅

---

## Próximos Passos (Sprint 2)

**Documentos obrigatórios para aprovação:**

### 6 Documentos CRÍTICOS (bloqueantes):
1. **RG** - Documento de identidade (frente e verso)
2. **CNH** - Carteira de habilitação (frente e verso)
3. **Comprovante de residência** - Conta de luz/água/telefone
4. **Foto do veículo** - 4 ângulos (frente, traseira, laterais)
5. **Antecedentes criminais** - Certidão de nada consta (obrigatório)
6. **CPF** - ✅ Já coletado na Sprint 1

### Implementação Sprint 2:

**Opção A - Processo Manual (recomendado para MVP):**
- Admin solicita documentos via WhatsApp
- Motorista envia fotos dos documentos
- Admin faz upload manual no painel
- Admin verifica e aprova

**Opção B - Upload no App (automatizado):**
- Implementar tela de upload de documentos
- Integração com S3 para armazenamento
- Preview e validação de qualidade
- Envio direto para análise do admin

**IMPORTANTE:** Sem os 6 documentos completos (incluindo antecedentes criminais), o motorista **não pode ser aprovado** pelo admin.
