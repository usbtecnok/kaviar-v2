# 🧪 ROTEIRO DE TESTE E2E - MVP MÍNIMO

**Data:** 01/03/2026 22:27 BRT  
**Objetivo:** Validar fluxo completo Passageiro ↔ Motorista  
**Duração estimada:** 30 minutos

---

## 📋 PRÉ-REQUISITOS

### **Backend**

- [ ] Backend rodando em `http://localhost:3000` ou AWS
- [ ] Banco de dados populado com bairros (neighborhoods)
- [ ] Pelo menos 1 motorista aprovado no sistema

### **Apps**

- [ ] App Motorista instalado em dispositivo/emulador
- [ ] App Passageiro instalado em dispositivo/emulador (diferente do motorista)
- [ ] Ambos os apps conectados ao backend

### **Ferramentas**

- [ ] Ferramenta de screenshot (para evidências)
- [ ] Logs do backend habilitados
- [ ] Postman/curl para validações (opcional)

---

## 🎬 FLUXO COMPLETO - PASSO A PASSO

### **ETAPA 1: PREPARAÇÃO (5 min)**

#### **1.1 - Verificar Backend**

```bash
# Health check
curl -X GET "http://localhost:3000/health"
# Esperado: {"status":"ok"}

# Verificar bairros disponíveis
curl -X GET "http://localhost:3000/api/neighborhoods/nearby?lat=-22.9708&lng=-43.1829&radius=5000"
# Esperado: Lista de bairros
```

**Evidência:** Screenshot do resultado do curl.

---

#### **1.2 - Limpar Dados de Teste (Opcional)**

```bash
# Deletar corridas de teste anteriores
curl -X DELETE "http://localhost:3000/api/admin/rides/test-cleanup" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

### **ETAPA 2: CADASTRO MOTORISTA (3 min)**

#### **2.1 - Abrir App Motorista**

- [ ] Abrir app motorista
- [ ] Verificar: tela de cadastro/login aparece

**Evidência:** Screenshot da tela inicial.

---

#### **2.2 - Cadastrar Motorista**

- [ ] Clicar em "Cadastrar"
- [ ] Preencher:
  - Nome: `Motorista Teste`
  - Email: `motorista.teste@kaviar.com`
  - Telefone: `+5521999999999`
  - Senha: `senha123`
  - Bairro-base: Selecionar `Copacabana` (ou outro disponível)
- [ ] Clicar "Cadastrar"
- [ ] Verificar: redirecionamento para Home

**Evidência:** Screenshot da tela de cadastro preenchida + screenshot da Home.

---

#### **2.3 - Verificar Cadastro no Backend**

```bash
# Buscar motorista criado
curl -X GET "http://localhost:3000/api/admin/drivers?email=motorista.teste@kaviar.com" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Esperado: Motorista com status "pending"
```

**Evidência:** Screenshot do resultado do curl.

---

#### **2.4 - Aprovar Motorista (Admin)**

```bash
# Aprovar motorista (necessário para receber ofertas)
curl -X POST "http://localhost:3000/api/admin/drivers/<DRIVER_ID>/approve" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Esperado: {"success":true}
```

**Evidência:** Screenshot do resultado do curl.

---

### **ETAPA 3: MOTORISTA FICA ONLINE (2 min)**

#### **3.1 - Login Motorista**

- [ ] Fechar e reabrir app motorista
- [ ] Tela de login aparece
- [ ] Preencher:
  - Email: `motorista.teste@kaviar.com`
  - Senha: `senha123`
- [ ] Clicar "Entrar"
- [ ] Verificar: redirecionamento para Home

**Evidência:** Screenshot da tela de login + screenshot da Home.

---

#### **3.2 - Ficar Online**

- [ ] Na Home, clicar toggle "Ficar Online"
- [ ] Verificar: status muda para "Online" (verde)
- [ ] Verificar: mensagem "Aguardando ofertas..." aparece

**Evidência:** Screenshot da Home com status "Online".

---

#### **3.3 - Verificar Localização no Backend**

```bash
# Aguardar 15 segundos (para enviar localização)
sleep 15

