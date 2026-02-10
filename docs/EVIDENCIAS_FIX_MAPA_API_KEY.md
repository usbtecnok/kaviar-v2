# FIX BUG MAPA - CAUSA RAIZ IDENTIFICADA

**Data**: 2026-02-10  
**Commit**: 4aa55e6  
**Status**: ✅ CAUSA RAIZ IDENTIFICADA

---

## EVIDÊNCIA DO BUG (DevTools Console)

```javascript
18:06:07.891  [MAP] pickup raw: ▸ Object { lat: -22.9015552, lng: -43.2799744 }
18:06:07.892  [MAP] destination raw: null
18:06:07.892  [MAP] pickup parsed: ▸ Object { lat: -22.9015552, lng: -43.2799744, types: {…} }
```

### ✅ Coordenadas CORRETAS
- **lat**: -22.9015552 (number) ✅
- **lng**: -43.2799744 (number) ✅
- **Ordem**: {lat, lng} ✅
- **Localização**: Copacabana, Rio de Janeiro ✅

### ❌ Problema Identificado

**Erros no Console**:
```
⛔ You must use an API key to authenticate each request to Google Maps Platform APIs.
⛔ Google Maps JavaScript API warning: NoApiKeys
   https://developers.google.com/maps/documentation/javascript/error-messages#no-api-keys
```

**Causa raiz**: `VITE_GOOGLE_MAPS_API_KEY` não está configurada no build de produção.

**Impacto**:
- Mapa carrega em "modo desenvolvimento" (watermark "For development purposes only")
- Geocoding/Places podem falhar
- **Markers podem não renderizar na posição correta** sem autenticação válida
- Funcionalidades limitadas (rate limiting, sem suporte)

---

## SOLUÇÃO APLICADA

### 1. Workflow Corrigido
```yaml
# .github/workflows/deploy-frontend.yml

- name: Build
  run: |
    cd frontend-app
    npm ci
    npm run build
  env:
    VITE_API_BASE_URL: https://api.kaviar.com.br
    VITE_GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }}  # ✅ Adicionado
```

### 2. Secret Necessário

**⚠️ AÇÃO NECESSÁRIA**: Configurar secret no GitHub.

#### Opção A: Via GitHub UI
```
1. Acessar: https://github.com/usbtecnok/kaviar-v2/settings/secrets/actions
2. Clicar "New repository secret"
3. Name: GOOGLE_MAPS_API_KEY
4. Value: [SUA_API_KEY_AQUI]
5. Clicar "Add secret"
```

#### Opção B: Via GitHub CLI
```bash
gh secret set GOOGLE_MAPS_API_KEY --body "AIzaSy..."
```

### 3. Obter API Key do Google Maps

**Passo a passo**:
```
1. Acessar: https://console.cloud.google.com/google/maps-apis
2. Criar projeto (se não existir): "Kaviar Production"
3. Habilitar APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Criar credencial:
   - Tipo: API Key
   - Restrições: HTTP referrers
   - Websites permitidos:
     - https://kaviar.com.br/*
     - https://*.kaviar.com.br/*
5. Copiar API key
```

**Segurança**:
- ✅ Restringir por domínio (HTTP referrers)
- ✅ Habilitar apenas APIs necessárias
- ✅ Configurar billing alerts
- ❌ Nunca commitar API key no código

---

## VALIDAÇÃO

### Antes do Fix (❌)
```
Console: ⛔ NoApiKeys warning
Mapa: "For development purposes only"
Markers: Podem não renderizar corretamente
```

### Depois do Fix (✅)
```
Console: Sem erros de API key
Mapa: Sem watermark
Markers: Renderizam na posição correta
```

### Teste Pós-Deploy
```bash
# 1. Verificar se secret foi configurado
gh secret list | grep GOOGLE_MAPS_API_KEY

# 2. Trigger deploy
gh workflow run deploy-frontend.yml

# 3. Aguardar deploy
gh run watch

# 4. Testar em PROD
# Acessar: https://kaviar.com.br/passageiro/home
# DevTools Console: NÃO deve mostrar "NoApiKeys"
# Mapa: NÃO deve mostrar "For development purposes only"
# Marker: Deve aparecer em Copacabana (-22.9015552, -43.2799744)
```

---

## RUNBOOK: CONFIGURAR GOOGLE MAPS API KEY

### 1. Criar Projeto no Google Cloud
```
Console: https://console.cloud.google.com
Projeto: kaviar-production (ou nome desejado)
```

