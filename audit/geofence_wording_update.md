# Atualização de Wording - Validação de Geofences

**Data:** 2026-01-09T10:52:34.337-03:00  
**Objetivo:** Melhorar UX com linguagem clara em português

## 🎯 Wording Implementado

### 1. Chip "Cerca" (Principal)
- **Polygon/MultiPolygon:** `Cerca: Sim` (verde)
- **Point:** `Cerca: Não (somente centro)` (cinza)
- **LineString/outros:** `Cerca: Não (não suportado)` (cinza)
- **Sem geometry:** `Cerca: Não (sem dados)` (cinza)

### 2. Chip "Centro dentro"
- **Polygon/MultiPolygon válidos:** `Centro dentro: Sim` (verde) ou `Centro dentro: Não` (vermelho)
- **Todos os demais:** `Centro dentro: N/A` (cinza)

### 3. Chip "Tamanho"
- **Polygon/MultiPolygon válidos:** `Tamanho: X.XX km² (Pequena/Média/Grande/Muito grande)` (azul)
- **Todos os demais:** `Tamanho: N/A` (azul)

### 4. Alerta "Fora do RJ"
- **Quando detectado:** `⚠️ Local fora do RJ — revisar / refetch` (amarelo)

## 📱 Cenários de Teste Simulados

### ✅ Cenário 1: Polygon (Cerca: Sim)
**Comunidade:** Mata Machado  
**Tipo:** Polygon  
**Localização:** Rio de Janeiro  

**Interface mostra:**
```
🟢 Cerca: Sim
🟢 Centro dentro: Sim
🔵 Tamanho: 2.34 km² (Média)
```

### ✅ Cenário 2: Point (Cerca: Não — somente centro)
**Comunidade:** Glória  
**Tipo:** Point  
**Localização:** Rio de Janeiro  

**Interface mostra:**
```
⚪ Cerca: Não (somente centro)
⚪ Centro dentro: N/A
🔵 Tamanho: N/A
```

### ✅ Cenário 3: LineString (Cerca: Não — não suportado)
**Comunidade:** Saúde  
**Tipo:** LineString  
**Localização:** Rio de Janeiro  

**Interface mostra:**
```
⚪ Cerca: Não (não suportado)
⚪ Centro dentro: N/A
🔵 Tamanho: N/A
```

### ✅ Cenário 4: Fora do RJ (aviso visível)
**Comunidade:** Alto da Boa Vista  
**Tipo:** LineString  
**Localização:** Bahia (-10.9005072, -37.6914723)  

**Interface mostra:**
```
⚪ Cerca: Não (não suportado)
⚪ Centro dentro: N/A
🔵 Tamanho: N/A
⚠️ Local fora do RJ — revisar / refetch
```

## 🔧 Implementação Técnica

### Função validateGeometry() Atualizada
- **Retorna:** `hasFence`, `centerInside`, `areaSize`, `isOutsideRJ`
- **Lógica:** Primeiro verifica RJ, depois tipo de geometria
- **Cálculos:** Só para Polygon/MultiPolygon dentro do RJ
- **Fallback:** N/A para casos não suportados

### Componentes Atualizados
- **Dialog do Mapa:** 3 chips + 2 alertas condicionais
- **Dialog de Edição:** 3 chips + 2 alertas condicionais
- **Cores:** Verde (sucesso), Vermelho (erro), Azul (info), Cinza (neutro), Amarelo (aviso)

### Alertas Implementados
1. **Centro fora do polígono:** "⚠️ Centro fora do polígono. Considere ajustar as coordenadas do centro."
2. **Local fora do RJ:** "⚠️ Local fora do RJ — revisar / refetch"

## ✅ Validações de Qualidade

- ✅ **Sem mudança de lógica:** Apenas wording atualizado
- ✅ **Sem alteração no banco:** Nenhuma query modificada
- ✅ **Sem novos endpoints:** Reutiliza estrutura existente
- ✅ **Build OK:** `npm run build` executado com sucesso
- ✅ **Sem Frankenstein:** Integra na validação existente

## 📊 Impacto na UX

### Antes (Técnico)
- "N/A (Point)", "N/A (LineString)"
- "Erro", "Inválido"
- Linguagem confusa para não-programadores

### Depois (Claro)
- "Cerca: Não (somente centro)", "Cerca: Não (não suportado)"
- "Local fora do RJ — revisar / refetch"
- Linguagem clara e orientativa

## 🎯 Como Funciona na Prática

### Para o Admin Revisor:
1. **Acessa `/admin/geofences`** → Lista de comunidades
2. **Clica "Mapa" ou "Editar"** → Abre dialog com indicadores
3. **Vê imediatamente:**
   - Se tem cerca (polígono) ou não
   - Se o centro está bem posicionado
   - Se o tamanho faz sentido
   - Se precisa de refetch (fora do RJ)

### Fluxo de Decisão:
- **"Cerca: Sim" + "Centro dentro: Sim"** → ✅ Geofence OK, marcar verificado
- **"Cerca: Sim" + "Centro dentro: Não"** → ⚠️ Ajustar coordenadas do centro
- **"Cerca: Não (somente centro)"** → ℹ️ Comunidade só tem ponto, OK para algumas situações
- **"Cerca: Não (não suportado)"** → 🔄 Precisa refetch com query restrita
- **"Local fora do RJ"** → 🔄 Definitivamente precisa refetch

### Benefícios:
- **Linguagem clara:** Admin não-técnico entende imediatamente
- **Orientação direta:** Sabe exatamente o que fazer em cada caso
- **Priorização:** Foca primeiro nos casos com cerca válida
- **Eficiência:** Não perde tempo tentando validar geometrias inadequadas

---

**Status:** ✅ Wording atualizado, UX melhorada, pronto para commit  
**Build hash:** `index-6kjbVb4I.js` (cache busting confirmado)
