# Quick Start - Driver PWA

## 1. Setup (1 minuto)

```bash
cd ~/kaviar/apps/kaviar-driver-pwa
npm install
```

## 2. Configurar Backend

Editar `.env`:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_REALTIME_URL=http://localhost:3000
VITE_GPS_INTERVAL_MS=10000
```

## 3. Rodar

```bash
npm run dev
```

Abrir: http://localhost:5173

## 4. Testar (5 minutos)

### Sem Conta?
- Clicar "📝 Solicitar Acesso"
- Preencher nome, email, telefone
- Se feature habilitada: criar senha
- Se feature desabilitada: abre WhatsApp

### Esqueceu Senha?
- Clicar "Esqueci minha senha"
- Inserir email
- Se feature habilitada: recebe email
- Se feature desabilitada: abre WhatsApp

### Login
- Email: `driver@example.com`
- Password: sua senha

### Verificar
1. ✅ Token no localStorage
2. ✅ Clicar "OFFLINE" → "ONLINE" (fica verde)
3. ✅ Ver coordenadas GPS na tela
4. ✅ Aguardar 30s → ver 3 logs de GPS no console
5. ✅ DevTools → Network → ver EventSource ativo
6. ✅ Clicar "📥 Logs" → baixar JSON

## 5. Evidências

```bash
# Salvar logs exportados
mv ~/Downloads/driver-pwa-logs-*.json ~/kaviar/docs/evidencias/

# Preencher template
cp ~/kaviar/docs/evidencias/TEMPLATE-EVIDENCIA.md \
   ~/kaviar/docs/evidencias/teste-$(date +%Y%m%d-%H%M).md
```

## DoD Checklist

- [ ] Login funciona
- [ ] Token persistido
- [ ] Online/Offline muda (response success: true)
- [ ] GPS envia a cada 10s (3 logs em 30s)
- [ ] SSE conectado (EventSource ativo)
- [ ] Accept funciona (se houver offer)
- [ ] Logs exportados

**Tempo total:** ~5 minutos

Ver `DOD.md` para critérios completos.
