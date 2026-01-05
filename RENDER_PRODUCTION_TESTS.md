# 🌐 TESTES PRODUÇÃO RENDER - INSTRUÇÕES

## 🔧 CORREÇÃO APLICADA:
- ✅ Processo duplicado PID 15155 encerrado
- ✅ Porta 3001 liberada
- ✅ Apenas 1 instância rodando

## 🌐 TESTES URL RENDER (PRODUÇÃO REAL):

### 1. Obter URL do Render:
Após deploy no Render, a URL será algo como:
```
https://kaviar-backend.onrender.com
```

### 2. Executar testes produção:
```bash
# Editar script com URL real
nano scripts/test-render-production.sh

# Substituir RENDER_URL pela URL real do Render
# Substituir ADMIN_PASSWORD pela senha real

# Executar testes
./scripts/test-render-production.sh
```

### 3. Comandos manuais (substitua URL_REAL):
```bash
# Teste 1: Health
curl -s https://URL_REAL/api/health

# Teste 2: Login admin
curl -X POST https://URL_REAL/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"SENHA_REAL"}'

# Teste 3: Elderly (com token)
curl -H "Authorization: Bearer TOKEN_REAL" \
  https://URL_REAL/api/admin/elderly/contracts

# Teste 4: Tour packages (com token)
curl -H "Authorization: Bearer TOKEN_REAL" \
  https://URL_REAL/api/admin/tour-packages
```

## ✅ CRITÉRIOS DE SUCESSO:
1. Health → 200 + features corretas
2. Login → token JWT válido
3. Elderly → 200 + lista contratos
4. Tours → 200 + lista pacotes

## 🚨 SE ALGUM TESTE FALHAR:
1. Verificar logs do Render
2. Verificar variáveis ambiente
3. Executar rollback se necessário
4. Reportar erro com detalhes
