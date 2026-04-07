# Migração de Emails de Investidores/Anjos

## Contexto
Contas com emails genéricos (`investor01@kaviar.com`, `angel1@kaviar.com`) não permitem recuperação de senha via email real.

## Solução
Script SQL idempotente que cria/atualiza contas com emails reais mantendo permissões read-only.

## Execução

### 1. Preencher Mapping
Edite `backend/scripts/email-mapping.csv` e substitua os placeholders:
```csv
investor01@kaviar.com,joao.silva@exemplo.com
investor02@kaviar.com,maria.santos@exemplo.com
...
```

### 2. Gerar SQL Pronto
```bash
cd backend/scripts
node apply-email-mapping.js
```
Isso gera `migrate-investor-emails-READY.sql` com emails reais.

### 3. Executar Script
```bash
# Via psql
psql $DATABASE_URL -f backend/scripts/migrate-investor-emails-READY.sql

# Ou via Docker (se aplicável)
docker exec -i postgres_container psql -U user -d database < backend/scripts/migrate-investor-emails-READY.sql
```

### 4. Validar
```sql
SELECT email, name, role, must_change_password, active 
FROM admins 
WHERE role IN ('INVESTOR_VIEW', 'ANGEL_VIEWER') 
ORDER BY role, email;
```

## Checklist de Testes (curl)

### Teste 1: Forgot Password com Email Real
```bash
curl -i -X POST "https://api.kaviar.com.br/api/admin/auth/forgot-password" \
  -H "Origin: https://app.kaviar.com.br" \
  -H "Content-Type: application/json" \
  -d '{"email":"<EMAIL_REAL_INVESTIDOR_1>","userType":"admin"}'
```
**Esperado:** HTTP 200 + mensagem de sucesso

### Teste 2: Login com Email Real (deve falhar - senha não definida)
```bash
curl -i -X POST "https://api.kaviar.com.br/api/admin/auth/login" \
  -H "Origin: https://app.kaviar.com.br" \
  -H "Content-Type: application/json" \
  -d '{"email":"<EMAIL_REAL_INVESTIDOR_1>","password":"qualquer"}'
```
**Esperado:** HTTP 401 (senha inválida até usuário redefinir)

### Teste 3: Verificar CORS
```bash
curl -i -X OPTIONS "https://api.kaviar.com.br/api/admin/auth/forgot-password" \
  -H "Origin: https://app.kaviar.com.br" \
  -H "Access-Control-Request-Method: POST"
```
**Esperado:** HTTP 204 + headers CORS

### Teste 4: Rate Limiting
```bash
# Execute 4x seguidas
for i in {1..4}; do
  curl -i -X POST "https://api.kaviar.com.br/api/admin/auth/forgot-password" \
    -H "Origin: https://app.kaviar.com.br" \
    -H "Content-Type: application/json" \
    -d '{"email":"<EMAIL_REAL_INVESTIDOR_1>","userType":"admin"}'
  echo "\n---\n"
done
```
**Esperado:** 3x HTTP 200, 4ª HTTP 429 (rate limit)

### Teste 5: Verificar Middleware Read-Only (após login bem-sucedido)
```bash
# Primeiro, usuário precisa redefinir senha via email e fazer login
# Depois testar operação de escrita (deve falhar)
curl -i -X POST "https://api.kaviar.com.br/api/drivers" \
  -H "Origin: https://app.kaviar.com.br" \
  -H "Authorization: Bearer <TOKEN_DO_INVESTIDOR>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste"}'
```
**Esperado:** HTTP 403 (operação bloqueada por investorView middleware)

## Características do Script

✅ **Idempotente:** Pode ser executado múltiplas vezes sem duplicar dados  
✅ **Seguro:** Não deleta contas antigas (mantém histórico)  
✅ **UPSERT:** Cria se não existe, atualiza se existe  
✅ **Força troca de senha:** `must_change_password=true`  
✅ **Mantém permissões:** Role read-only preservado  

## Rollback (se necessário)

Para desativar contas com emails reais sem deletar:
```sql
UPDATE admins 
SET active = false 
WHERE email IN ('<EMAIL_REAL_1>', '<EMAIL_REAL_2>', ...);
```

## Notas

- Contas antigas (`investor01@kaviar.com`) permanecem no banco mas podem ser desativadas manualmente
- Password placeholder `$2a$10$placeholder` força uso do fluxo "esqueci minha senha"
- Rate limit: 3 requests/hora por IP no endpoint forgot-password
