# Auditoria de Credibilidade - Documentos de Investidores
**Data:** 03/02/2026 19:33 BRT

## 🚨 Top 10 Pontos que Reduzem Confiança

### 1. ROI "50-100x em 3 anos" sem base
**Problema:** Promessa grandiosa sem metodologia
**Impacto:** Alto - Investidor experiente descarta imediatamente
**Solução:** Cenários com assunções claras + milestones

### 2. TAM R$ 936M sem fonte
**Problema:** Número específico sem referência
**Impacto:** Alto - Parece inventado
**Solução:** Metodologia de cálculo + fontes (IBGE, ABTM)

### 3. "13 milhões de habitantes" sem fonte
**Problema:** Dado demográfico sem referência
**Impacto:** Médio - Fácil de verificar e desmentir
**Solução:** Citar IBGE/DataFavela

### 4. Crescimento "12% ao ano" sem fonte
**Problema:** Taxa específica sem origem
**Impacto:** Médio - Reduz credibilidade geral
**Solução:** Citar relatório de mercado ou marcar como estimativa

### 5. Comparação negativa com Uber/99
**Problema:** Tom de "bater" nos concorrentes
**Impacto:** Médio - Parece amador
**Solução:** Matriz de diferenciação neutra

### 6. "Produto operacional" sem prova
**Problema:** Afirmação sem evidência
**Impacto:** Alto - Investidor quer ver
**Solução:** Screenshots, endpoint /health, custos AWS reais

### 7. Projeções sem assunções
**Problema:** Receita Ano 3: R$ 19,4M sem explicar como
**Impacto:** Alto - Parece otimista demais
**Solução:** Tabela com CAC, LTV, churn, take rate

### 8. "162 bairros mapeados" sem contexto
**Problema:** Número sem explicar o que significa
**Impacto:** Baixo - Mas reduz clareza
**Solução:** Explicar: geofences com PostGIS, X horas de trabalho

### 9. Custos "~$100/mês" muito baixos
**Problema:** Parece subestimado
**Impacto:** Médio - Investidor desconfia
**Solução:** Breakdown linha por linha com prints AWS

### 10. Falta de tração real
**Problema:** "12 usuários beta" é muito pouco
**Impacto:** Alto - Produto não validado
**Solução:** Ser honesto: "pré-lançamento, validação técnica completa"

---

## 📋 Changelog Planejado

### SUMARIO_EXECUTIVO_INVESTIDORES.md
- ✂️ Reduzir de 10 para 2-3 páginas
- ➕ Adicionar cenários (Conservador/Base/Otimista)
- ➕ Metodologia de cálculo de mercado
- ➕ CTA claro (demo 10min)
- 🔧 Remover "50-100x" → Substituir por cenários

### A_RELATORIO_TECNICO_KAVIAR.md
- ➕ Arquitetura em 1 página (ASCII)
- 🔧 Separar "Pronto" vs "Roadmap"
- ➕ Evidências (endpoint /health, custos AWS)
- ✂️ Remover jargão técnico excessivo
- 🔧 Focar em "redução de risco"

### B_ANALISE_MERCADO_MOBILIDADE.md
- ➕ Metodologia TAM/SAM/SOM com fórmula
- ➕ Fontes (IBGE, ABTM, estudos)
- ➕ Tabela unit economics (CAC, LTV, payback)
- 🔧 Matriz competitiva neutra (não "bater")
- ➕ Marcar estimativas claramente

### C_DUE_DILIGENCE_TECNICA.md
- 🔧 Transformar em checklist com ✅/⚠️/❌
- ➕ Evidências concretas (prints, logs)
- 🔧 Riscos com severidade (Alta/Média/Baixa)
- ➕ Seção "O que falta" (honestidade)
- ✂️ Remover promessas sem base

---

## 📊 Novos Arquivos a Criar

1. **PITCH_DECK_12_SLIDES.md**
   - Estrutura clássica de pitch
   - Texto slide a slide
   - Foco em problema → solução → tração

2. **SCRIPT_PITCH_90S.md**
   - Elevator pitch
   - 90 segundos cronometrados
   - Hook + problema + solução + pedido

3. **FAQ_INVESTIDOR.md**
   - 15 perguntas comuns
   - Respostas honestas
   - Validação, concorrência, LGPD, unit economics

---

## 🎯 Princípios da Revisão

1. **Honestidade > Marketing**
   - Admitir estágio pré-lançamento
   - Mostrar o que falta
   - Ser realista nas projeções

2. **Evidências > Afirmações**
   - Prints de AWS
   - Endpoint /health
   - Código no GitHub
   - Custos reais

3. **Metodologia > Números soltos**
   - Explicar como chegou no TAM
   - Mostrar fórmulas
   - Citar fontes ou marcar estimativa

4. **Cenários > Promessas**
   - Conservador / Base / Otimista
   - Assunções claras
   - Milestones para cada cenário

5. **Diferenciação > Competição**
   - "Somos fortes em X"
   - Não "Uber é ruim em Y"
   - Matriz neutra

---

## ⏱️ Tempo Estimado

- Auditoria: ✅ Completa (15 min)
- Revisão 4 docs: 60 min
- Novos 3 docs: 45 min
- **Total:** ~2 horas

---

**Próximo passo:** Revisar documentos um por um com as correções.
