# RBAC Angel Provisioning

## Objetivo

Provisionar 10 usuários ANGEL_VIEWER (angel1@kaviar.com até angel10@kaviar.com) com:
- Role: ANGEL_VIEWER (somente leitura)
- Senha inicial aleatória e segura
- Troca de senha obrigatória no primeiro login
- Execução idempotente (não duplica usuários existentes)

## Segurança

✅ **Senhas seguras**:
- Geradas com `crypto.randomBytes()` (12 caracteres)
- Hash bcrypt antes de armazenar
- Nunca commitadas no código

✅ **Exibição controlada**:
- Senhas iniciais mostradas APENAS no console durante execução
- Apenas para usuários recém-criados
- Operador deve copiar e distribuir de forma segura

✅ **Idempotência**:
- Script verifica existência antes de criar
- Pode rodar múltiplas vezes sem duplicar
- Mostra resumo: existing vs created

## Execução

### Via Node (local ou EC2)

```bash
cd backend
node scripts/provision-angels.js
```

### Via SSM (produção)

```bash
# 1. Upload script para EC2
aws ssm send-command \
  --instance-ids i-02aa0e71577a79305 \
  --document-name "AWS-RunShellScript" \
  --parameters commands=["cd /tmp && cat > provision.js <<'SCRIPT'
$(cat backend/scripts/provision-angels.js)
SCRIPT
DATABASE_URL='postgresql://...' node provision.js
"] \
  --region us-east-2

# 2. Coletar output com senhas
aws ssm get-command-invocation \
  --command-id COMMAND_ID \
  --instance-id i-02aa0e71577a79305 \
  --region us-east-2 \
  --query 'StandardOutputContent' \
  --output text
```

## Output Esperado

```
╔════════════════════════════════════════════════════════════╗
║  RBAC ANGEL PROVISIONING                                   ║
╚════════════════════════════════════════════════════════════╝

✓ angel1@kaviar.com - Already exists (skipped)
✓ angel2@kaviar.com - Created
✓ angel3@kaviar.com - Created
...
✓ angel10@kaviar.com - Created

╔════════════════════════════════════════════════════════════╗
║  PROVISIONING SUMMARY                                      ║
╚════════════════════════════════════════════════════════════╝

Existing: 1
Created:  9
Errors:   0

╔════════════════════════════════════════════════════════════╗
║  ⚠️  INITIAL PASSWORDS (COPY NOW - SHOWN ONCE)            ║
╚════════════════════════════════════════════════════════════╝

angel2@kaviar.com: aB3xK9mP2qR5
angel3@kaviar.com: zY8nL4wQ7tV2
...
angel10@kaviar.com: pM6jH3sD9kF1

⚠️  Save these passwords securely!
⚠️  Users must change password on first login.
```

## Validação

1. **Verificar criação**:
```sql
SELECT email, role, must_change_password 
FROM admins 
WHERE email LIKE 'angel%' 
ORDER BY email;
```

2. **Testar login**:
- URL: http://kaviar-frontend-847895361928.s3-website.us-east-2.amazonaws.com/admin/login
- Email: angel2@kaviar.com
- Senha: (copiar do output)
- Deve redirecionar para /change-password
- Após trocar senha, ver badge "👁️ Modo Leitura"

3. **Validar RBAC**:
- Botões de ação devem estar ESCONDIDOS
- Tentar ação via API deve retornar 403

## Distribuição de Senhas

**Recomendações**:
1. Copiar senhas do output imediatamente
2. Armazenar em gerenciador de senhas (1Password, LastPass, etc)
3. Distribuir via canal seguro (não email não criptografado)
4. Instruir investidores a trocar senha no primeiro acesso
5. Após distribuição, limpar logs/histórico do terminal

## Manutenção

**Adicionar mais angels**:
- Editar script: mudar loop `for (let i = 1; i <= 15; i++)`
- Rodar novamente (idempotente)

**Desativar angel**:
```sql
UPDATE admins SET is_active = false WHERE email = 'angel5@kaviar.com';
```

**Resetar senha** (emergência):
```javascript
const bcrypt = require('bcrypt');
const newPassword = 'TemporaryPass123';
const hash = bcrypt.hashSync(newPassword, 10);
// UPDATE admins SET password = '$hash', must_change_password = true WHERE email = 'angel5@kaviar.com';
```

## Segurança Adicional

- ✅ Senhas nunca commitadas
- ✅ Script não expõe endpoint público
- ✅ Execução requer acesso ao banco (produção) ou EC2
- ✅ Logs devem ser limpos após coleta de senhas
- ✅ Troca de senha obrigatória no primeiro login
- ✅ Badge visual identifica modo leitura
- ✅ Backend bloqueia ações (403)
