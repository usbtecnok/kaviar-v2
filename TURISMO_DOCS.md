# Turismo Premium - Documentação

## Implementação Completa

### 1. Frontend (/turismo)

**Arquivo:** `frontend-app/src/pages/Turismo.jsx`

**Características:**
- Layout baseado no Replit (design premium dark theme)
- Hero section com imagem de fundo
- 3 combos turísticos com cards interativos
- Seção de features (Motoristas de Elite, Combos Exclusivos, Segurança Executiva)
- FAQ com Accordion do Material-UI
- Chat flutuante com IA integrada
- Botões WhatsApp em múltiplos pontos
- Totalmente responsivo

**Assets copiados:**
- `/public/turismo-replit/Gemini_Generated_Image_n3kx2kn3kx2kn3kx_1765055903753.png` (logo)
- `/public/turismo-replit/generated_images/luxury_sedan_in_rio_at_night.png` (hero)
- `/public/turismo-replit/generated_images/sugarloaf_mountain_golden_hour.png` (tour 1)
- `/public/turismo-replit/generated_images/tijuca_forest_road.png` (tour 2)
- `/public/turismo-replit/generated_images/christ_the_redeemer_majestic.png` (tour 3)

### 2. Backend API

**Arquivo:** `backend/src/routes/turismo.ts`

**Endpoint:** `POST /api/turismo/chat`

**Características:**
- Rate limiting: 10 mensagens/minuto por IP
- Validação de payload (max 500 caracteres)
- Feature flag: `FEATURE_TURISMO_AI`
- Integração com OpenAI GPT-3.5-turbo
- Fallback para FAQ quando IA está desabilitada
- Tratamento de erros robusto

**Payload:**
```json
{
  "message": "string",
  "conversationHistory": [
    { "role": "user|assistant", "content": "string" }
  ]
}
```

**Response:**
```json
{
  "reply": "string"
}
```

### 3. Variáveis de Ambiente

**Arquivo:** `backend/.env`

```bash
# Feature Flag - Habilitar/Desabilitar IA no chat
FEATURE_TURISMO_AI=true

# OpenAI API Key (obrigatória se FEATURE_TURISMO_AI=true)
OPENAI_API_KEY=sk-proj-...

# Opcional: Modelo OpenAI (padrão: gpt-3.5-turbo)
OPENAI_MODEL=gpt-3.5-turbo
```

**Comportamento:**
- `FEATURE_TURISMO_AI=false` → Fallback para FAQ + botão WhatsApp
- `FEATURE_TURISMO_AI=true` + `OPENAI_API_KEY` ausente → Erro 503 + mensagem WhatsApp
- `FEATURE_TURISMO_AI=true` + `OPENAI_API_KEY` presente → Chat com IA funcional

### 4. Comandos de Teste

#### Teste Local - Frontend

```bash
# Navegar para o frontend
cd /home/goes/kaviar/frontend-app

# Instalar dependências (se necessário)
npm install

# Iniciar dev server
npm run dev

# Acessar no navegador
# http://localhost:5173/turismo
```

#### Teste Local - Backend

```bash
# Navegar para o backend
cd /home/goes/kaviar/backend

# Configurar variáveis de ambiente
cp .env.example .env
nano .env  # Adicionar FEATURE_TURISMO_AI e OPENAI_API_KEY

# Instalar dependências (se necessário)
npm install

# Iniciar servidor
npm run dev

# Backend rodará em http://localhost:3000
```

#### Teste da API com curl

```bash
# Teste com IA habilitada
curl -X POST http://localhost:3000/api/turismo/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quais são os horários disponíveis?",
    "conversationHistory": []
  }'

# Teste de rate limiting (enviar 11 requisições rápidas)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/turismo/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "teste"}' &
done
wait

# Teste de validação (mensagem muito longa)
curl -X POST http://localhost:3000/api/turismo/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"$(printf 'a%.0s' {1..501})\"}"
```

#### Teste End-to-End

```bash
# 1. Iniciar backend
cd /home/goes/kaviar/backend
npm run dev &

# 2. Iniciar frontend
cd /home/goes/kaviar/frontend-app
npm run dev &

# 3. Abrir navegador
xdg-open http://localhost:5173/turismo

# 4. Testar funcionalidades:
# - Scroll pela página
# - Clicar nos cards de tours
# - Abrir chat flutuante
# - Enviar mensagens
# - Testar botões WhatsApp
# - Verificar FAQ accordion
```

### 5. Estrutura de Arquivos

```
/home/goes/kaviar/
├── frontend-app/
│   ├── public/
│   │   └── turismo-replit/
│   │       ├── Gemini_Generated_Image_n3kx2kn3kx2kn3kx_1765055903753.png
│   │       └── generated_images/
│   │           ├── luxury_sedan_in_rio_at_night.png
│   │           ├── sugarloaf_mountain_golden_hour.png
│   │           ├── tijuca_forest_road.png
│   │           └── christ_the_redeemer_majestic.png
│   └── src/
│       └── pages/
│           └── Turismo.jsx (ATUALIZADO)
└── backend/
    └── src/
        └── routes/
            ├── turismo.ts (ATUALIZADO)
            └── index.ts (ATUALIZADO - registra rota)
```

### 6. Checklist de Deploy

- [ ] Configurar `OPENAI_API_KEY` no ambiente de produção
- [ ] Definir `FEATURE_TURISMO_AI=true` (ou `false` para fallback)
- [ ] Verificar rate limiting em produção
- [ ] Testar chat em diferentes dispositivos (mobile/desktop)
- [ ] Validar imagens carregando corretamente
- [ ] Confirmar botões WhatsApp com número correto (21) 96864-8777
- [ ] Monitorar logs de erro da API OpenAI
- [ ] Configurar alertas para rate limit excedido

### 7. Monitoramento

**Logs importantes:**
```bash
# Backend - erros de chat
tail -f backend/logs/error.log | grep "Erro no chat"

# Backend - rate limiting
tail -f backend/logs/access.log | grep "429"

# Backend - OpenAI API
tail -f backend/logs/error.log | grep "OpenAI"
```

### 8. Troubleshooting

**Problema:** Chat não responde
- Verificar `FEATURE_TURISMO_AI` no .env
- Verificar `OPENAI_API_KEY` válida
- Checar logs do backend
- Testar endpoint diretamente com curl

**Problema:** Imagens não carregam
- Verificar paths em `Turismo.jsx`
- Confirmar arquivos em `/public/turismo-replit/`
- Checar permissões dos arquivos

**Problema:** Rate limit muito restritivo
- Ajustar `windowMs` e `max` em `turismo.ts`
- Considerar rate limit por usuário autenticado (não por IP)

### 9. Melhorias Futuras

- [ ] Adicionar histórico de conversas no localStorage
- [ ] Implementar typing indicator animado
- [ ] Adicionar sugestões de perguntas rápidas
- [ ] Integrar com sistema de reservas
- [ ] Adicionar analytics (Google Analytics/Mixpanel)
- [ ] Implementar A/B testing para CTAs
- [ ] Adicionar galeria de fotos dos tours
- [ ] Criar sistema de avaliações/reviews
- [ ] Implementar calendário de disponibilidade
- [ ] Adicionar mapa interativo dos roteiros

---

**Contato WhatsApp:** (21) 96864-8777
**Última atualização:** 2026-02-22
