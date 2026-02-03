# Patch Notes - Correção TAM e Ajustes
**Data:** 03/02/2026 20:00 BRT  
**Versão:** 2.1

---

## 🎯 O Que Mudou

### 1. TAM Corrigido (GMV vs Receita)

**Problema identificado:**
- Mistura de conceitos: TAM ora como GMV, ora como receita da plataforma
- Números não batiam: "R$ 600-900M" mas cálculo dava R$ 168-336M

**Solução aplicada:**
- **TAM = GMV** (valor total transacionado)
- **Receita da plataforma** = GMV × take rate (18%)

**Antes:**
```
TAM: R$ 600-900 milhões/ano
(misturava GMV com receita)
```

**Depois:**
```
TAM (GMV): R$ 0,9–1,8 bi/ano
Receita potencial (18%): R$ 168-336M/ano
```

---

### 2. Veículo Jurídico Clarificado

**Adicionado:**
```
Veículo jurídico atual: USB Tecnok Manutenção e Instalação 
de Computadores Ltda (CNPJ 07.710.691/0001-66)

Estrutura planejada: Criação de SPE/empresa dedicada ao 
Kaviar após a rodada (definir com contador/advogado)
```

**Por quê:** Evitar estranheza de investidor ao ver razão social de "manutenção de computadores" para startup de mobilidade.

---

### 3. Mobile App (Evidência Defensável)

**Antes:**
```
Mobile app 60% pronto
```

**Depois:**
```
Mobile MVP em desenvolvimento (escopo definido, entrega por marcos)
```

**Por quê:** "60%" sem evidência clara pode gerar desconfiança. MVP é mais defensável.

---

## 📋 Arquivos Alterados

### 1. SUMARIO_EXECUTIVO_INVESTIDORES_V2.md ⭐
**Mudanças:**
- ✅ TAM corrigido (GMV + Receita separados)
- ✅ SAM corrigido (GMV + Receita separados)
- ✅ SOM corrigido (GMV + Receita separados)
- ✅ Veículo jurídico clarificado
- ✅ Mobile: "60%" → "MVP em desenvolvimento"

**Exemplo TAM:**
```
Antes:
TAM: R$ 600-900 milhões/ano
(cálculo com take rate misturado)

Depois:
TAM (GMV): R$ 936M/ano (conservador) | R$ 1,87 bi (otimista)
Receita potencial (18%): R$ 168M/ano | R$ 336M/ano
```

### 2. FAQ_INVESTIDOR.md
**Mudanças:**
- ✅ Q7 (TAM) atualizado com GMV + Receita
- ✅ Mobile: "60%" → "MVP em desenvolvimento"

### 3. PITCH_DECK_12_SLIDES.md
**Mudanças:**
- ✅ Slide 5 (Mercado): TAM como GMV
- ✅ Slide 7 (Tração): Mobile corrigido

### 4. SCRIPT_PITCH_90S.md
**Mudanças:**
- ✅ Pitch: "600-900M" → "GMV 0,9-1,8 bi"
- ✅ Mobile: "60%" → "MVP em desenvolvimento"

### 5. Outros Documentos
- A_RELATORIO_TECNICO_KAVIAR.md: Mobile corrigido
- C_DUE_DILIGENCE_TECNICA.md: Mobile corrigido
- PITCH_DECK_VISUAL_GUIDE.md: Mobile corrigido
- SUMARIO_EXECUTIVO_INVESTIDORES.md (V1): Referência

---

## 📊 Números Corretos (Referência)

### TAM/SAM/SOM (Brasil)

| Métrica | GMV | Receita (18%) |
|---------|-----|---------------|
| **TAM (Brasil)** | R$ 0,9-1,8 bi/ano | R$ 168-336M/ano |
| **SAM (Rio de Janeiro)** | R$ 120-240M/ano | R$ 22-43M/ano |
| **SOM (Ano 1 - 10 com.)** | R$ 7,2M/ano | R$ 1,3M/ano |

### Metodologia TAM (Conservador)
```
13M habitantes
× 5% penetração
= 650k usuários

650k × 8 corridas/mês × R$ 15
= R$ 78M/mês GMV
= R$ 936M/ano GMV

Receita plataforma:
R$ 936M × 18% = R$ 168M/ano
```

---

## ✅ Por Que Essas Mudanças?

### 1. TAM (GMV vs Receita)
**Problema:** Investidor experiente percebe incoerência imediatamente.

**Solução:** Separar claramente:
- GMV = valor total transacionado (mercado)
- Receita = quanto a plataforma captura (take rate)

**Padrão de mercado:**
- Uber reporta GMV + Receita separados
- 99, Rapido, SafeBoda fazem o mesmo

### 2. Veículo Jurídico
**Problema:** "Manutenção de computadores" causa estranheza.

**Solução:** Explicar que é veículo atual + plano de criar SPE.

**Precedente:** Comum em startups (ex: Nubank começou como "Nu Pagamentos")

### 3. Mobile "60%"
**Problema:** Número específico sem evidência gera desconfiança.

**Solução:** "MVP em desenvolvimento" é mais defensável e profissional.

---

## 🔍 Validação

**Checklist:**
- [x] TAM = GMV (não mistura com receita)
- [x] Receita = GMV × take rate (separado)
- [x] Números batem com fórmula
- [x] Veículo jurídico explicado
- [x] Mobile sem promessa específica

**Teste de coerência:**
```
TAM GMV: R$ 936M/ano ✅
× Take rate: 18% ✅
= Receita: R$ 168M/ano ✅
(números batem)
```

---

## 📝 Próximos Passos

**Antes de enviar a investidores:**
1. [ ] Revisar SUMARIO_EXECUTIVO_INVESTIDORES_V2.md
2. [ ] Confirmar números com contador (se possível)
3. [ ] Validar estrutura SPE com advogado
4. [ ] Ter evidência de mobile MVP (screenshots, repo)

**Opcional (melhorias futuras):**
- Adicionar gráfico GMV vs Receita
- Comparar com benchmarks (Uber GMV vs Receita)
- Detalhar roadmap mobile (marcos específicos)

---

## 🎯 Impacto

**Credibilidade:** ⬆️ Alta
- Números coerentes
- Metodologia clara
- Sem promessas vazias

**Conversão:** ⬆️ Média
- Investidor entende melhor o mercado
- Menos perguntas sobre incoerências
- Mais confiança na equipe

---

**Versão:** 2.1  
**Aplicado em:** 8 arquivos  
**Status:** ✅ Completo
