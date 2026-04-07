# ✅ DEPLOY DIA 2 - EVIDÊNCIAS COMPLETAS

**Data:** 03/03/2026 07:26 BRT  
**Status:** ✅ FUNCIONANDO  

---

## 🎯 DESCOBERTA DO CLUSTER CORRETO

### DNS → ALB
```bash
$ dig +short api.kaviar.com.br
kaviar-alb-1494046292.us-east-2.elb.amazonaws.com.
3.151.47.14
18.216.7.17
```

**Conclusão:** ALB está em **us-east-2** (não us-east-1)

### ALB Details
```json
{
  "Name": "kaviar-alb",
  "ARN": "arn:aws:elasticloadbalancing:us-east-2:847895361928:loadbalancer/app/kaviar-alb/a3ea4728f211b6c7",
  "DNS": "kaviar-alb-1494046292.us-east-2.elb.amazonaws.com"
}
```

### Listener Rules (HTTPS:443)
```json
{
  "ListenerArn": "arn:aws:elasticloadbalancing:us-east-2:847895361928:listener/app/kaviar-alb/a3ea4728f211b6c7/437b5ca4b38c8ad9",
  "DefaultAction": {
    "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-2:847895361928:targetgroup/kaviar-backend-tg/323fe3a4ccfef4cd"
  }
}
```

### Target Group → ECS Service
```json
{
  "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-2:847895361928:targetgroup/kaviar-backend-tg/323fe3a4ccfef4cd",
  "Cluster": "kaviar-cluster",
  "Service": "kaviar-backend-service",
  "Region": "us-east-2"
}
```

---

## 📦 DEPLOY CORRETO (us-east-2)

### Docker Push
```bash
✅ Image: 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:dia2-location
✅ Digest: sha256:25c36ec9f6a03cb3fb4bb7d14068c70e1411189a69d7792c27b5b36b543e154a
✅ Region: us-east-2
```

### Task Definition
```json
{
  "family": "kaviar-backend",
  "revision": 163,
  "image": "847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:dia2-location",
  "region": "us-east-2"
}
```

### ECS Service Update
```bash
$ aws ecs update-service --cluster kaviar-cluster --service kaviar-backend-service \
  --task-definition kaviar-backend:163 --region us-east-2

✅ Service: kaviar-backend-service
✅ Cluster: kaviar-cluster (us-east-2)
✅ Task Definition: kaviar-backend:163
✅ Running Count: 1
✅ Task ARN: arn:aws:ecs:us-east-2:847895361928:task/kaviar-cluster/3442232f08d242babbd734b23cbad62e
```

---

## 🧪 TESTES COM EVIDÊNCIAS

### Teste 1: COM token válido → 200
```bash
$ TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

$ curl -X POST "https://api.kaviar.com.br/api/auth/driver/location" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Request-ID: test-1772533579-loc1" \
  -d '{"lat": -22.9708, "lng": -43.1829}'

✅ HTTP 200
✅ {"success":true}
```

### Teste 2: SEM token → 401
```bash
$ curl -X POST "https://api.kaviar.com.br/api/auth/driver/location" \
  -H "Content-Type: application/json" \
  -d '{"lat": -22.9708, "lng": -43.1829}'

✅ HTTP 401
✅ {"error":"Token ausente"}
```

### Teste 3: 2 localizações sequenciais
```bash
# Localização 1
$ curl -X POST "https://api.kaviar.com.br/api/auth/driver/location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Request-ID: test-1772533579-loc1" \
  -d '{"lat": -22.9708, "lng": -43.1829}'

✅ {"success":true}

# Localização 2 (2s depois)
$ curl -X POST "https://api.kaviar.com.br/api/auth/driver/location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Request-ID: test-1772533579-loc2" \
  -d '{"lat": -22.9709, "lng": -43.1830}'

✅ {"success":true}
```

---

## 📊 CLOUDWATCH LOGS (PROVA)

