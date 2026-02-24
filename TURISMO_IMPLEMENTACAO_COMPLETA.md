# Landing Turismo Premium - Implementação Completa

## ✅ Implementação Concluída

Landing page estilo Replit com fotos, combos e chat IA integrado.

---

## 📁 Arquivos Criados/Modificados

### Frontend
- ✅ `frontend-app/src/pages/Turismo.jsx` - Landing completa
- ✅ `frontend-app/public/hero/` - Pasta para hero image
- ✅ `frontend-app/public/combos/` - Pasta para fotos dos combos
- ✅ `frontend-app/public/IMAGENS_README.md` - Guia de imagens

### Backend
- ✅ `backend/src/routes/turismo.ts` - Endpoint de chat IA
- ✅ `backend/src/app.ts` - Rota registrada
- ✅ `backend/.env.example` - Variáveis documentadas

---

## 🎨 Features da Landing

### Hero Section
- Imagem de fundo full-screen (`/hero/hero.jpg`)
- Overlay com gradiente roxo/azul
- CTA WhatsApp destacado
- Responsivo mobile/desktop

### Combos Section
- 3 cards com imagens de fundo
- Overlay escuro com hover effect
- Informações: título, descrição, preço
- Botão WhatsApp em cada card

### Chat Section
- Interface de chat moderna
- Histórico de mensagens
- Input com botão enviar
- Loading state
- FAQ buttons (quando IA desabilitada)
- Fallback para WhatsApp

---

## 🔧 Configuração Backend

### 1. Variáveis de Ambiente

Adicione no arquivo `backend/.env`:

```bash
# Turismo AI Chat
FEATURE_TURISMO_AI=true
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Obter chave OpenAI:**
1. Acesse: https://platform.openai.com/api-keys
2. Crie uma nova chave
3. Cole no .env (NUNCA comite!)

### 2. Instalar Dependências

```bash
cd /home/goes/kaviar/backend
npm install express-rate-limit
```

### 3. Testar Endpoint

```bash
# Iniciar backend
cd /home/goes/kaviar/backend
npm run dev

# Testar (em outro terminal)
curl -X POST http://localhost:3001/api/turismo/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Quanto custa o city tour?"}'
```

**Resposta esperada:**
```json
{
  "reply": "O City Tour Premium custa a partir de R$ 400..."
}
```

---

## 🎨 Configuração Frontend

### 1. Adicionar Imagens

Coloque as fotos nas pastas:

```
frontend-app/public/
├── hero/
│   └── hero.jpg          (1920x1080px - Vista do Rio)
└── combos/
    ├── aeroporto.jpg     (800x600px - Aeroporto/Transfer)
    ├── citytour.jpg      (800x600px - Cristo/Pão de Açúcar)
    └── praias.jpg        (800x600px - Praias)
```

**Fontes gratuitas:**
- Unsplash: https://unsplash.com/s/photos/rio-de-janeiro
- Pexels: https://www.pexels.com/search/rio%20de%20janeiro/

### 2. Personalizar WhatsApp

Edite `frontend-app/src/pages/Turismo.jsx` linha 35:

```javascript
const handleWhatsApp = () => {
  window.open('https://wa.me/5521999999999?text=...', '_blank');
  //                        ^^^^^^^^^^^^
  //                        Seu número aqui
};
```

### 3. Testar Frontend

```bash
cd /home/goes/kaviar/frontend-app
npm run dev
```

Acesse: http://localhost:3000/turismo

---

## 🧪 Testes

### Teste 1: Landing Visual
1. Acesse `/turismo`
2. Verifique hero com imagem
3. Verifique 3 combos com fotos
4. Teste hover nos cards
5. Teste botões WhatsApp

### Teste 2: Chat FAQ (IA Desabilitada)
1. Configure `FEATURE_TURISMO_AI=false`
2. Clique nos botões de FAQ
3. Digite perguntas
4. Verifique respostas automáticas

### Teste 3: Chat IA (IA Habilitada)
1. Configure `FEATURE_TURISMO_AI=true`
2. Configure `OPENAI_API_KEY`
3. Digite: "Quanto custa o transfer?"
4. Verifique resposta da IA
5. Teste rate limit (10 msgs/min)

### Teste 4: Responsividade
1. Abra DevTools (F12)
2. Teste em mobile (375px)
3. Teste em tablet (768px)
4. Teste em desktop (1920px)

---

## 🚀 Deploy

### Frontend

```bash
cd /home/goes/kaviar/frontend-app
npm run build

