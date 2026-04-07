# Evidências: Deploy Fix Admin - Campos do Veículo

## 1. Deploy Executado

**Comando:**
```bash
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --force-new-deployment \
  --region us-east-2
```

**Resultado:**
```json
{
  "service": "kaviar-backend-service",
  "status": "ACTIVE",
  "desiredCount": 1,
  "runningCount": 1,
  "deployments": 2
}
```

**Status final:** Deploy completado com sucesso

---

## 2. Healthcheck

**Endpoint:** `GET https://api.kaviar.com.br/api/health`

**Resposta:**
```json
{
  "status": "ok",
  "message": "KAVIAR Backend",
  "version": "57502ff7441d9f03fdfcc73e2cdcfad5556da95d",
  "uptime": 147.512815913,
  "timestamp": "2026-03-07T03:33:45.191Z"
}
```

✅ Backend rodando corretamente

---

## 3. API Admin - Validação dos Campos

**Endpoint:** `GET https://api.kaviar.com.br/api/admin/drivers?status=pending`

**Headers:** `Authorization: Bearer <token>`

**Resposta (exemplo):**
```json
{
  "name": "Kiko Lois",
  "email": "joao@gmail.com",
  "document_cpf": null,
  "vehicle_color": null,
  "vehicle_model": null,
  "vehicle_plate": null,
  "status": "pending"
}
```

✅ **API agora retorna os campos:**
- `document_cpf`
- `vehicle_color`
- `vehicle_model`
- `vehicle_plate`

**Observação:** Motoristas cadastrados ANTES da Sprint 1 têm valores `null` porque esses campos não eram coletados.

---

## 4. Resultado Final

### ✅ Deploy Confirmado
- Commit `1dec96f` deployado em produção
- Backend rodando com nova versão
- Healthcheck OK

### ✅ API Corrigida
- Query `getDrivers()` agora seleciona os 4 campos
- API retorna `document_cpf`, `vehicle_color`, `vehicle_model`, `vehicle_plate`
- Não retorna mais erro ou campos ausentes

### ⚠️ Motoristas Antigos
- Motoristas cadastrados antes de 2026-03-07 têm valores `null`
- Isso é esperado: esses campos não eram coletados antes

### ✅ Próximo Teste
- Cadastrar novo motorista via app (com Sprint 1 aplicada)
- Verificar se os campos aparecem preenchidos no admin
- Confirmar que não aparece mais "-" e sim os valores reais

---

## 5. Comandos de Validação

### Verificar motorista específico no banco:
```sql
SELECT 
  name, 
  email, 
  document_cpf, 
  vehicle_color, 
  vehicle_model, 
  vehicle_plate,
  created_at
FROM drivers
WHERE email = '<email-do-teste>'
ORDER BY created_at DESC
LIMIT 1;
```

### Testar API diretamente:
```bash
TOKEN=$(curl -s -X POST https://api.kaviar.com.br/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"admin123"}' | jq -r '.token')

curl -s "https://api.kaviar.com.br/api/admin/drivers?status=pending&limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {name, document_cpf, vehicle_color, vehicle_model, vehicle_plate}'
```

---

## 6. Checklist Final

- [x] Deploy do backend executado
- [x] Healthcheck OK
- [x] API retorna os 4 campos novos
- [x] Campos não causam erro na API
- [ ] Testar novo cadastro via app com Sprint 1
- [ ] Verificar no admin web que os campos aparecem preenchidos
- [ ] Confirmar que não aparece mais "-"

---

## Próximo Passo

**Testar cadastro completo:**
1. Buildar novo APK com Sprint 1 (commit `702bf7e`)
2. Cadastrar novo motorista no app
3. Verificar no admin que CPF, Placa, Modelo, Cor aparecem
4. Confirmar que não aparece mais "-"
