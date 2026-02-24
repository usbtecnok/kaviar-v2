# Kaviar Driver PWA

Progressive Web App para motoristas do Kaviar - MVP com fluxo completo de login, GPS, offers e accept.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Abrir http://localhost:5173

**Não tem conta?** Clique em "📝 Solicitar Acesso"  
**Esqueceu a senha?** Clique em "Esqueci minha senha"

Ver `QUICK-START.md` para guia completo de 5 minutos.

## 📋 Definition of Done

Ver `DOD.md` para critérios de aceitação completos.

**Resumo:**
- ✅ Login funciona e token persiste
- ✅ Online/Offline muda no backend
- ✅ GPS envia a cada N segundos (configurável)
- ✅ SSE conecta e recebe offers
- ✅ Accept chama endpoint correto
- ✅ Evidências: logs estruturados + export

## Stack

- React 18
- Vite
- vite-plugin-pwa (service worker automático)
- Geolocation API
- EventSource (SSE)

## Regras de Implementação

### ✅ Confirmado no Código

Todos os endpoints foram confirmados via `rg` no código-fonte:

1. **Login:** `backend/src/routes/driver-auth.ts:19`
2. **Availability:** `backend/src/routes/drivers-v2.ts:36`
3. **Location:** `backend/src/routes/drivers-v2.ts:66`
4. **SSE:** `backend/src/routes/realtime.ts:58`
5. **Accept:** `backend/src/routes/drivers-v2.ts:100`

### 🔐 Segurança

- Token sempre via `Authorization: Bearer {token}`
- Nunca em query string
- Nunca logado (apenas metadata)

### 📱 Mobile-First

- Botões com min-height 44px (touch-friendly)
- Layout responsivo com flexWrap
- Font-size adequado para mobile

### 📊 Telemetria

- Todos os logs com tag `[PWA_DRIVER_*]`
- Formato estruturado JSON
- Exportável via botão "📥 Logs"
- Limitado a 100 entradas (evita memory leak)

### 📁 Evidências

- Logs salvos em `docs/evidencias/`
- Payload/response registrados (sem segredos)
- Checklist de testes em `docs/evidencias/README-DRIVER-PWA.md`

```
src/
├── lib/
│   ├── apiClient.js          # Fetch wrapper com Bearer token
│   └── auth.js                # Login + localStorage
├── hooks/
│   ├── useGPS.js              # Geolocation + envio automático
│   └── useRealtimeOffers.js   # EventSource SSE
├── pages/
│   ├── Login.jsx              # Tela de login
│   └── Dashboard.jsx          # Online/Offline + GPS + Offers
└── App.jsx                    # Router simples
```

## Configuração

### Development

Editar `.env`:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_REALTIME_URL=http://localhost:3000
VITE_GPS_INTERVAL_MS=10000
```

### Production

Editar `.env.production`:
```env
VITE_API_BASE_URL=https://api.kaviar.com
VITE_REALTIME_URL=https://realtime.kaviar.com
VITE_GPS_INTERVAL_MS=10000
```

## Scripts

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## Fluxo de Uso

1. **Login** → POST `/api/auth/driver/login` com `{ email, password }`
2. **Toggle Online** → POST `/api/v2/drivers/me/availability` com `{ availability: "online" | "offline" }`
3. **GPS** → Envia automaticamente a cada 10s via POST `/api/v2/drivers/me/location` com `{ lat, lng }`
4. **SSE** → Conecta em `/api/realtime/driver` (Bearer token no header) para receber eventos `offer`
5. **Accept** → POST `/api/v2/drivers/offers/:id/accept`

## Testar Localmente

### 1. Backend Mock (opcional)

Já existe `mock-server.js` no projeto.

Instalar dependências:
```bash
npm install express cors
```

Rodar:
```bash
node mock-server.js
```

### 2. Testar PWA

```bash
npm run dev
```

Abrir http://localhost:5173

- Login com qualquer email/password (mock aceita tudo)
- Permitir acesso à localização
- Clicar em "OFFLINE" para ficar "ONLINE"
- Aguardar 30s para receber offer
- Clicar em "Accept"

### 3. Validar Logs

Abrir DevTools → Console para ver:
- GPS updates a cada 10s
- Offers recebidas via SSE
- Accepts enviados

## Build PWA

```bash
npm run build
npm run preview
```

O service worker é gerado automaticamente em `dist/sw.js`.

## Endpoints Esperados

| Método | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/auth/driver/login` | `{ email, password }` | `{ token, user: { id, name, email, status } }` |
| POST | `/api/v2/drivers/me/availability` | `{ availability: "online"\|"offline"\|"busy" }` | `{ success: true }` |
| POST | `/api/v2/drivers/me/location` | `{ lat, lng, heading?, speed? }` | `{ success: true }` |
| GET | `/api/realtime/driver` | Header: `Authorization: Bearer {token}` | SSE stream |
| POST | `/api/v2/drivers/offers/:id/accept` | - | `{ success: true, data: { ride_id } }` |

## Troubleshooting

### GPS não funciona
- Verificar permissões do browser
- Usar HTTPS ou localhost (HTTP não permite geolocation)

### SSE não conecta
- Verificar CORS no backend
- Verificar token válido na query string

### Build falha
- Verificar versão do Node (recomendado >=20)
- Limpar cache: `rm -rf node_modules package-lock.json && npm install`