# Verificar última localização do motorista
curl -X GET "http://localhost:3000/api/admin/drivers/<DRIVER_ID>" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Esperado: Campo "last_location" com lat/lng recentes
```

**Evidência:** Screenshot do resultado do curl mostrando `last_location`.

---

### **ETAPA 4: CADASTRO PASSAGEIRO (3 min)**

#### **4.1 - Abrir App Passageiro**

- [ ] Abrir app passageiro (em outro dispositivo/emulador)
- [ ] Verificar: tela de cadastro/login aparece

**Evidência:** Screenshot da tela inicial.

---

#### **4.2 - Cadastrar Passageiro**

- [ ] Clicar em "Cadastrar"
- [ ] Preencher:
  - Nome: `Passageiro Teste`
  - Email: `passageiro.teste@kaviar.com`
  - Telefone: `+5521988888888`
  - Senha: `senha123`
- [ ] Clicar "Cadastrar"
- [ ] Verificar: redirecionamento para Home

**Evidência:** Screenshot da tela de cadastro preenchida + screenshot da Home.

---

#### **4.3 - Verificar Cadastro no Backend**

```bash
# Buscar passageiro criado
curl -X GET "http://localhost:3000/api/admin/passengers?email=passageiro.teste@kaviar.com" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Esperado: Passageiro com status "ACTIVE"
```

**Evidência:** Screenshot do resultado do curl.

---

### **ETAPA 5: SOLICITAR CORRIDA (2 min)**

#### **5.1 - Preencher Origem e Destino**

- [ ] Na Home do app passageiro, preencher:
  - Origem: `Copacabana, Rio de Janeiro` (lat: -22.9708, lng: -43.1829)
  - Destino: `Ipanema, Rio de Janeiro` (lat: -22.9519, lng: -43.2105)
- [ ] Verificar: valor estimado aparece (ex: R$ 25,00)

**Evidência:** Screenshot da Home com origem/destino preenchidos.

---

#### **5.2 - Solicitar Corrida**

- [ ] Clicar "Solicitar Corrida"
- [ ] Verificar: tela de corrida ativa aparece
- [ ] Verificar: status "Aguardando motorista..." (pending)

**Evidência:** Screenshot da tela de corrida ativa com status "pending".

---

#### **5.3 - Verificar Corrida no Backend**

```bash
# Buscar corrida criada
curl -X GET "http://localhost:3000/api/admin/rides?status=pending" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Esperado: Corrida com status "pending"
```

**Evidência:** Screenshot do resultado do curl + anotar `ride_id`.

---

### **ETAPA 6: MOTORISTA RECEBE E ACEITA OFERTA (3 min)**

#### **6.1 - Verificar Oferta no App Motorista**

- [ ] No app motorista, aguardar até 30 segundos
- [ ] Verificar: modal de oferta aparece
- [ ] Verificar: origem, destino, valor exibidos

**Evidência:** Screenshot do modal de oferta.

---

#### **6.2 - Aceitar Oferta**

- [ ] Clicar "Aceitar"
- [ ] Verificar: modal fecha
- [ ] Verificar: tela de corrida ativa aparece
- [ ] Verificar: status "A caminho do passageiro" (accepted)

**Evidência:** Screenshot da tela de corrida ativa com status "accepted".

---

#### **6.3 - Verificar Status no Backend**

```bash
# Verificar status da corrida
curl -X GET "http://localhost:3000/api/admin/rides/<RIDE_ID>" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Esperado: status "accepted", driver_id preenchido
```

**Evidência:** Screenshot do resultado do curl.

---

#### **6.4 - Verificar Status no App Passageiro**

- [ ] No app passageiro, verificar: status atualiza para "Motorista a caminho"
- [ ] Verificar: nome do motorista aparece (`Motorista Teste`)

**Evidência:** Screenshot da tela de corrida ativa no app passageiro.

---

### **ETAPA 7: MOTORISTA CHEGA NO LOCAL (2 min)**

#### **7.1 - Motorista Clica "Cheguei no Local"**

- [ ] No app motorista, clicar "Cheguei no Local"
- [ ] Verificar: status muda para "Aguardando passageiro" (arrived)

**Evidência:** Screenshot da tela de corrida ativa com status "arrived".

---

#### **7.2 - Verificar Status no Backend**

```bash
# Verificar status da corrida
curl -X GET "http://localhost:3000/api/admin/rides/<RIDE_ID>" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Esperado: status "arrived"
```

**Evidência:** Screenshot do resultado do curl.

---

#### **7.3 - Verificar Status no App Passageiro**

- [ ] No app passageiro, verificar: status atualiza para "Motorista chegou"

**Evidência:** Screenshot da tela de corrida ativa no app passageiro.

---

### **ETAPA 8: INICIAR CORRIDA (2 min)**

#### **8.1 - Motorista Clica "Iniciar Corrida"**

- [ ] No app motorista, clicar "Iniciar Corrida"
- [ ] Verificar: status muda para "Em andamento" (in_progress)

**Evidência:** Screenshot da tela de corrida ativa com status "in_progress".

---

#### **8.2 - Verificar Status no Backend**

```bash
# Verificar status da corrida
curl -X GET "http://localhost:3000/api/admin/rides/<RIDE_ID>" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Esperado: status "in_progress", started_at preenchido
```

**Evidência:** Screenshot do resultado do curl.

---

#### **8.3 - Verificar Status no App Passageiro**

- [ ] No app passageiro, verificar: status atualiza para "Corrida em andamento"

**Evidência:** Screenshot da tela de corrida ativa no app passageiro.

---

### **ETAPA 9: FINALIZAR CORRIDA (2 min)**

#### **9.1 - Motorista Clica "Finalizar Corrida"**

- [ ] No app motorista, clicar "Finalizar Corrida"
- [ ] Verificar: status muda para "Concluída" (completed)
- [ ] Verificar: volta para Home com status "Online"

**Evidência:** Screenshot da tela de corrida ativa com status "completed" + screenshot da Home.

---

#### **9.2 - Verificar Status no Backend**

```bash
# Verificar status da corrida
curl -X GET "http://localhost:3000/api/admin/rides/<RIDE_ID>" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Esperado: status "completed", completed_at preenchido
```

**Evidência:** Screenshot do resultado do curl.

---

#### **9.3 - Verificar Status no App Passageiro**

- [ ] No app passageiro, verificar: status atualiza para "Corrida concluída"
- [ ] Verificar: volta para Home

**Evidência:** Screenshot da tela de corrida ativa com status "completed" + screenshot da Home.

---

### **ETAPA 10: VALIDAÇÃO FINAL (3 min)**

#### **10.1 - Verificar Logs do Backend**

```bash
# Buscar logs da corrida
grep "<RIDE_ID>" backend/logs/app.log
# Esperado: Logs de criação, aceite, arrived, start, complete
```

**Evidência:** Screenshot dos logs.

---

#### **10.2 - Verificar Dados no Banco**

```bash
# Verificar corrida no banco
curl -X GET "http://localhost:3000/api/admin/rides/<RIDE_ID>" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Esperado: Todos os campos preenchidos (driver_id, started_at, completed_at, etc.)
```

**Evidência:** Screenshot do resultado do curl.

---

#### **10.3 - Verificar Cálculo de Taxa**

```bash
# Verificar taxa calculada
curl -X GET "http://localhost:3000/api/admin/rides/<RIDE_ID>" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Esperado: Campo "fee_percentage" preenchido (7%, 12% ou 20%)
```

**Evidência:** Screenshot do resultado do curl mostrando `fee_percentage`.

---

## ✅ CHECKLIST DE VALIDAÇÃO

### **Backend**

- [ ] Corrida criada com status `pending`
- [ ] Status mudou para `accepted` após motorista aceitar
- [ ] Status mudou para `arrived` após motorista chegar
- [ ] Status mudou para `in_progress` após iniciar corrida
- [ ] Status mudou para `completed` após finalizar corrida
- [ ] Campos `driver_id`, `started_at`, `completed_at` preenchidos
- [ ] Taxa calculada corretamente (`fee_percentage`)

### **App Motorista**

- [ ] Cadastro funcionou
- [ ] Login funcionou
- [ ] Toggle online/offline funcionou
- [ ] Localização enviada a cada 10s
- [ ] Modal de oferta apareceu
- [ ] Aceitar oferta funcionou
- [ ] Botões "Cheguei", "Iniciar", "Finalizar" funcionaram
- [ ] Status atualizado corretamente em cada etapa

### **App Passageiro**

- [ ] Cadastro funcionou
- [ ] Login funcionou
- [ ] Solicitar corrida funcionou
- [ ] Status atualizado automaticamente (polling)
- [ ] Nome do motorista apareceu após aceite
- [ ] Status final "Concluída" apareceu

---

## 📊 CRITÉRIOS DE SUCESSO

### **✅ TESTE PASSOU SE:**

- [ ] Fluxo completo executado sem erros
- [ ] Todos os status mudaram corretamente
- [ ] Apps sincronizaram com backend
- [ ] Evidências coletadas (screenshots + logs)
- [ ] Taxa calculada corretamente

### **❌ TESTE FALHOU SE:**

- [ ] Qualquer etapa retornou erro
- [ ] Status não mudou corretamente
- [ ] Apps não sincronizaram com backend
- [ ] Evidências incompletas
- [ ] Taxa não foi calculada

---

## 📝 TEMPLATE DE EVIDÊNCIAS

### **Estrutura de Pastas**

```
docs/evidencias_e2e/
├── 01_backend_health.png
├── 02_motorista_cadastro.png
├── 03_motorista_home_online.png
├── 04_motorista_oferta_modal.png
├── 05_motorista_corrida_ativa.png
├── 06_passageiro_cadastro.png
├── 07_passageiro_home.png
├── 08_passageiro_solicitar_corrida.png
├── 09_passageiro_corrida_ativa.png
├── 10_backend_corrida_completed.png
├── logs_backend.txt
└── RELATORIO_TESTE_E2E.md
```

---

### **Template de Relatório**

```markdown
# RELATÓRIO DE TESTE E2E - MVP MÍNIMO

