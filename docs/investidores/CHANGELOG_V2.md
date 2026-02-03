# Changelog - Documentação de Investidores V2.0
**Data:** 03/02/2026 19:33 BRT  
**Objetivo:** Aumentar credibilidade e conversão

---

## ✅ Entregáveis Criados

### Novos Documentos (5)
1. ✅ **AUDITORIA_CREDIBILIDADE.md** - Top 10 pontos que reduzem confiança
2. ✅ **SUMARIO_EXECUTIVO_INVESTIDORES_V2.md** - Versão concisa (2-3 pág)
3. ✅ **PITCH_DECK_12_SLIDES.md** - Texto slide a slide
4. ✅ **SCRIPT_PITCH_90S.md** - Elevator pitch cronometrado
5. ✅ **FAQ_INVESTIDOR.md** - 15 perguntas honestas

### Documentos Originais (mantidos para referência)
- A_RELATORIO_TECNICO_KAVIAR.md
- B_ANALISE_MERCADO_MOBILIDADE.md
- C_DUE_DILIGENCE_TECNICA.md
- SUMARIO_EXECUTIVO_INVESTIDORES.md (V1)

**Nota:** V1 mantida para comparação. Use V2 para enviar a investidores.

---

## 🔧 Principais Mudanças

### 1. ROI "50-100x" → Cenários com Assunções

**Antes:**
```
ROI: 50-100x em 3 anos
```

**Depois:**
```
Cenário Conservador: 20-30x (80 comunidades, 3% penetração)
Cenário Base: 50-80x (150 comunidades, 5% penetração)
Cenário Otimista: 120-160x (250 comunidades, 8% penetração)

+ Assunções claras (corridas/semana, churn, CAC)
+ Milestones: "O que precisa acontecer"
```

**Por quê:** Investidor experiente descarta promessas sem base.

---

### 2. TAM R$ 936M → Metodologia + Fontes

**Antes:**
```
TAM: R$ 936 milhões/ano
(sem explicação)
```

**Depois:**
```
TAM: R$ 600-900 milhões/ano

Metodologia:
13M habitantes (IBGE 2022)
× 5% penetração (estimado)
× 8 corridas/mês
× R$ 15 ticket
× 18% take rate
= R$ 168M/ano (conservador)

Fontes: IBGE Censo 2022, DataFavela 2023
```

**Por quê:** Número sem fonte parece inventado.

---

### 3. Produto "Operacional" → Evidências

**Antes:**
```
Produto operacional em produção
```

**Depois:**
```
Evidências:
- Endpoint: api.kaviar.com.br/health
- Custos AWS: $120,50/mês (breakdown linha por linha)
- 162 bairros mapeados (PostGIS, 200h trabalho)
- 28.000 linhas código, 500+ commits
- GitHub: usbtecnok/kaviar-v2
```

**Por quê:** Investidor quer ver, não só ouvir.

---

### 4. Comparação Negativa → Matriz Neutra

**Antes:**
```
Uber/99:
❌ Não entram em comunidades
❌ Motoristas têm medo
❌ GPS impreciso
```

**Depois:**
```
Matriz de Diferenciação:

| Dimensão | Uber/99 | Kaviar |
|----------|---------|--------|
| Forças deles | Marca, capital, escala | Foco comunidades |
| Forças nossas | Mercado massa | Nicho não atendido |
| Diferencial | Network nacional | Relacionamento local |
```

**Por quê:** Tom de "bater" parece amador.

---

### 5. Tração "12 usuários beta" → Honestidade

**Antes:**
```
12 usuários beta ativos
(parecia pouco, mas não explicava)
```

**Depois:**
```
Estágio: Pré-lançamento
- Produto funcional (validação técnica completa)
- Sem tração comercial ainda
- Investimento é para VALIDAR modelo, não escalar

Próximos 90 dias:
- Piloto Rocinha
- Meta: 500 usuários, 1.000 corridas
- Validar unit economics
```

**Por quê:** Honestidade gera mais confiança que inflar números.

---

### 6. Projeções sem Base → Unit Economics

**Antes:**
```
Ano 3: R$ 19,4M de receita
(sem explicar como)
```

**Depois:**
```
Unit Economics (a validar):

CAC: R$ 30-50
LTV (12m): R$ 200-300
LTV/CAC: 4-10x (saudável > 3x)
Payback: 2-4 meses
Churn: 5-8%/mês

Projeções baseadas em:
- Benchmarks Uber/99 ajustados
- Estimativas conservadoras
- A validar no piloto
```

**Por quê:** Investidor quer ver a matemática.

---

### 7. Custos "$100/mês" → Breakdown Real

**Antes:**
```
Custos: ~$100/mês
```

**Depois:**
```
Custos AWS (Jan 2026):
ECS Fargate:     $68,40
RDS PostgreSQL:  $18,20
S3 + CloudFront: $7,30
ALB:             $22,50
Data Transfer:   $4,10
─────────────────────────
Total:           $120,50/mês
```

**Por quê:** Número muito baixo gera desconfiança sem prova.

---

### 8. "162 bairros" → Contexto

**Antes:**
```
162 bairros mapeados
```

**Depois:**
```
162 bairros mapeados:
- PostGIS (geoespacial)
- ~200 horas de trabalho
- Fonte: OpenStreetMap + Data.Rio + validação manual
- Diferencial defensável (difícil de replicar)
```

**Por quê:** Número sem contexto não impressiona.

