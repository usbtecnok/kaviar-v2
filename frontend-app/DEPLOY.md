# 🚀 DEPLOY GUIDE - KAVIAR FRONTEND

## 📋 Pré-requisitos

- Backend rodando em produção
- Chave do Google Maps válida
- Conta no Vercel/Netlify/Render

## 🔧 Configuração de Ambiente

### 1. Variáveis de Ambiente (Produção)
```bash
VITE_API_BASE_URL=https://your-backend-url.onrender.com
VITE_GOOGLE_MAPS_API_KEY="<SET_IN_ENV>"
```

### 2. Build Local
```bash
npm install
npm run build
```

## 🌐 Deploy Vercel

### Via CLI
```bash
npm install -g vercel
vercel --prod
```

### Via Dashboard
1. Conectar repositório GitHub
2. Configurar variáveis de ambiente
3. Deploy automático

## 🌐 Deploy Netlify

### Via CLI
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Via Dashboard
1. Drag & drop da pasta `dist/`
2. Configurar variáveis de ambiente

## 🌐 Deploy Render

### Configuração
- Build Command: `npm run build`
- Publish Directory: `dist`
- Environment Variables: Configurar no dashboard

## 🔗 Integração com Backend

### Endpoints Mapeados
- Health Check: `/health`
- Communities: `/api/v1/communities`
- Dashboard: `/api/v1/dashboard/overview`
- Drivers: `/api/v1/drivers/availability`
- Rides: `/api/v1/rides`
- Panic: `/api/messages/panic`

### Autenticação
- Mock login implementado para demonstração
- Conecta com endpoint `/health` para validar backend
- JWT armazenado em localStorage

## 🗺️ Google Maps

### Configuração
1. Obter chave da API no Google Cloud Console
2. Habilitar APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
3. Configurar restrições de domínio

### Uso
- Autocomplete de endereços
- Visualização de mapas
- Geolocalização

## 🧪 Teste de Produção

### Checklist
- [ ] Build sem erros
- [ ] Conectividade com backend
- [ ] Login funcional
- [ ] Rotas protegidas
- [ ] Google Maps carregando
- [ ] Responsividade mobile

### URLs de Teste
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.onrender.com/health`

## 🔧 Troubleshooting

### Build Falha
- Verificar imports de assets
- Confirmar variáveis de ambiente
- Limpar cache: `rm -rf node_modules package-lock.json && npm install`

### Backend Não Conecta
- Verificar VITE_API_BASE_URL
- Confirmar CORS no backend
- Testar endpoint /health diretamente

### Google Maps Não Carrega
- Verificar chave da API
- Confirmar restrições de domínio
- Verificar billing no Google Cloud
