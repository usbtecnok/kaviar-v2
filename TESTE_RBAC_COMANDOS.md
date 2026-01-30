# COMANDOS DE TESTE RBAC ✅

## 🧪 Testes Completos

### Setup
```bash
export ALB_DNS="kaviar-alb-1494046292.us-east-2.elb.amazonaws.com"
```

---

## 1. Login SUPER_ADMIN

```bash
curl -X POST "http://$ALB_DNS/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suporte@usbtecnok.com.br",
    "password": "Kaviar2026!Admin"
  }' | jq '.'
```

**Salvar token**:
```bash
SUPER_TOKEN="<copiar_token_aqui>"
```

---

## 2. Login ANGEL_VIEWER

```bash
curl -X POST "http://$ALB_DNS/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "angel1@kaviar.com",
    "password": "Kaviar2026!Admin"
  }' | jq '.'
```

**Salvar token**:
```bash
ANGEL_TOKEN="<copiar_token_aqui>"
```

---

## 3. SUPER_ADMIN - Leitura ✅

```bash
curl -X GET "http://$ALB_DNS/api/admin/drivers" \
  -H "Authorization: Bearer $SUPER_TOKEN" | jq '.success'
```

**Esperado**: `true`

---

## 4. SUPER_ADMIN - Ação ✅

```bash
curl -X POST "http://$ALB_DNS/api/admin/drivers/test-id/approve" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'
```

**Esperado**: HTTP 200 ou 404 (driver não existe), **NÃO 403**

---

## 5. ANGEL_VIEWER - Leitura ✅

```bash
curl -X GET "http://$ALB_DNS/api/admin/drivers" \
  -H "Authorization: Bearer $ANGEL_TOKEN" | jq '.success'
```

**Esperado**: `true`

---

## 6. ANGEL_VIEWER - Ação ❌ (deve bloquear)

```bash
curl -X POST "http://$ALB_DNS/api/admin/drivers/test-id/approve" \
  -H "Authorization: Bearer $ANGEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'
```

**Esperado**:
```json
{
  "success": false,
  "error": "Acesso negado. Permissão insuficiente.",
  "requiredRoles": ["SUPER_ADMIN"],
  "userRole": "ANGEL_VIEWER"
}
```

---

## ✅ Resumo Esperado

| Usuário | GET (Leitura) | POST (Ação) |
|---------|---------------|-------------|
| SUPER_ADMIN | ✅ 200 | ✅ 200/404 |
| ANGEL_VIEWER | ✅ 200 | ❌ 403 |

