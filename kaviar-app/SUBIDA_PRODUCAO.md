# 🚀 KAVIAR - SUBIDA EM PRODUÇÃO (ECS)

**Data**: 2026-02-21  
**Objetivo**: Religar ECS para testar cadastro/login no app passageiro  
**Região**: us-east-2  
**Cluster**: kaviar-cluster  
**Service**: kaviar-backend-service

---

## ⚠️ PRÉ-REQUISITOS

- [ ] AWS CLI configurado com credenciais válidas
- [ ] Backend local PARADO (para evitar confusão)
- [ ] App passageiro pronto (link "Criar conta" implementado)

---

## 📋 FASE 1: RELIGAR ECS (1 TASK)

### Comando 1: Verificar estado atual
```bash
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query 'services[0].{desiredCount:desiredCount,runningCount:runningCount,status:status}' \
  --output table
```

**Resultado esperado**:
```
---------------------------------
|      DescribeServices         |
+---------------+-------+-------+
| desiredCount  | 0     |       |
| runningCount  | 0     |       |
| status        | ACTIVE|       |
+---------------+-------+-------+
```

---

### Comando 2: Religar service (desiredCount=1)
```bash
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --desired-count 1 \
  --region us-east-2 \
  --query 'service.{serviceName:serviceName,desiredCount:desiredCount,status:status}' \
  --output table
```

**Resultado esperado**:
```
Service atualizado com desiredCount=1
```

---

### Comando 3: Aguardar task subir (polling)
```bash
# Executar a cada 10 segundos até runningCount=1
watch -n 10 'aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query "services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}" \
  --output table'
```

**Ou comando único (sem watch)**:
```bash
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}' \
  --output table
```

**Aguardar até**:
```
running: 1
pending: 0
```

**Tempo estimado**: 30-60 segundos

---

## 📋 FASE 2: VALIDAÇÃO DE SAÚDE

### Comando 4: Testar health endpoint
```bash
curl -i https://api.kaviar.com.br/api/health
```

**Resultado esperado**:
```
HTTP/2 200
content-type: application/json

{"status":"ok","database":true,"timestamp":"2026-02-21T..."}
```

**❌ Se retornar 502/503**: Task ainda está subindo, aguardar mais 20s e tentar novamente.

**❌ Se retornar 404**: Endpoint pode ser `/health` sem `/api`. Testar:
```bash
curl -i https://api.kaviar.com.br/health
```

---

### Comando 5: Verificar logs do CloudWatch (últimos 5 minutos)
```bash
aws logs tail /ecs/kaviar-backend \
  --region us-east-2 \
  --since 5m \
  --follow
```

**Buscar por**:
- ✅ `"Server running on port 3000"` ou similar
- ✅ `"database": true` ou `"Database connected"`
- ❌ `"Prisma Offer Timeout Job"` → Se aparecer, verificar se está travando
- ❌ `"ECONNREFUSED"` → Problema de conexão com RDS
- ❌ `"Error:"` → Qualquer erro crítico

**Para parar o follow**: `Ctrl+C`

---

### Comando 6: Filtrar logs por erros (últimos 10 minutos)
```bash
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --region us-east-2 \
  --start-time $(date -u -d '10 minutes ago' +%s)000 \
  --filter-pattern "ERROR" \
  --query 'events[*].message' \
  --output text
```

**Resultado esperado**: Vazio ou sem erros críticos.

---

### Comando 7: Verificar conexão com RDS (via logs)
```bash
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --region us-east-2 \
  --start-time $(date -u -d '5 minutes ago' +%s)000 \
  --filter-pattern "database" \
  --query 'events[*].message' \
  --output text | head -20
```

**Buscar por**:
- ✅ `"database": true`
- ✅ `"Prisma Client initialized"`
- ❌ `"Can't reach database server"`

---

### Comando 8: Verificar offer-timeout job (crítico)
```bash
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --region us-east-2 \
  --start-time $(date -u -d '5 minutes ago' +%s)000 \
  --filter-pattern "offer-timeout" \
  --query 'events[*].message' \
  --output text
```

**Resultado esperado**:
- ✅ `"Offer timeout job started"` → OK
- ❌ `"Error in offer timeout"` → Problema
- ❌ Logs repetidos infinitamente → Job está travando

**Se job estiver travando**: Anotar para desabilitar depois.

