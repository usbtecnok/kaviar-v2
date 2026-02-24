# 🔧 KAVIAR - COMANDOS AWS DIRETOS

**Usar se o script `subida-producao.sh` não funcionar**

---

## 1️⃣ LIGAR ECS (desiredCount=1)

```bash
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --desired-count 1 \
  --region us-east-2
```

---

## 2️⃣ VERIFICAR STATUS

```bash
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}' \
  --output table
```

**Aguardar até**: `running: 1`

---

## 3️⃣ TESTAR HEALTH

```bash
curl -i https://api.kaviar.com.br/api/health
```

**Resultado esperado**: `HTTP/2 200`

---

## 4️⃣ VER LOGS (últimos 5 minutos)

```bash
aws logs tail /ecs/kaviar-backend \
  --region us-east-2 \
  --since 5m \
  --follow
```

**Ctrl+C para sair**

---

## 5️⃣ BUSCAR ERROS (últimos 10 minutos)

```bash
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --region us-east-2 \
  --start-time $(date -u -d '10 minutes ago' +%s)000 \
  --filter-pattern "ERROR" \
  --query 'events[*].message' \
  --output text
```

---

## 6️⃣ VERIFICAR CONEXÃO COM DATABASE

```bash
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --region us-east-2 \
  --start-time $(date -u -d '5 minutes ago' +%s)000 \
  --filter-pattern "database" \
  --query 'events[*].message' \
  --output text | head -20
```

**Buscar por**: `"database": true`

---

## 7️⃣ VERIFICAR OFFER-TIMEOUT JOB

```bash
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --region us-east-2 \
  --start-time $(date -u -d '5 minutes ago' +%s)000 \
  --filter-pattern "offer-timeout" \
  --query 'events[*].message' \
  --output text
```

**Se aparecer erro repetido**: Job está travando (anotar para desabilitar)

---

## 8️⃣ MONITORAR CADASTRO/LOGIN (durante teste no app)

```bash
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --region us-east-2 \
  --start-time $(date -u -d '2 minutes ago' +%s)000 \
  --filter-pattern "POST /api/auth" \
  --query 'events[*].message' \
  --output text
```

**Buscar por**:
- `POST /api/auth/register/passenger 201` → Cadastro OK
- `POST /api/auth/login/passenger 200` → Login OK

---

## 9️⃣ DESLIGAR ECS (desiredCount=0)

```bash
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --desired-count 0 \
  --region us-east-2
```

---

## 🔟 CONFIRMAR DESLIGAMENTO

```bash
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query 'services[0].{desired:desiredCount,running:runningCount}' \
  --output table
```

**Aguardar até**: `running: 0`

---

## 🆘 COMANDOS DE EMERGÊNCIA

### Forçar parada de task (se não desligar)

```bash
# Listar tasks
aws ecs list-tasks \
  --cluster kaviar-cluster \
  --service-name kaviar-backend-service \
  --region us-east-2

# Copiar ARN da task e parar
aws ecs stop-task \
  --cluster kaviar-cluster \
  --task <TASK_ARN> \
  --region us-east-2
```

---

### Ver detalhes da task (se falhar ao subir)

```bash
# Listar tasks
TASK_ARN=$(aws ecs list-tasks \
  --cluster kaviar-cluster \
  --service-name kaviar-backend-service \
  --region us-east-2 \
  --query 'taskArns[0]' \
  --output text)

# Ver detalhes
aws ecs describe-tasks \
  --cluster kaviar-cluster \
  --tasks $TASK_ARN \
  --region us-east-2 \
  --query 'tasks[0].{lastStatus:lastStatus,healthStatus:healthStatus,stoppedReason:stoppedReason,containers:containers[0].{name:name,lastStatus:lastStatus,exitCode:exitCode}}'
```

---

### Ver últimos 50 logs (sem follow)

```bash
aws logs tail /ecs/kaviar-backend \
  --region us-east-2 \
  --since 5m \
  --format short
```

---

## 📋 SEQUÊNCIA COMPLETA (COPY-PASTE)

```bash
# 1. Ligar
aws ecs update-service --cluster kaviar-cluster --service kaviar-backend-service --desired-count 1 --region us-east-2

# 2. Aguardar 30s
sleep 30

# 3. Verificar status
aws ecs describe-services --cluster kaviar-cluster --services kaviar-backend-service --region us-east-2 --query 'services[0].{desired:desiredCount,running:runningCount}' --output table

# 4. Testar health
curl -i https://api.kaviar.com.br/api/health

# 5. Ver logs
aws logs tail /ecs/kaviar-backend --region us-east-2 --since 5m

# 6. Após testes, desligar
aws ecs update-service --cluster kaviar-cluster --service kaviar-backend-service --desired-count 0 --region us-east-2
```

---

**Criado por**: Kiro  
**Uso**: Comandos diretos sem script