**Data:** 01/03/2026  
**Testador:** [Nome]  
**Duração:** [X minutos]

## RESULTADO

- [ ] ✅ PASSOU
- [ ] ❌ FALHOU

## EVIDÊNCIAS

### Backend
- Health check: [link para screenshot]
- Corrida criada: [link para screenshot]
- Corrida completed: [link para screenshot]

### App Motorista
- Cadastro: [link para screenshot]
- Home online: [link para screenshot]
- Oferta modal: [link para screenshot]
- Corrida ativa: [link para screenshot]

### App Passageiro
- Cadastro: [link para screenshot]
- Home: [link para screenshot]
- Solicitar corrida: [link para screenshot]
- Corrida ativa: [link para screenshot]

## BUGS ENCONTRADOS

1. [Descrição do bug 1]
2. [Descrição do bug 2]

## OBSERVAÇÕES

[Observações gerais sobre o teste]
```

---

## 🐛 TROUBLESHOOTING

### **Problema: Modal de oferta não aparece no app motorista**

**Possíveis causas:**
1. Motorista não está online
2. Motorista não está aprovado (status != `approved`)
3. Polling de ofertas não está funcionando
4. Dispatcher não criou oferta

**Solução:**
```bash
# Verificar status do motorista
curl -X GET "http://localhost:3000/api/admin/drivers/<DRIVER_ID>" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Verificar ofertas pendentes
curl -X GET "http://localhost:3000/api/driver/offers/pending" \
  -H "Authorization: Bearer <DRIVER_TOKEN>"

# Forçar dispatch (se necessário)
curl -X POST "http://localhost:3000/api/rides/<RIDE_ID>/dispatch" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

### **Problema: Status não atualiza no app passageiro**

**Possíveis causas:**
1. Polling não está funcionando
2. Token expirado
3. Backend não está atualizando status

**Solução:**
```bash
# Verificar status da corrida no backend
curl -X GET "http://localhost:3000/api/rides-v2/<RIDE_ID>" \
  -H "Authorization: Bearer <PASSENGER_TOKEN>"

# Verificar logs do backend
grep "<RIDE_ID>" backend/logs/app.log
```

---

### **Problema: Localização não está sendo enviada**

**Possíveis causas:**
1. Permissão de localização negada
2. Endpoint `/api/driver/location` não existe
3. Token inválido

**Solução:**
```bash
# Testar endpoint manualmente
curl -X POST "http://localhost:3000/api/driver/location" \
  -H "Authorization: Bearer <DRIVER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": -22.9708,
    "lng": -43.1829
  }'
```

---

**FIM DO ROTEIRO DE TESTE E2E**
