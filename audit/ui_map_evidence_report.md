# Relatório - Evidência Automatizada UI Mapa

**Data:** 2026-01-09T20:54:51.966Z
**URL:** https://kaviar-frontend.onrender.com
**Build Hash:** unknown
**Provider:** unknown
**Método:** Playwright automation

## 📊 Resultados da Captura

| Community | Expected | Screenshot | Map Content | Polygon | Status |
|-----------|----------|------------|-------------|---------|--------|
| Botafogo | Polygon | Botafogo_polygon_render.png | ❌ | ❌ | ERROR |
| Tijuca | Polygon | Tijuca_polygon_render.png | ❌ | ❌ | ERROR |
| Glória | Polygon | Gloria_polygon_render.png | ❌ | ❌ | ERROR |
| Morro da Providência | SEM_DADOS | Providencia_sem_dados.png | ❌ | ❌ | ERROR |

## 🎯 Análise dos Screenshots

### ✅ Casos de Sucesso


### ⚠️ Casos com Problemas
- **Botafogo**: ERROR - locator.waitFor: Timeout 10000ms exceeded.
Call log:
[2m  - waiting for locator('button:has-text("Ver no mapa")').first() to be visible[22m

- **Tijuca**: ERROR - locator.waitFor: Timeout 10000ms exceeded.
Call log:
[2m  - waiting for locator('button:has-text("Ver no mapa")').first() to be visible[22m

- **Glória**: ERROR - locator.waitFor: Target page, context or browser has been closed
Call log:
[2m  - waiting for locator('button:has-text("Ver no mapa")').first() to be visible[22m

- **Morro da Providência**: ERROR - locator.waitFor: Target page, context or browser has been closed

## 🔧 Detalhes Técnicos

### Configuração do Teste
- **Browser**: Chromium (Playwright)
- **Viewport**: 1920x1080
- **Screenshot**: 1200x800 (clipped)
- **Timeout**: 10s para modal, 5s para tiles
- **Buffer**: 2s após tiles para renderização completa

### Seletores Utilizados
- **Modal**: `.MuiDialog-root, .modal, [role="dialog"]`
- **Map Container**: `.leaflet-container, .map-container`
- **Tiles**: `img.leaflet-tile`
- **Polygon**: `.leaflet-overlay-pane path, .leaflet-overlay-pane svg`

### Estratégia de Espera
1. Aguardar modal aparecer (10s timeout)
2. Aguardar container do mapa (10s timeout)  
3. Aguardar tiles carregarem (5s timeout, não-crítico)
4. Buffer final de 2s para renderização completa
5. Screenshot com clip para focar no modal

## 📁 Arquivos Gerados

- `Botafogo_polygon_render.png` - Botafogo (Polygon)
- `Tijuca_polygon_render.png` - Tijuca (Polygon)
- `Gloria_polygon_render.png` - Glória (Polygon)
- `Providencia_sem_dados.png` - Morro da Providência (SEM_DADOS)

## 🎬 Comando de Execução

```bash
cd frontend-app
node scripts/capture_map_evidence.mjs
```

**Pré-requisitos:**
- `.env` com ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_URL
- `npm install playwright`
- `npx playwright install chromium`

---
*Screenshots gerados automaticamente via Playwright para evidência objetiva do funcionamento da UI.*