# ✅ TESTE - CADASTRO MOTORISTA (MANEIRA KAVIAR)

**Data:** 01/03/2026 22:54 BRT  
**Commit:** `5fd05ce`  
**Objetivo:** Validar cadastro resiliente (com e sem bairro)

---

## 🎯 MUDANÇAS APLICADAS

### **1. Território Opcional**
- ✅ Cadastro funciona SEM bairro selecionado
- ✅ Cadastro funciona COM bairro selecionado
- ✅ Removido bloqueio hard-stop "Selecione seu bairro"
- ✅ Alerta de confirmação se usuário não selecionar bairro

### **2. Fluxo de Senha Corrigido**
- ✅ NÃO envia `password` no `POST /api/governance/driver`
- ✅ Chama `POST /api/auth/driver/set-password` após criar motorista
- ✅ Auto-login com `POST /api/auth/driver/login`
- ✅ Salva token via `authStore.setAuth`
- ✅ Redireciona para `/(driver)/online`

### **3. Fallback para Falhas**
- ✅ Se `loadSmartNeighborhoods()` falhar → tenta `loadNeighborhoods()`
- ✅ Se `loadNeighborhoods()` falhar → permite continuar sem bairros
- ✅ Alerta: "Não consegui carregar bairros agora. Você pode continuar sem escolher bairro."
- ✅ Sem loop infinito de tentativas

---

## 🧪 FLUXO DE TESTE 1: CADASTRO COM BAIRRO

### **Pré-requisitos**
- Backend rodando
- App kaviar-app rodando (`npx expo start`)
- Localização habilitada no dispositivo/emulador

### **Passos**

1. **Abrir app e ir para cadastro**
   - Abrir app kaviar
   - Clicar em "Cadastrar" (se houver link na tela de login)
   - OU navegar para `/(auth)/register`

2. **Preencher Step 1 (Dados Básicos)**
   - Nome: `Motorista Teste Com Bairro`
   - Email: `motorista.combairro@kaviar.com`
   - Telefone: `+5521999999999`
   - Senha: `senha123`
   - Clicar "Continuar"

3. **Step 2 (Território) - Permitir localização**
   - Permitir acesso à localização quando solicitado
   - Aguardar detecção automática de bairro
   - Verificar: bairro detectado aparece no topo
   - Verificar: lista de bairros próximos aparece
   - Verificar: badge de taxa (7% ou 12%) aparece

4. **Selecionar bairro e cadastrar**
   - Selecionar um bairro da lista (ou manter o detectado)
   - Clicar "Cadastrar"
   - Aguardar processamento

5. **Verificar sucesso**
   - Verificar: Alert "Cadastro Realizado!" aparece
   - Verificar: Mensagem mostra território selecionado
   - Verificar: Mensagem mostra tipo (Oficial 7% ou Virtual 12%)
   - Clicar "OK"
   - Verificar: App redireciona para `/(driver)/online`

### **Validação Backend**

```bash
# Verificar motorista criado
curl -X GET "https://api.kaviar.com/api/admin/drivers?email=motorista.combairro@kaviar.com" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Esperado:
# - driver existe
# - neighborhoodId preenchido
# - status = "pending"
# - password_hash preenchido
```

### **Critério GO**
- [ ] Cadastro concluído com sucesso
- [ ] Bairro foi salvo no banco
- [ ] Senha foi definida (password_hash existe)
- [ ] Auto-login funcionou
- [ ] Redirecionamento para /(driver)/online funcionou

---

## 🧪 FLUXO DE TESTE 2: CADASTRO SEM BAIRRO

### **Pré-requisitos**
- Backend rodando
- App kaviar-app rodando
- Localização NEGADA ou desabilitada

### **Passos**

1. **Abrir app e ir para cadastro**
   - Abrir app kaviar
   - Navegar para `/(auth)/register`

2. **Preencher Step 1 (Dados Básicos)**
   - Nome: `Motorista Teste Sem Bairro`
   - Email: `motorista.sembairro@kaviar.com`
   - Telefone: `+5521988888888`
   - Senha: `senha123`
   - Clicar "Continuar"

3. **Step 2 (Território) - Negar localização**
   - Negar acesso à localização quando solicitado
   - Verificar: Alert "Localização Negada" aparece
   - Clicar "OK"
   - Verificar: Lista de bairros carrega (fallback)

4. **NÃO selecionar bairro e tentar cadastrar**
   - NÃO selecionar nenhum bairro
   - Clicar "Cadastrar"
   - Verificar: Alert de confirmação aparece
   - Mensagem: "Você não selecionou um bairro. Deseja continuar mesmo assim?"
   - Clicar "Continuar"

