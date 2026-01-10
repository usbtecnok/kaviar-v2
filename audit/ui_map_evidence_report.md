# Relatório - Evidência Automatizada UI Mapa

**Data:** 2026-01-10T02:30:40.273Z
**URL:** https://kaviar-frontend.onrender.com
**Build Hash:** unknown
**Provider:** unknown
**Método:** Playwright automation

## 📊 Resultados da Captura

| Community | Expected | Screenshot | Map Content | Polygon | Status |
|-----------|----------|------------|-------------|---------|--------|
| Botafogo | Polygon | FINAL_01_botafogo__expected-polygon__api-200-polygon__build-unknown.png | ❌ | ❌ | ERROR_MAP_CONTAINER |
| Tijuca | Polygon | FINAL_02_tijuca__expected-polygon__api-200-polygon__build-unknown.png | ❌ | ❌ | ERROR_MAP_CONTAINER |
| Glória | Polygon | FINAL_03_gloria__expected-polygon__api-200-polygon__build-unknown.png | ❌ | ❌ | ERROR_MAP_CONTAINER |
| Morro da Providência | SEM_DADOS | FINAL_04_morro_da_providencia__expected-sem_dados__api-404-sem_dados__build-unknown.png | ❌ | ❌ | ERROR_MAP_CONTAINER |

## 🎯 Análise dos Screenshots

### ✅ Casos de Sucesso
Nenhum caso de sucesso

### ⚠️ Casos Incompletos
Nenhum caso incompleto

### ❌ Casos com Erro
- **Botafogo**: ERROR_MAP_CONTAINER
- **Tijuca**: ERROR_MAP_CONTAINER
- **Glória**: ERROR_MAP_CONTAINER
- **Morro da Providência**: ERROR_MAP_CONTAINER

## 📊 Resumo de Status

- **SUCCESS**: 0/4
- **MAP_RENDER_INCOMPLETE**: 0/4
- **ERROR_LOGIN**: 0/4
- **ERROR_TABLE**: 0/4
- **ERROR_ROW_BUTTON**: 0/4

## ✅ Critérios de Aceitação

- **4 screenshots finais**: ✅ (4/4)
- **Pelo menos 1 Polygon com overlay**: ❌
- **Providência abre sem crash**: ❌

## 🐛 Informações de Debug



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

- `FINAL_01_botafogo__expected-polygon__api-200-polygon__build-unknown.png` - Botafogo (Polygon)
- `FINAL_02_tijuca__expected-polygon__api-200-polygon__build-unknown.png` - Tijuca (Polygon)
- `FINAL_03_gloria__expected-polygon__api-200-polygon__build-unknown.png` - Glória (Polygon)
- `FINAL_04_morro_da_providencia__expected-sem_dados__api-404-sem_dados__build-unknown.png` - Morro da Providência (SEM_DADOS)

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