### 2. Habilitar APIs
```
APIs necessárias:
✅ Maps JavaScript API
✅ Places API  
✅ Geocoding API (opcional, para reverse geocoding)
```

### 3. Criar API Key
```
Credenciais → Criar credencial → Chave de API
Nome: Kaviar Frontend Production
```

### 4. Restringir API Key (IMPORTANTE)
```
Tipo de restrição: Referenciadores HTTP (sites)
Referenciadores permitidos:
  https://kaviar.com.br/*
  https://*.kaviar.com.br/*

Restrições de API:
  ✅ Maps JavaScript API
  ✅ Places API
  ✅ Geocoding API
```

### 5. Configurar Billing
```
Faturamento → Criar conta de faturamento
Configurar alertas:
  - Alerta em $50/mês
  - Alerta em $100/mês
  - Limite de $200/mês (opcional)
```

### 6. Adicionar Secret no GitHub
```bash
# Via CLI
gh secret set GOOGLE_MAPS_API_KEY --body "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Ou via UI
https://github.com/usbtecnok/kaviar-v2/settings/secrets/actions
```

### 7. Deploy e Validação
```bash
# Trigger deploy
gh workflow run deploy-frontend.yml

# Aguardar
gh run watch

# Testar
curl -I https://kaviar.com.br | grep -i cloudfront
# Deve retornar headers do CloudFront (cache invalidado)

# Abrir browser
https://kaviar.com.br/passageiro/home
# DevTools → Console → Sem erros de API key
```

---

## CUSTOS ESTIMADOS

### Google Maps Platform Pricing
```
Maps JavaScript API:
  - $7 por 1.000 carregamentos de mapa
  - Primeiro $200/mês grátis (crédito mensal)

Places API:
  - $17 por 1.000 requisições (Autocomplete)
  - $32 por 1.000 requisições (Place Details)

Estimativa mensal (100 usuários ativos/dia):
  - Carregamentos de mapa: ~3.000/mês = $21
  - Autocomplete: ~6.000/mês = $102
  - Place Details: ~3.000/mês = $96
  - Total: ~$219/mês
  - Com crédito: ~$19/mês
```

**Otimizações**:
- Cachear resultados de Places API
- Usar session tokens para Autocomplete
- Limitar zoom/pan excessivos
- Considerar Leaflet + OpenStreetMap para reduzir custos

---

## ALTERNATIVA: LEAFLET (SEM CUSTO)

Se custos forem proibitivos, considerar migrar para Leaflet:

```javascript
// Já existe implementação em:
// frontend-app/src/components/maps/LeafletGeofenceMap.jsx

// Vantagens:
✅ Gratuito (OpenStreetMap)
✅ Sem API key necessária
✅ Funcionalidade similar

// Desvantagens:
❌ Sem Places API (autocomplete de endereços)
❌ Sem Directions API (rotas)
❌ Tiles podem ser mais lentos
```

---

## COMMITS

- **df2c095**: fix(map): add detailed logging and type validation
- **4aa55e6**: fix(map): inject Google Maps API key in production build

---

## DoD (Definition of Done)

### Diagnóstico ✅ COMPLETO
- ✅ Coordenadas corretas identificadas (lat: -22.9015552, lng: -43.2799744)
- ✅ Tipos corretos (number, não string)
- ✅ Ordem correta ({lat, lng})
- ✅ Causa raiz identificada (API key faltando)

### Fix Aplicado ✅ COMPLETO
- ✅ Workflow atualizado para injetar VITE_GOOGLE_MAPS_API_KEY
- ✅ Documentação criada para configurar secret

### Pendente ⏳
- ⏳ Configurar secret GOOGLE_MAPS_API_KEY no GitHub
- ⏳ Deploy com API key válida
- ⏳ Validação em PROD (sem erros NoApiKeys)
- ⏳ Confirmar markers renderizam corretamente

---

## PRÓXIMOS PASSOS

1. **Obter API key** do Google Cloud Console
2. **Configurar secret** no GitHub: `gh secret set GOOGLE_MAPS_API_KEY`
3. **Deploy**: `gh workflow run deploy-frontend.yml`
4. **Testar** em https://kaviar.com.br/passageiro/home
5. **Validar**: Sem erros no console, markers na posição correta

---

**Status**: ✅ FIX PRONTO - Aguardando configuração de API key para deploy final
