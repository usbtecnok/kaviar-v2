# Relatório - Evidência Automatizada UI Mapa

**Data:** 2026-01-09T21:22:41.958Z
**URL:** https://kaviar-frontend.onrender.com
**Build Hash:** unknown
**Provider:** unknown
**Método:** Playwright automation

## 📊 Resultados da Captura

| Community | Expected | Screenshot | Map Content | Polygon | Status |
|-----------|----------|------------|-------------|---------|--------|
| Botafogo | Polygon | Botafogo_polygon_render.png | ❌ | ❌ | ERROR_ROW_BUTTON |
| Tijuca | Polygon | Tijuca_polygon_render.png | ❌ | ❌ | ERROR_ROW_BUTTON |
| Glória | Polygon | Gloria_polygon_render.png | ❌ | ❌ | ERROR_ROW_BUTTON |
| Morro da Providência | SEM_DADOS | Providencia_sem_dados.png | ❌ | ❌ | ERROR_ROW_BUTTON |

## 🎯 Análise dos Screenshots

### ✅ Casos de Sucesso
Nenhum caso de sucesso

### ⚠️ Casos Incompletos
Nenhum caso incompleto

### ❌ Casos com Erro
- **Botafogo**: ERROR_ROW_BUTTON - page.waitForSelector: Timeout 20000ms exceeded.
Call log:
[2m  - waiting for locator('.leaflet-container') to be visible[22m
 (Debug: DEBUG_ROW_OR_BUTTON_Botafogo.png)
- **Tijuca**: ERROR_ROW_BUTTON - locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('tr:has-text("Tijuca")').first().locator('button:has-text("Mapa")').first()[22m
[2m    - locator resolved to <button tabindex="0" type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeSmall MuiButton-textSizeSmall MuiButton-colorPrimary MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeSmall MuiButton-textSizeSmall MuiButton-colorPrimary css-gpiv61">…</button>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div role="alert" class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation0 MuiAlert-root MuiAlert-colorError MuiAlert-standardError MuiAlert-standard css-18v9qb4">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  2 × retrying click action[22m
[2m      - waiting 100ms[22m
[2m      - waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  14 × retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div role="alert" class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation0 MuiAlert-root MuiAlert-colorError MuiAlert-standardError MuiAlert-standard css-18v9qb4">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
 (Debug: DEBUG_ROW_OR_BUTTON_Tijuca.png)
- **Glória**: ERROR_ROW_BUTTON - locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('tr:has-text("Glória")').first().locator('button:has-text("Mapa")').first()[22m
[2m    - locator resolved to <button tabindex="0" type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeSmall MuiButton-textSizeSmall MuiButton-colorPrimary MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeSmall MuiButton-textSizeSmall MuiButton-colorPrimary css-gpiv61">…</button>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div role="alert" class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation0 MuiAlert-root MuiAlert-colorError MuiAlert-standardError MuiAlert-standard css-18v9qb4">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  2 × retrying click action[22m
[2m      - waiting 100ms[22m
[2m      - waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  14 × retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div role="alert" class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation0 MuiAlert-root MuiAlert-colorError MuiAlert-standardError MuiAlert-standard css-18v9qb4">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
 (Debug: DEBUG_ROW_OR_BUTTON_Glória.png)
- **Morro da Providência**: ERROR_ROW_BUTTON - locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('tr:has-text("Morro da Providência")').first().locator('button:has-text("Mapa")').first()[22m
[2m    - locator resolved to <button tabindex="0" type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeSmall MuiButton-textSizeSmall MuiButton-colorPrimary MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeSmall MuiButton-textSizeSmall MuiButton-colorPrimary css-gpiv61">…</button>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div role="alert" class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation0 MuiAlert-root MuiAlert-colorError MuiAlert-standardError MuiAlert-standard css-18v9qb4">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  2 × retrying click action[22m
[2m      - waiting 100ms[22m
[2m      - waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  14 × retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div role="alert" class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation0 MuiAlert-root MuiAlert-colorError MuiAlert-standardError MuiAlert-standard css-18v9qb4">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
 (Debug: DEBUG_ROW_OR_BUTTON_Morro_da_Providência.png)

## 📊 Resumo de Status

- **SUCCESS**: 0/4
- **MAP_RENDER_INCOMPLETE**: 0/4
- **ERROR_LOGIN**: 0/4
- **ERROR_TABLE**: 0/4
- **ERROR_ROW_BUTTON**: 4/4

## ✅ Critérios de Aceitação

- **4 screenshots finais**: ✅ (4/4)
- **Pelo menos 1 Polygon com overlay**: ❌
- **Providência abre sem crash**: ❌

## 🐛 Informações de Debug


### Botafogo - Erro Detalhado
- **Status**: ERROR_ROW_BUTTON
- **Erro**: page.waitForSelector: Timeout 20000ms exceeded.
Call log:
[2m  - waiting for locator('.leaflet-container') to be visible[22m

- **Debug Screenshot**: DEBUG_ROW_OR_BUTTON_Botafogo.png
- **Console Logs**: N/A


### Tijuca - Erro Detalhado
- **Status**: ERROR_ROW_BUTTON
- **Erro**: locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('tr:has-text("Tijuca")').first().locator('button:has-text("Mapa")').first()[22m
[2m    - locator resolved to <button tabindex="0" type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeSmall MuiButton-textSizeSmall MuiButton-colorPrimary MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeSmall MuiButton-textSizeSmall MuiButton-colorPrimary css-gpiv61">…</button>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div role="alert" class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation0 MuiAlert-root MuiAlert-colorError MuiAlert-standardError MuiAlert-standard css-18v9qb4">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  2 × retrying click action[22m
[2m      - waiting 100ms[22m
[2m      - waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  14 × retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div role="alert" class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation0 MuiAlert-root MuiAlert-colorError MuiAlert-standardError MuiAlert-standard css-18v9qb4">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m

- **Debug Screenshot**: DEBUG_ROW_OR_BUTTON_Tijuca.png
- **Console Logs**: N/A


### Glória - Erro Detalhado
- **Status**: ERROR_ROW_BUTTON
- **Erro**: locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('tr:has-text("Glória")').first().locator('button:has-text("Mapa")').first()[22m
[2m    - locator resolved to <button tabindex="0" type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeSmall MuiButton-textSizeSmall MuiButton-colorPrimary MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeSmall MuiButton-textSizeSmall MuiButton-colorPrimary css-gpiv61">…</button>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div role="alert" class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation0 MuiAlert-root MuiAlert-colorError MuiAlert-standardError MuiAlert-standard css-18v9qb4">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  2 × retrying click action[22m
[2m      - waiting 100ms[22m
[2m      - waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  14 × retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div role="alert" class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation0 MuiAlert-root MuiAlert-colorError MuiAlert-standardError MuiAlert-standard css-18v9qb4">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m

- **Debug Screenshot**: DEBUG_ROW_OR_BUTTON_Glória.png
- **Console Logs**: N/A


### Morro da Providência - Erro Detalhado
- **Status**: ERROR_ROW_BUTTON
- **Erro**: locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('tr:has-text("Morro da Providência")').first().locator('button:has-text("Mapa")').first()[22m
[2m    - locator resolved to <button tabindex="0" type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeSmall MuiButton-textSizeSmall MuiButton-colorPrimary MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeSmall MuiButton-textSizeSmall MuiButton-colorPrimary css-gpiv61">…</button>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div role="alert" class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation0 MuiAlert-root MuiAlert-colorError MuiAlert-standardError MuiAlert-standard css-18v9qb4">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  2 × retrying click action[22m
[2m      - waiting 100ms[22m
[2m      - waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  14 × retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div role="alert" class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation0 MuiAlert-root MuiAlert-colorError MuiAlert-standardError MuiAlert-standard css-18v9qb4">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper css-ekeie0">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root css-126xj0f">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m

- **Debug Screenshot**: DEBUG_ROW_OR_BUTTON_Morro_da_Providência.png
- **Console Logs**: N/A


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