5. **Verificar sucesso**
   - Verificar: Alert "Cadastro Realizado!" aparece
   - Verificar: Mensagem mostra "Território pode ser definido depois"
   - Clicar "OK"
   - Verificar: App redireciona para `/(driver)/online`

### **Validação Backend**

```bash
# Verificar motorista criado
curl -X GET "https://api.kaviar.com/api/admin/drivers?email=motorista.sembairro@kaviar.com" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Esperado:
# - driver existe
# - neighborhoodId = null (ou ausente)
# - status = "pending"
# - password_hash preenchido
```

### **Critério GO**
- [ ] Cadastro concluído com sucesso SEM bairro
- [ ] neighborhoodId não foi enviado (null no banco)
- [ ] Senha foi definida (password_hash existe)
- [ ] Auto-login funcionou
- [ ] Redirecionamento para /(driver)/online funcionou

---

## 🧪 FLUXO DE TESTE 3: FALHA AO CARREGAR BAIRROS

### **Cenário:** Backend não responde ou endpoint de bairros não existe

### **Simulação**

```bash
# Desligar backend temporariamente
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --desired-count 0 \
  --region us-east-1
```

### **Passos**

1. **Abrir app e ir para cadastro**
   - Abrir app kaviar
   - Navegar para `/(auth)/register`

2. **Preencher Step 1 e continuar**
   - Preencher dados básicos
   - Clicar "Continuar"

3. **Step 2 - Verificar fallback**
   - Permitir localização (se solicitado)
   - Aguardar tentativa de carregar bairros
   - Verificar: Alert "Não consegui carregar bairros agora" aparece
   - Verificar: Mensagem "Você pode continuar sem escolher bairro"
   - Clicar "OK"
   - Verificar: Lista de bairros vazia
   - Verificar: Botão "Cadastrar" ainda está habilitado

4. **Cadastrar sem bairro**
   - Clicar "Cadastrar"
   - Verificar: Cadastro prossegue (não trava)

### **Critério GO**
- [ ] App não trava em loading infinito
- [ ] Alert de fallback aparece
- [ ] Cadastro pode prosseguir sem bairros
- [ ] Sem loop de tentativas

---

## 🚫 CRITÉRIO NO-GO

**Bloqueia se:**
- [ ] Cadastro bloqueia por falta de bairro (hard-stop)
- [ ] Erro 400/500 por enviar password no endpoint errado
- [ ] Loop infinito de loading/alerts
- [ ] App trava no Step 2
- [ ] Auto-login não funciona
- [ ] Redirecionamento não funciona

---

## 📊 VALIDAÇÃO COMPLETA

### **Comandos de validação**

```bash
# 1. Verificar motorista COM bairro
curl -X GET "https://api.kaviar.com/api/admin/drivers?email=motorista.combairro@kaviar.com" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq '.drivers[0] | {id, name, email, neighborhoodId, status}'

# 2. Verificar motorista SEM bairro
curl -X GET "https://api.kaviar.com/api/admin/drivers?email=motorista.sembairro@kaviar.com" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq '.drivers[0] | {id, name, email, neighborhoodId, status}'

# 3. Testar login manual (ambos devem funcionar)
curl -X POST "https://api.kaviar.com/api/auth/driver/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"motorista.combairro@kaviar.com","password":"senha123"}'

curl -X POST "https://api.kaviar.com/api/auth/driver/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"motorista.sembairro@kaviar.com","password":"senha123"}'
```

---

## ✅ CHECKLIST FINAL

### **Funcionalidades**
- [ ] Cadastro COM bairro funciona
- [ ] Cadastro SEM bairro funciona
- [ ] Fallback de bairros funciona
- [ ] set-password funciona
- [ ] Auto-login funciona
- [ ] Redirecionamento funciona

### **Resiliência**
- [ ] Sem bloqueio hard-stop por falta de bairro
- [ ] Sem erro 400/500 por password no endpoint errado
- [ ] Sem loop infinito de loading
- [ ] Sem travamento no Step 2

### **UX Mantida**
- [ ] Step 1 + Step 2 preservados
- [ ] GPS + lista de bairros preservados
- [ ] Visual de taxa (7%/12%) preservado
- [ ] Detecção automática preservada

---

## 🎯 RESUMO

**Commit:** `5fd05ce`

**Mudanças:**
- Território opcional (não bloqueia)
- Fluxo de senha corrigido (set-password separado)
- Auto-login implementado
- Fallback para falhas de bairros
- UI/UX mantida

**Testes:**
1. Cadastro COM bairro ✅
2. Cadastro SEM bairro ✅
3. Falha ao carregar bairros ✅

**Status:** ✅ Pronto para teste

---

**FIM DAS INSTRUÇÕES DE TESTE**
