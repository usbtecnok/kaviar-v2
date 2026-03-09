# ROTEIRO DE TESTE MANUAL - ONBOARDING MOTORISTA

**Data:** 2026-03-09  
**Testador:** _____________  
**Ambiente:** [ ] Dev [ ] Staging [ ] Produção

---

## PRÉ-REQUISITOS

- [ ] Backend rodando
- [ ] App mobile rodando (Expo)
- [ ] Acesso ao painel admin
- [ ] Documentos de teste preparados (6 arquivos)

---

## TESTE 1: CADASTRO COMPLETO

### Passo 1.1: Cadastro Inicial
1. Abrir app mobile
2. Clicar em "Cadastre-se"
3. Preencher:
   - Nome: "Motorista Teste"
   - Email: "teste-$(date)@test.com"
   - Telefone: "+5521999999999"
   - CPF: "12345678901"
   - Senha: "test123456"
4. Aceitar termos
5. Clicar em "Continuar"

**Resultado esperado:**
- [ ] Avança para passo 2 (dados do veículo)

### Passo 1.2: Dados do Veículo
1. Preencher:
   - Cor: "Branco"
   - Modelo: "Gol" (opcional)
   - Placa: "ABC1234" (opcional)
2. Marcar "Bônus Familiar" (opcional)
3. Clicar em "Continuar"

**Resultado esperado:**
- [ ] Avança para passo 3 (território)

### Passo 1.3: Território
1. Permitir acesso à localização
2. Verificar bairro detectado
3. Clicar em "Cadastrar"

**Resultado esperado:**
- [ ] Mostra alert "Cadastro Realizado!"
- [ ] Redireciona para tela de documentos

---

## TESTE 2: UPLOAD PARCIAL (DEVE FALHAR)

### Passo 2.1: Selecionar Apenas 1 Documento
1. Na tela "Enviar Documentos"
2. Clicar em "CPF"
3. Tirar foto ou escolher arquivo
4. Verificar que botão "Enviar Documentos" aparece
5. Clicar em "Enviar Documentos"

**Resultado esperado:**
- [ ] Mostra alert "Documentos Incompletos"
- [ ] Lista quais documentos faltam
- [ ] NÃO envia
- [ ] Permanece na tela de documentos

### Passo 2.2: Verificar Contador
1. Verificar contador no topo: "1/6 documentos enviados"

**Resultado esperado:**
- [ ] Contador mostra progresso correto

---

## TESTE 3: UPLOAD COMPLETO

### Passo 3.1: Selecionar Todos os Documentos
1. Selecionar CPF (já selecionado)
2. Selecionar RG
3. Selecionar CNH
4. Selecionar Comprovante de Residência
5. Selecionar Foto do Veículo
6. Selecionar Antecedentes Criminais

**Resultado esperado:**
- [ ] Todos os cards mostram preview/ícone
- [ ] Contador mostra "6/6 documentos enviados"

### Passo 3.2: Enviar Documentos
1. Clicar em "Enviar Documentos"
2. Aguardar upload

**Resultado esperado:**
- [ ] Mostra loading
- [ ] Mostra alert "Documentos Enviados!"
- [ ] Redireciona para tela "Aguardando Aprovação"

---

## TESTE 4: TELA AGUARDANDO APROVAÇÃO

### Passo 4.1: Verificar Conteúdo
1. Verificar elementos na tela:
   - [ ] Ícone de relógio
   - [ ] Título "Aguardando Aprovação"
   - [ ] Nome do motorista
   - [ ] Mensagem explicativa
   - [ ] Box de informação (48 horas)
   - [ ] Status "EM ANÁLISE"
   - [ ] Botão "Atualizar Status"
   - [ ] Botão "Sair"

### Passo 4.2: Atualizar Status
1. Clicar em "Atualizar Status"

**Resultado esperado:**
- [ ] Faz requisição ao backend
- [ ] Status permanece "EM ANÁLISE" (ainda não aprovado)

### Passo 4.3: Tentar Acessar Tela Online
1. Fechar app
2. Reabrir app

**Resultado esperado:**
- [ ] Redireciona automaticamente para "Aguardando Aprovação"
- [ ] NÃO vai para tela "Bem-vindo"

---

## TESTE 5: TENTATIVA DE FICAR ONLINE (DEVE FALHAR)

### Passo 5.1: Verificar Backend
1. Abrir Postman/Insomnia
2. Fazer login como motorista
3. Tentar POST `/api/drivers/me/online`

**Resultado esperado:**
```json
{
  "success": false,
  "error": "Apenas motoristas aprovados podem ficar online",
  "currentStatus": "pending"
}
```

