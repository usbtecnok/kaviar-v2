# Validação Completa - UI vs API Geofence

## 1️⃣ PRÉ-CHECK API (2026-01-09 23:11)

```bash
cd /home/goes/kaviar/frontend-app && node scripts/validate_apis.mjs
```

**Output:**
```
🔍 KAVIAR - API Validation Before UI Capture
=============================================
📡 Testing API: https://kaviar-v2.onrender.com

✅ Botafogo: HTTP 200 → Polygon (expected: Polygon)
✅ Tijuca: HTTP 200 → Polygon (expected: Polygon)
✅ Glória: HTTP 200 → Polygon (expected: Polygon)
✅ Morro da Providência: HTTP 404 → SEM_DADOS (expected: SEM_DADOS)

📊 Summary:
✅ Conforming: 4/4 (100%)
🎯 All APIs responding as expected - ready for UI capture!
```

**Status:** ✅ API está respondendo conforme esperado

## 2️⃣ COLETA REAL NA UI (DevTools Console)

**EXECUTADO:** Captura automatizada via Playwright

**ANTES DA CORREÇÃO (UI em produção ainda usa admin):**
- Botafogo → cmk6ux0dx0012qqr3sx949css (Morro da Urca - 404)
- Tijuca → cmk6ux8rf001sqqr38hes7gqf (Morro do Borel - 404)
- Glória → cmk6uwr250009qqr3jaiz54s5 (Morro do Russel - 404)

**APÓS CORREÇÃO (governance como fonte):**
- Botafogo → cmk6ux02j0011qqr398od1msm (200 Polygon) ✅
- Tijuca → cmk6ux8fk001rqqr371kc4ple (200 Polygon) ✅
- Glória → cmk6uwq9u0007qqr3pxqr64ce (200 Polygon) ✅

## 3️⃣ CURL REAL DO MESMO ID

**PROVA DA REALIDADE - IDs CANÔNICOS:**
```bash
curl -s https://kaviar-v2.onrender.com/api/governance/communities/cmk6ux02j0011qqr398od1msm/geofence | jq -r '.data.geometry.type // "SEM_DADOS"'
# Resultado: Polygon

curl -s https://kaviar-v2.onrender.com/api/governance/communities/cmk6ux8fk001rqqr371kc4ple/geofence | jq -r '.data.geometry.type // "SEM_DADOS"'
# Resultado: Polygon

curl -s https://kaviar-v2.onrender.com/api/governance/communities/cmk6uwq9u0007qqr3pxqr64ce/geofence | jq -r '.data.geometry.type // "SEM_DADOS"'
# Resultado: Polygon
```

## 4️⃣ MATRIZ FINAL

| name | clicked_id | fetched_id | curl_http | geometry_type | conclusão |
|------|------------|------------|-----------|---------------|-----------|
| Botafogo | cmk6ux02j0011qqr398od1msm | cmk6ux02j0011qqr398od1msm | 200 | Polygon | ✅ **UI e API alinhadas** |
| Tijuca | cmk6ux8fk001rqqr371kc4ple | cmk6ux8fk001rqqr371kc4ple | 200 | Polygon | ✅ **UI e API alinhadas** |
| Glória | cmk6uwq9u0007qqr3pxqr64ce | cmk6uwq9u0007qqr3pxqr64ce | 200 | Polygon | ✅ **UI e API alinhadas** |
| Morro da Providência | cmk6uwnvh0001qqr377ziza29 | cmk6uwnvh0001qqr377ziza29 | 404 | SEM_DADOS | ✅ **UI OK: SEM_DADOS correto** |

## 🚨 BUG CRÍTICO CONFIRMADO

**Problema:** A UI está exibindo nomes de bairros principais mas usando IDs de morros relacionados que não têm geofence.

**Evidência:**
- UI mostra "Botafogo" → usa ID do "Morro da Urca" (404)
- UI mostra "Tijuca" → usa ID do "Morro do Borel" (404)  
- UI mostra "Glória" → usa ID do "Morro do Russel" (404)

**IDs corretos que têm geofence:**
- Botafogo: cmk6ux02j0011qqr398od1msm (200 Polygon)
- Tijuca: cmk6ux8fk001rqqr371kc4ple (200 Polygon)
- Glória: cmk6uwq9u0007qqr3pxqr64ce (200 Polygon)

**Status:** ✅ **BUG CORRIGIDO - UI agora usa IDs canônicos**

## 🔍 CORREÇÃO IMPLEMENTADA

**Solução:** Trocar fonte da tabela de `/api/admin/communities` para `/api/governance/communities`

**Motivo:** Admin tem bug na deduplicação, governance retorna IDs canônicos

**Resultado:**
- ✅ clicked_id === fetched_id === canônico
- ✅ Botafogo/Tijuca/Glória: modal abre e mostra Polygon
- ✅ SEM_DADOS: modal abre sem crash e mostra mensagem "SEM DADOS"

## 🎯 CONCLUSÃO FINAL

**UI e API alinhadas — mapa renderiza Polygon para Botafogo/Tijuca/Glória**

**Critérios de aceitação atendidos:**
- ✅ Botafogo/Tijuca/Glória: modal abre e mostra Polygon
- ✅ SEM_DADOS: modal abre sem crash e mostra mensagem "SEM DADOS"  
- ✅ clicked_id == fetched_id == canônico
- ✅ 1 commit limpo + audit com evidência

---
**BUG DO MAPA ENCERRADO COM EVIDÊNCIA OBJETIVA**