### Logs com X-Request-ID
```
2026-03-03T10:26:20.889Z | requestId: "test-1772533579-loc1" | POST /driver/location | status: 200 | durationMs: 18
2026-03-03T10:26:23.647Z | requestId: "test-1772533579-loc2" | POST /driver/location | status: 200 | durationMs: 7
```

**Prova:** Request IDs batem nos logs da task `3442232f08d242babbd734b23cbad62e`

### Logs de Autenticação
```
2026-03-03T10:26:10.231Z | requestId: "8f7460d0-9f0c-4987-802b-7c8f7b71f5d6" | POST /driver/location | status: 401 | durationMs: 1
```

**Prova:** Endpoint valida token corretamente (401 sem token)

---

## 🔗 CADEIA COMPLETA

```
DNS: api.kaviar.com.br
  ↓
ALB: kaviar-alb-1494046292.us-east-2.elb.amazonaws.com
  ↓
Listener: HTTPS:443 (437b5ca4b38c8ad9)
  ↓
Target Group: kaviar-backend-tg (323fe3a4ccfef4cd)
  ↓
ECS Service: kaviar-backend-service
  ↓
Cluster: kaviar-cluster (us-east-2)
  ↓
Task: 3442232f08d242babbd734b23cbad62e
  ↓
Task Definition: kaviar-backend:163
  ↓
Image: 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:dia2-location
  ↓
Endpoint: POST /api/auth/driver/location ✅
```

---

## ✅ CHECKLIST FINAL

### Deploy
- [x] Descobrir ALB correto (us-east-2)
- [x] Descobrir cluster correto (kaviar-cluster)
- [x] Push imagem para ECR us-east-2
- [x] Criar task definition 163
- [x] Update service
- [x] Task rodando

### Testes
- [x] curl COM token → 200 {"success":true}
- [x] curl SEM token → 401 {"error":"Token ausente"}
- [x] 2 localizações sequenciais → ambas 200
- [x] CloudWatch logs com request-id batendo
- [x] Sem erros nos logs

### Evidências
- [x] DNS → ALB mapeado
- [x] Listener rules documentadas
- [x] Target group ARN confirmado
- [x] Task definition atual (163)
- [x] Logs com X-Request-ID

---

## 📝 SCRIPT DE VALIDAÇÃO

```bash
#!/bin/bash
# /home/goes/kaviar/scripts/validate-dia2-final.sh

TOKEN=$(curl -s -X POST "https://api.kaviar.com.br/api/auth/driver/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Validacao",
    "email": "teste.'$(date +%s)'@kaviar.com",
    "phone": "+5521999999999",
    "password": "senha123"
  }' | jq -r '.token')

echo "=== Teste 1: COM token ==="
curl -s -X POST "https://api.kaviar.com.br/api/auth/driver/location" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"lat": -22.9708, "lng": -43.1829}' | jq .

echo ""
echo "=== Teste 2: SEM token ==="
curl -s -X POST "https://api.kaviar.com.br/api/auth/driver/location" \
  -d '{"lat": -22.9708, "lng": -43.1829}' | jq .
```

---

## 🎯 PRÓXIMOS PASSOS

### Você (E2E no device)
1. Instalar app no Android
2. Fazer login
3. Clicar "Ficar Online"
4. Verificar no backend: `last_location_updated_at` mudando a cada 15s
5. Clicar "Ficar Offline"
6. Verificar: timestamp para de atualizar

### Query para verificar no banco
```sql
SELECT id, name, last_lat, last_lng, last_location_updated_at 
FROM drivers 
WHERE email = 'seu.email@kaviar.com'
ORDER BY last_location_updated_at DESC;
```

---

**Gerado em:** 2026-03-03T07:26:00-03:00  
**Região correta:** us-east-2  
**Cluster correto:** kaviar-cluster  
**Status:** ✅ FUNCIONANDO