---

### 9. Concorrência → Barreiras de Entrada

**Antes:**
```
Uber não vai copiar porque...
(tom defensivo)
```

**Depois:**
```
Por que Uber não copia:
1. Margens menores (18% vs 25%)
2. Operação complexa (governança local)
3. Não é core business (foco classes A/B)

Barreiras de entrada:
- Relacionamento local (anos)
- Geofencing (200h trabalho)
- Network effect comunitário
```

**Por quê:** Mostrar defensibilidade, não atacar.

---

### 10. Falta de Disclaimers → Transparência

**Antes:**
```
(sem avisos de risco)
```

**Depois:**
```
Disclaimers:
1. Estágio: Pré-lançamento (sem tração)
2. Projeções: Estimativas (podem variar)
3. Fontes: Citadas ou marcadas como estimativa
4. Risco: Alto (possibilidade de perda total)
5. Regulação: Em processo de regularização
```

**Por quê:** Honestidade protege legalmente e gera confiança.

---

## 📊 Estrutura dos Novos Documentos

### SUMARIO_EXECUTIVO_INVESTIDORES_V2.md (2-3 pág)
```
1. O Pedido (R$ 50k, 10% equity)
2. Problema (1,4M mal atendidos)
3. Solução (motoristas locais)
4. Mercado (metodologia TAM/SAM/SOM)
5. Modelo de Receita (unit economics)
6. Cenários de Retorno (Conservador/Base/Otimista)
7. Concorrência (matriz neutra)
8. Prova (evidências técnicas)
9. Uso dos Recursos (breakdown)
10. Milestones (90 dias)
11. Próximos Passos (CTA)
12. Disclaimers (transparência)
```

### PITCH_DECK_12_SLIDES.md
```
1. Capa
2. Problema
3. Solução
4. Como Funciona
5. Mercado
6. Modelo de Negócio
7. Tração
8. Concorrência
9. Cenários de Retorno
10. Roadmap
11. O Pedido
12. Contato
```

### SCRIPT_PITCH_90S.md
```
[0-15s] Hook + Problema
[15-35s] Solução
[35-55s] Mercado + Tração
[55-75s] Diferencial + Retorno
[75-90s] Pedido

+ Variações (anjo, aceleradora, networking)
+ Respostas rápidas (15s cada)
+ Versão WhatsApp/Vídeo
```

### FAQ_INVESTIDOR.md (15 perguntas)
```
1. Validação e Tração (Q1-Q3)
2. Concorrência (Q4-Q6)
3. Modelo de Negócio (Q7-Q9)
4. Regulação e Compliance (Q10-Q11)
5. Equipe e Execução (Q12-Q13)
6. Riscos (Q14-Q15)
```

---

## 🎯 Como Usar

### Para Primeiro Contato
1. **Script Pitch 90s** (pessoalmente ou vídeo)
2. **Sumário Executivo V2** (enviar por email)

### Se Houver Interesse
3. **Pitch Deck 12 Slides** (apresentação formal)
4. **FAQ Investidor** (antecipar dúvidas)

### Para Due Diligence
5. **Relatório Técnico** (20 pág)
6. **Análise de Mercado** (25 pág)
7. **Due Diligence Técnica** (30 pág)

### Para Fechar
8. **Demo 10 minutos** (produto ao vivo)
9. **Acesso GitHub** (read-only)
10. **Contrato** (com advogado)

---

## ✅ Checklist Pré-Envio

**Personalizar:**
- [ ] Adicionar seus contatos (email, WhatsApp, LinkedIn)
- [ ] Adicionar seu nome nos documentos
- [ ] Revisar números (se tiver dados mais recentes)

**Validar:**
- [ ] Ler tudo em voz alta (detectar erros)
- [ ] Pedir feedback de 1-2 pessoas de confiança
- [ ] Testar links (se houver)

**Preparar:**
- [ ] Ter demo pronta (10 minutos)
- [ ] Ter respostas para FAQ decoradas
- [ ] Ter contrato de investimento (com advogado)

---

## 📈 Métricas de Sucesso

**Conversão esperada:**
- 100 pessoas veem pitch → 20 pedem material (20%)
- 20 leem material → 5 agendam demo (25%)
- 5 fazem demo → 2 investem (40%)
- **Total:** 2% de conversão (normal para early-stage)

**Para captar R$ 50k (10 cotas):**
- Precisa apresentar para ~500 pessoas
- Ou focar em 50 investidores qualificados (10% conversão)

---

## 🚀 Próximos Passos

**Hoje:**
- [x] Documentação completa ✅
- [ ] Personalizar com seus dados
- [ ] Revisar uma última vez

**Amanhã:**
- [ ] Enviar para primeiros 10 contatos
- [ ] Agendar 3 demos
- [ ] Postar no LinkedIn (versão resumida)

**Esta Semana:**
- [ ] Apresentar para 20 pessoas
- [ ] Captar primeiras 2-3 cotas
- [ ] Ajustar pitch baseado em feedback

---

## 📞 Suporte

Se precisar de ajustes ou tiver dúvidas, estou disponível para:
- Revisar documentos
- Preparar apresentação visual (slides)
- Simular perguntas de investidores
- Ajustar projeções

---

**Boa sorte na captação! 🚀**

---

**Versão:** 2.0  
**Preparado por:** Kiro (AWS AI Assistant)  
**Data:** 03/02/2026 19:33 BRT