---

## 📋 FASE 3: CONFIGURAR APP PASSAGEIRO

### Comando 9: Atualizar .env do app
```bash
cd /home/goes/kaviar/kaviar-app

# Backup do .env atual
cp .env .env.backup

# Atualizar para produção
cat > .env << 'EOF'
# Kaviar App - PRODUÇÃO
# API em produção (ECS + ALB + Route53)

EXPO_PUBLIC_API_URL=https://api.kaviar.com.br/api
EOF

cat .env
```

**Resultado esperado**:
```
EXPO_PUBLIC_API_URL=https://api.kaviar.com.br/api
```

---

### Comando 10: Validar que app lê o .env
```bash
cd /home/goes/kaviar/kaviar-app
grep -r "EXPO_PUBLIC_API_URL" src/config/env.ts
```

**Resultado esperado**:
```
API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
```

---

### Comando 11: Rodar app com cache limpo
```bash
cd /home/goes/kaviar/kaviar-app
npx expo start --lan --clear
```

**Ações no Expo Go**:
1. Escanear QR code
2. App abre na tela de login
3. Tocar em "Criar conta de passageiro"
4. Preencher formulário de cadastro
5. Submeter

**Resultado esperado**:
- ✅ Cadastro criado com sucesso
- ✅ Navega para tela de mapa ou login
- ❌ Se der erro de rede: Verificar se API está respondendo (Fase 2, Comando 4)

---

## 📋 FASE 4: TESTE DE CADASTRO/LOGIN

### Teste 1: Cadastro de passageiro
**No app**:
1. Tela de login → "Criar conta de passageiro"
2. Preencher:
   - Nome: `Teste Passageiro`
   - Email: `teste@kaviar.com`
   - Senha: `senha123`
   - Telefone: `11999999999`
3. Submeter

**Validar no CloudWatch**:
```bash
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --region us-east-2 \
  --start-time $(date -u -d '2 minutes ago' +%s)000 \
  --filter-pattern "POST /api/auth/register" \
  --query 'events[*].message' \
  --output text
```

**Resultado esperado**:
- ✅ `POST /api/auth/register/passenger 201`
- ❌ `POST /api/auth/register/passenger 400` → Erro de validação
- ❌ `POST /api/auth/register/passenger 500` → Erro no servidor

---

### Teste 2: Login de passageiro
**No app**:
1. Voltar para tela de login
2. Preencher:
   - Email: `teste@kaviar.com`
   - Senha: `senha123`
3. Tocar em "Entrar"

**Validar no CloudWatch**:
```bash
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --region us-east-2 \
  --start-time $(date -u -d '2 minutes ago' +%s)000 \
  --filter-pattern "POST /api/auth/login" \
  --query 'events[*].message' \
  --output text
```

**Resultado esperado**:
- ✅ `POST /api/auth/login/passenger 200`
- ✅ App navega para tela de mapa
- ❌ `POST /api/auth/login/passenger 401` → Credenciais inválidas

---

## 📋 FASE 5: DESLIGAR ECS (APÓS TESTES)

### Comando 12: Desligar service (desiredCount=0)
```bash
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --desired-count 0 \
  --region us-east-2 \
  --query 'service.{serviceName:serviceName,desiredCount:desiredCount,status:status}' \
  --output table
```

**Resultado esperado**:
```
Service atualizado com desiredCount=0
```

---

### Comando 13: Confirmar que task foi parada
```bash
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query 'services[0].{desired:desiredCount,running:runningCount}' \
  --output table
```

**Aguardar até**:
```
desired: 0
running: 0
```

---

### Comando 14: Reverter .env do app para local
```bash
cd /home/goes/kaviar/kaviar-app
cp .env.backup .env
cat .env
```

---

## 📊 CHECKLIST DE VALIDAÇÃO

### Infraestrutura
- [ ] ECS service com desiredCount=1
- [ ] Task rodando (runningCount=1)
- [ ] Health endpoint retorna 200
- [ ] Logs mostram "Server running"
- [ ] Logs mostram "database: true"
- [ ] Sem erros de offer-timeout travando

### App Passageiro
- [ ] .env configurado com produção
- [ ] App abre no Expo Go
- [ ] Link "Criar conta" visível
- [ ] Navegação para /register funciona
- [ ] Cadastro de passageiro funciona (201)
- [ ] Login de passageiro funciona (200)
- [ ] App navega para tela de mapa após login

