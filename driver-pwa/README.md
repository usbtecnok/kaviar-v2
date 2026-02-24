# Driver PWA MVP

PWA React para motoristas do Kaviar - fluxo completo de login, GPS, offers e accept.

## Stack
- React + Vite
- PWA (offline-ready)
- SSE para real-time offers
- Geolocation API

## Setup

```bash
npm install
npm run dev
```

Abrir http://localhost:5173

## Configuração

Editar `.env`:
```
VITE_API_URL=https://api-staging.kaviar.com
VITE_GPS_INTERVAL=10000
```

## Fluxo

1. **Login** - POST /api/auth/driver/login
2. **Toggle Online/Offline** - POST /api/driver/status
3. **GPS** - Envia lat/lng a cada 10s via POST /api/driver/location
4. **SSE** - Conecta em /api/driver/realtime para receber offers
5. **Accept** - POST /api/driver/offer/:id/accept

## Evidências

```bash
./generate-evidence.sh
```

Gera pasta `docs/evidencias/staging-driver-pwa-{timestamp}/` com:
- Checklist de testes
- Queries CloudWatch
- Estrutura para screenshots/logs

## Build PWA

```bash
npm run build
npm run preview
```

O service worker é gerado automaticamente pelo vite-plugin-pwa.