# Deploy para seu servidor/S3/CloudFront
# (seguir processo atual de deploy)
```

### Backend

```bash
cd /home/goes/kaviar/backend

# Adicionar variáveis no ambiente de produção
# FEATURE_TURISMO_AI=true
# OPENAI_API_KEY=sk-proj-...

npm run build
npm start
```

---

## 📊 Monitoramento

### Logs Backend

```bash
# Ver logs do chat
tail -f /home/goes/kaviar/backend/logs/app.log | grep turismo
```

### Métricas

- Rate limit: 10 mensagens/minuto por IP
- Timeout OpenAI: 30s
- Max tokens: 150 (resposta curta)
- Custo estimado: ~$0.002 por mensagem

---

## 🔒 Segurança

### ✅ Implementado

- Rate limiting (10 req/min)
- Validação de input (max 500 chars)
- Chave OpenAI no backend (nunca exposta)
- Feature flag para desabilitar IA
- Fallback para WhatsApp em caso de erro
- CORS configurado
- Sanitização de mensagens

### ⚠️ Recomendações

1. **Monitorar custos OpenAI**: https://platform.openai.com/usage
2. **Ajustar rate limit** se necessário (linha 8 em `turismo.ts`)
3. **Revisar logs** regularmente para detectar abuso
4. **Backup FAQ**: Sempre manter FAQ manual como fallback

---

## 🐛 Troubleshooting

### Problema: Imagens não aparecem

**Solução:**
```bash
# Verificar se as pastas existem
ls -la /home/goes/kaviar/frontend-app/public/hero/
ls -la /home/goes/kaviar/frontend-app/public/combos/

# Verificar permissões
chmod 644 /home/goes/kaviar/frontend-app/public/hero/hero.jpg
chmod 644 /home/goes/kaviar/frontend-app/public/combos/*.jpg
```

### Problema: Chat não responde

**Diagnóstico:**
```bash
# 1. Verificar backend rodando
curl http://localhost:3001/health

# 2. Verificar variáveis
cd /home/goes/kaviar/backend
grep FEATURE_TURISMO_AI .env
grep OPENAI_API_KEY .env

# 3. Testar endpoint diretamente
curl -X POST http://localhost:3001/api/turismo/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "teste"}'
```

### Problema: Erro 429 (Rate Limit)

**Solução:**
- Aguardar 1 minuto
- Ou ajustar limite em `backend/src/routes/turismo.ts` linha 8

### Problema: Erro OpenAI

**Verificar:**
1. Chave válida: https://platform.openai.com/api-keys
2. Créditos disponíveis: https://platform.openai.com/usage
3. Quota não excedida

---

## 📝 Próximos Passos

- [ ] Adicionar imagens reais
- [ ] Configurar número WhatsApp real
- [ ] Ativar FEATURE_TURISMO_AI=true
- [ ] Configurar OPENAI_API_KEY
- [ ] Testar em staging
- [ ] Deploy em produção
- [ ] Monitorar custos OpenAI
- [ ] Cancelar Replit

---

## 💰 Custos Estimados

### OpenAI (GPT-3.5-turbo)
- Input: $0.0015 / 1K tokens
- Output: $0.002 / 1K tokens
- Média por mensagem: ~$0.002
- 1000 mensagens/mês: ~$2.00

### Alternativa Gratuita
- Desabilitar IA: `FEATURE_TURISMO_AI=false`
- Usar FAQ guiado + WhatsApp
- Custo: $0

---

## 📞 Suporte

Dúvidas sobre a implementação:
- Revisar este README
- Verificar logs: `backend/logs/`
- Testar endpoints com curl
- Verificar console do navegador (F12)