---

## TESTE 6: APROVAÇÃO NO ADMIN

### Passo 6.1: Acessar Painel Admin
1. Abrir painel admin
2. Fazer login como admin
3. Ir em "Motoristas" → "Pendentes"

**Resultado esperado:**
- [ ] Motorista aparece na lista
- [ ] Mostra todos os 6 documentos enviados

### Passo 6.2: Verificar Documentos
1. Clicar no motorista
2. Verificar cada documento:
   - [ ] CPF
   - [ ] RG
   - [ ] CNH
   - [ ] Comprovante de Residência
   - [ ] Foto do Veículo
   - [ ] Antecedentes Criminais

**Resultado esperado:**
- [ ] Todos os documentos estão presentes
- [ ] Documentos podem ser visualizados

### Passo 6.3: Aprovar Motorista
1. Clicar em "Aprovar"
2. Confirmar aprovação

**Resultado esperado:**
- [ ] Mostra mensagem de sucesso
- [ ] Motorista sai da lista de pendentes
- [ ] Status muda para "approved"

---

## TESTE 7: DETECÇÃO AUTOMÁTICA DE APROVAÇÃO

### Passo 7.1: Aguardar Polling
1. Voltar para o app mobile (ainda na tela "Aguardando Aprovação")
2. Aguardar até 30 segundos

**Resultado esperado:**
- [ ] App detecta aprovação automaticamente
- [ ] Mostra alert "Parabéns! Sua conta foi aprovada!"
- [ ] Redireciona para tela "Bem-vindo"

### Passo 7.2: Verificar Tela Online
1. Verificar elementos:
   - [ ] Título "Bem-vindo!"
   - [ ] Nome do motorista
   - [ ] Status "OFFLINE"
   - [ ] Botão "Ficar Online"

---

## TESTE 8: FICAR ONLINE (DEVE FUNCIONAR)

### Passo 8.1: Ativar Online
1. Clicar em "Ficar Online"
2. Permitir acesso à localização

**Resultado esperado:**
- [ ] Mostra alert "Sucesso! Você está online!"
- [ ] Status muda para "ONLINE"
- [ ] Botão muda para "Ver Corridas" e "Ficar Offline"

### Passo 8.2: Verificar Backend
1. Verificar no banco de dados:
   - [ ] `drivers.status = 'approved'`
   - [ ] `drivers.available = true`
   - [ ] `drivers.last_active_at` atualizado

---

## TESTE 9: LOGIN APÓS APROVAÇÃO

### Passo 9.1: Logout e Login
1. Clicar em "Sair"
2. Fazer login novamente com mesmo email/senha

**Resultado esperado:**
- [ ] Redireciona direto para tela "Bem-vindo" (online)
- [ ] NÃO passa pela tela "Aguardando Aprovação"

---

## TESTE 10: REGRESSÃO - MOTORISTA REJEITADO

### Passo 10.1: Criar Novo Motorista
1. Cadastrar novo motorista
2. Enviar todos os documentos
3. No admin, REJEITAR motorista

### Passo 10.2: Verificar Comportamento
1. App detecta rejeição
2. Mostra alert "Cadastro Rejeitado"

**Resultado esperado:**
- [ ] Mensagem clara de rejeição
- [ ] Orientação para contatar suporte

---

## CHECKLIST FINAL

### Funcionalidades Críticas
- [ ] Cadastro completo funciona
- [ ] Upload parcial é bloqueado
- [ ] Upload completo é aceito
- [ ] Redireciona para pending-approval
- [ ] Polling detecta aprovação
- [ ] Motorista pending não pode ficar online
- [ ] Motorista approved pode ficar online
- [ ] Login redireciona para tela correta

### Validações
- [ ] Mensagens de erro são claras
- [ ] Contador de documentos está correto
- [ ] Status é exibido corretamente
- [ ] Botões aparecem/desaparecem conforme esperado

### UX
- [ ] Fluxo é intuitivo
- [ ] Não há telas em branco
- [ ] Loading states funcionam
- [ ] Alerts são informativos

---

## BUGS ENCONTRADOS

| # | Descrição | Severidade | Status |
|---|-----------|------------|--------|
| 1 |           |            |        |
| 2 |           |            |        |
| 3 |           |            |        |

---

## OBSERVAÇÕES

_Espaço para anotações do testador:_

---

## ASSINATURA

**Testador:** _____________  
**Data:** _____________  
**Resultado:** [ ] ✅ APROVADO [ ] ❌ REPROVADO