### Governança
- [ ] Apenas 1 task rodando (não 2)
- [ ] Sem autoscaling ativo
- [ ] Comando de desligar documentado
- [ ] .env do app revertido após teste

---

## 🔧 TROUBLESHOOTING

### Problema: Health retorna 502/503
**Causa**: Task ainda está subindo ou falhou  
**Solução**:
```bash
# Verificar status da task
aws ecs list-tasks \
  --cluster kaviar-cluster \
  --service-name kaviar-backend-service \
  --region us-east-2

# Pegar ARN da task e ver detalhes
aws ecs describe-tasks \
  --cluster kaviar-cluster \
  --tasks <TASK_ARN> \
  --region us-east-2 \
  --query 'tasks[0].{lastStatus:lastStatus,healthStatus:healthStatus,stoppedReason:stoppedReason}'
```

---

### Problema: Logs mostram "Prisma Offer Timeout Job" infinito
**Causa**: Job está travando o processo  
**Solução temporária**: Desabilitar job no código (requer deploy)  
**Solução imediata**: Ignorar se não estiver derrubando a task

---

### Problema: App retorna "Network Error"
**Causa**: API não está respondendo ou URL incorreta  
**Solução**:
1. Testar health: `curl https://api.kaviar.com.br/api/health`
2. Verificar .env do app: `cat /home/goes/kaviar/kaviar-app/.env`
3. Reiniciar Expo: `npx expo start --lan --clear`

---

### Problema: Cadastro retorna 400
**Causa**: Validação de campos  
**Solução**: Verificar logs para ver qual campo está faltando:
```bash
aws logs tail /ecs/kaviar-backend --region us-east-2 --since 2m --follow
```

---

### Problema: Login retorna 401
**Causa**: Credenciais inválidas ou usuário não existe  
**Solução**: Verificar se cadastro foi criado:
```bash
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --region us-east-2 \
  --start-time $(date -u -d '10 minutes ago' +%s)000 \
  --filter-pattern "teste@kaviar.com" \
  --query 'events[*].message' \
  --output text
```

---

## 💰 CUSTO ESTIMADO

| Recurso | Custo/hora | Tempo teste | Total |
|---------|-----------|-------------|-------|
| ECS Task (1x) | ~$0.05 | 30 min | $0.025 |
| ALB | ~$0.025 | 30 min | $0.0125 |
| RDS (já ligado) | $0 | - | $0 |
| **TOTAL** | - | - | **~$0.04** |

**Custo negligível para teste de 30 minutos.**

---

## 📝 EVIDÊNCIAS ESPERADAS

### 1. Health Check
```bash
$ curl https://api.kaviar.com.br/api/health
{"status":"ok","database":true,"timestamp":"2026-02-21T22:56:00.000Z"}
```

### 2. Logs de Startup
```
Server running on port 3000
Prisma Client initialized
Database connected: true
Offer timeout job started
```

### 3. Cadastro Bem-Sucedido
```
POST /api/auth/register/passenger 201
User created: teste@kaviar.com
```

### 4. Login Bem-Sucedido
```
POST /api/auth/login/passenger 200
Token generated for user: teste@kaviar.com
```

---

## 🎯 RESUMO EXECUTIVO

**Comandos críticos**:
```bash
# 1. Religar ECS
aws ecs update-service --cluster kaviar-cluster --service kaviar-backend-service --desired-count 1 --region us-east-2

# 2. Validar health
curl https://api.kaviar.com.br/api/health

# 3. Ver logs
aws logs tail /ecs/kaviar-backend --region us-east-2 --since 5m --follow

# 4. Configurar app
cd /home/goes/kaviar/kaviar-app
echo "EXPO_PUBLIC_API_URL=https://api.kaviar.com.br/api" > .env
npx expo start --lan --clear

# 5. Desligar ECS
aws ecs update-service --cluster kaviar-cluster --service kaviar-backend-service --desired-count 0 --region us-east-2
```

**Tempo total estimado**: 15-20 minutos  
**Custo estimado**: $0.04  
**Risco**: Baixo (apenas 1 task, fácil de desligar)

---

**Criado por**: Kiro  
**Status**: ✅ Pronto para execução  
**Próxima ação**: Executar Fase 1 (Religar ECS)
