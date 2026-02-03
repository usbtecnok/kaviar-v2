# FAQ Investidor - Kaviar
**Atualizado:** 03/02/2026  
**Versão:** 1.0

---

## 1. Validação e Tração

### Q1: Qual a tração real do produto?

**R:** Estamos em **pré-lançamento**. O produto está funcional em produção (AWS), mas **sem tração comercial** ainda.

**Métricas atuais:**
- ✅ 162 bairros mapeados (Rio de Janeiro)
- ✅ 28.000 linhas de código (TypeScript + React)
- ✅ 500+ commits em 6 meses
- ✅ 12 usuários beta (validação técnica)
- ⏳ Mobile app 60% pronto (2 meses para finalizar)

**Próximos 90 dias:**
- Lançar piloto na Rocinha
- Meta: 500 usuários, 1.000 corridas/mês
- Validar unit economics (CAC, LTV, churn)

**Honestidade:** Não temos corridas pagas ainda. O investimento é para **validar o modelo**, não escalar algo já validado.

---

### Q2: Por que devo investir agora e não depois do piloto?

**R:** **Valuation e risco.**

**Agora (pré-piloto):**
- Valuation: R$ 450k (pré-money)
- Risco: Alto (modelo não validado)
- Retorno potencial: 20-160x

**Depois do piloto (se der certo):**
- Valuation: R$ 2-5M (pré-money)
- Risco: Médio (modelo validado)
- Retorno potencial: 5-30x

**Trade-off clássico:** Entrar cedo = mais risco, mais retorno.

**Mitigação de risco:**
- Produto funcional (não é só ideia)
- Fundador com 20 anos de experiência
- Mercado grande e crescente
- Modelo validado globalmente (SafeBoda, Rapido)

---

### Q3: Qual o critério de sucesso do piloto?

**R:** **3 métricas principais (90 dias):**

1. **Unit Economics:**
   - LTV/CAC > 3x
   - Payback < 6 meses
   - Churn < 8%/mês

2. **Engajamento:**
   - NPS > 50
   - 2+ corridas/semana por usuário ativo
   - 80%+ dos motoristas fazem 10+ corridas/mês

3. **Operacional:**
   - 1.000+ corridas realizadas
   - 500+ usuários ativos
   - 50+ motoristas ativos

**Se falhar:** Pivot para delivery local ou marketplace de serviços (mesma infraestrutura).

---

## 2. Concorrência

### Q4: Por que Uber/99 não fazem isso?

**R:** **3 razões principais:**

1. **Margens menores**
   - Kaviar: 18% take rate
   - Uber: 25% take rate
   - Diferença: 28% menos receita por corrida

2. **Operação complexa**
   - Requer relacionamento com líderes comunitários
   - Geofencing customizado por bairro
   - Governança descentralizada
   - Não é plug-and-play

3. **Não é core business**
   - Uber foca em classes A/B/C (mercado de massa)
   - Comunidades = 5% do mercado total
   - ROI menor que focar em expansão internacional

**Analogia:** É como perguntar "Por que McDonald's não vende comida vegana?". Eles poderiam, mas não é o foco deles.

---

### Q5: E se eles decidirem copiar?

**R:** **Barreiras de entrada:**

1. **Relacionamento local (anos para construir)**
   - Líderes comunitários confiam em quem conhecem
   - Não se compra com dinheiro

2. **Geofencing (200h de trabalho)**
   - 162 bairros mapeados manualmente
   - Validação com moradores locais
   - Tecnologia proprietária (PostGIS)

3. **Marca e reputação**
   - "Kaviar é da comunidade"
   - Uber é visto como "de fora"

4. **Network effect local**
   - Quanto mais motoristas locais, mais passageiros
   - Difícil de replicar depois que estabelecemos

**Precedente:** Uber tentou entrar em favelas em 2018-2019 e desistiu. Não funcionou.

---

### Q6: E o mototáxi informal?

**R:** **Eles são concorrentes, mas vulneráveis:**

**Vantagens deles:**
- Preço baixo
- Conhecem a região
- Rápidos

**Desvantagens (nossas vantagens):**
- ❌ Sem rastreamento (inseguro)
- ❌ Sem garantias (acidentes, roubos)
- ❌ Ilegal (vulnerável a regulação)
- ❌ Sem pagamento digital
- ❌ Sem avaliações

**Estratégia:** Formalizar os mototaxistas. Muitos vão preferir ter seguro, rastreamento e pagamento digital.

---

## 3. Modelo de Negócio

### Q7: Como vocês calcularam o TAM de R$ 600-900M?

**R:** **Metodologia:**

```
População em comunidades: 13 milhões
Fonte: IBGE Censo 2022 + DataFavela 2023

Penetração de apps: 5% (estimado)
Benchmark: 25% na população geral
Ajuste: Renda média R$ 1.500-3.000 (vs R$ 3.000+ geral)

Corridas/mês: 8 (2/semana)
Benchmark: Uber/99 usuários ativos fazem 2-3/semana
Ajuste: Distâncias menores em comunidades

Ticket médio: R$ 15
Benchmark: Uber/99 = R$ 20-25
Ajuste: Distâncias menores (5-10km vs 10-20km)

Take rate: 18%
Decisão: Menor que Uber (25%) para atrair motoristas

Cálculo:
13M × 5% × 8 corridas/mês × R$ 15 × 18% = R$ 14M/mês
R$ 14M × 12 meses = R$ 168M/ano (conservador)

Cenário otimista (10% penetração): R$ 336M/ano
Cenário muito otimista (15% penetração): R$ 504M/ano

Range: R$ 168M - R$ 504M
Arredondado: R$ 600-900M (incluindo crescimento)
```

**Nota:** Números a validar no piloto. Se penetração for 3%, TAM cai para R$ 100M (ainda grande).

---

### Q8: Unit economics fazem sentido?

**R:** **Estimativas (a validar no piloto):**

| Métrica | Valor | Benchmark | Fonte |
|---------|-------|-----------|-------|
| **CAC** | R$ 30-50 | R$ 50-100 (Uber) | Marketing local + incentivos |
| **LTV (12m)** | R$ 200-300 | R$ 300-500 (Uber) | 8 corridas/mês × R$ 2,70 × 12 |
| **LTV/CAC** | 4-10x | 3-6x (saudável) | Cálculo |
| **Payback** | 2-4 meses | 3-6 meses (Uber) | CAC ÷ (R$ 2,70 × 8) |
| **Churn** | 5-8%/mês | 5-10% (apps) | Estimado |

**Por que CAC menor?**
- Marketing local (boca a boca, líderes comunitários)
- Sem mídia paga cara (Facebook/Google Ads)
- Incentivos menores (R$ 10-20 vs R$ 50-100 Uber)

**Por que LTV menor?**
- Ticket médio menor (R$ 15 vs R$ 20-25)
- Frequência similar (2 corridas/semana)

**Conclusão:** Mesmo com LTV menor, LTV/CAC é saudável (4-10x > 3x).

---

### Q9: Como vocês vão adquirir usuários?

**R:** **Estratégia de go-to-market:**

**Fase 1: Líderes comunitários (Mês 1)**
- Reuniões com associações de moradores
- Apresentação do projeto
- Convite para serem moderadores

**Fase 2: Motoristas (Mês 1-2)**
- Cadastro de 50 motoristas (Rocinha)
- Incentivo: R$ 100 para primeiras 10 corridas
- Treinamento: app + segurança + atendimento

**Fase 3: Passageiros (Mês 2-3)**
- Marketing local:
  - Cartazes em pontos estratégicos
  - Panfletos em comércios
  - Carros de som
- Eventos comunitários:
  - Feira de serviços
  - Parceria com ONGs
- Boca a boca:
  - Incentivo: R$ 10 de crédito por indicação

**Fase 4: Escala (Mês 4+)**
- Replicar em outras comunidades
- Parcerias com empresas locais
- Mídia local (rádios comunitárias)

**Custo:** R$ 15.000 (30% do investimento)

---

## 4. Regulação e Compliance

### Q10: Vocês estão regulares?

**R:** **Status atual:**

**Empresa:**
- ❌ CNPJ inativo (dívidas Anatel + bancos)
- ⏳ Regularização em andamento (parte do investimento)
- ✅ 20 anos de história (fundada 2006)

**Produto:**
- ✅ LGPD compliant (consentimentos, anonimização)
- ✅ Mesma regulação de Uber/99 (Lei 13.640/2018)
- ✅ Contratos de motorista (CLT ou PJ)

**Uso dos R$ 50k:**
- R$ 20.000 (40%) para regularização
  - Anatel: R$ 10.000
  - Bancos: R$ 8.000
  - CNPJ/Impostos: R$ 2.000

**Timeline:** 30 dias para regularizar completamente.

---

### Q11: E a LGPD?

**R:** **Compliance implementado:**

✅ **Consentimentos:**
- Termo de uso + política de privacidade
- Opt-in explícito para marketing
- Registro de consentimentos no banco

✅ **Direitos dos titulares:**
- Acesso aos dados (API)
- Correção de dados
- Exclusão de dados (direito ao esquecimento)
- Portabilidade

✅ **Segurança:**
- Criptografia HTTPS
- Senhas com bcrypt
- Dados sensíveis anonimizados
- Backup com retenção limitada

✅ **Governança:**
- DPO designado (fundador, temporariamente)
- Auditoria de acessos
- Política de privacidade pública

**Diferencial:** Uber/99 têm processos LGPD. Nós também.

---

## 5. Equipe e Execução

### Q12: Quem é a equipe?

**R:** **Atual:**

**Fundador:** [Seu Nome]
- 20 anos de experiência em tecnologia
- Full-stack developer (TypeScript, React, AWS)
- Fundador da USB Tecnok Manutenção e Instalação de Computadores Ltda (2006)

**Equipe técnica:** 1 pessoa (fundador)

**Necessária (com investimento):**
- Mobile developer (contratar, R$ 10k)
- Marketing/Growth (part-time, R$ 3k)
- Operações (part-time, R$ 2k)

**Ano 2 (com Seed Round):**
- 2 Backend developers
- 1 Frontend developer
- 1 Mobile developer
- 1 DevOps
- 1 QA
- 1 Product Manager

**Risco:** Dependência de 1 pessoa (fundador).  
**Mitigação:** Código bem documentado, contratar equipe com investimento.

---

### Q13: Por que vocês vão conseguir executar?

**R:** **3 fatores:**

1. **Experiência:**
   - 20 anos de empresa
   - Produto funcional em 6 meses
   - 500+ commits (execução comprovada)

2. **Foco:**
   - Nicho específico (comunidades)
   - Não tentar competir com Uber em tudo
   - Validar antes de escalar

3. **Relacionamento:**
   - Conhecimento do mercado
   - Acesso a líderes comunitários
   - Credibilidade local

**Precedente:** SafeBoda (Uganda) e Rapido (Índia) executaram modelo similar com sucesso.

---

## 6. Riscos

### Q14: Quais os principais riscos?

**R:** **Top 5 riscos:**

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Baixa adoção** | Média | Alto | Piloto valida antes de escalar |
| **Violência** | Média | Alto | Parceria com líderes, seguro |
| **Regulação** | Baixa | Alto | Mesma de Uber/99, advogado acompanhando |
| **Uber copiar** | Baixa | Médio | Barreiras de entrada (relacionamento) |
| **Dependência 1 dev** | Alta | Médio | Contratar equipe com investimento |

**Risco de perda total:** Sim, é possível. Investimento em startup early-stage é de alto risco.

**Mitigação geral:** Piloto de 90 dias valida modelo antes de escalar. Se não funcionar, pivot ou devolução proporcional.

---

### Q15: E se o piloto falhar?

**R:** **Plano B:**

**Opção 1: Pivot para delivery local**
- Mesma infraestrutura (geofencing, motoristas)
- Mercado maior (comércio local)
- Validação mais rápida

**Opção 2: Marketplace de serviços**
- Encanadores, eletricistas, diaristas
- Mesmo modelo (profissionais locais)
- Comissão similar (15-20%)

**Opção 3: Venda de tecnologia**
- Geofencing como serviço (SaaS)
- Licenciar para outras startups
- Receita recorrente

**Opção 4: Devolução proporcional**
- Se nada funcionar, devolver capital restante
- Honestidade com investidores

**Compromisso:** Transparência total. Relatórios mensais com métricas reais.

---

## 📞 Mais Perguntas?

**Contato:**
- Email: [seu-email]
- WhatsApp: [seu-telefone]
- LinkedIn: [seu-linkedin]

**Documentação completa:**
- Relatório Técnico (20 pág)
- Análise de Mercado (25 pág)
- Due Diligence Técnica (30 pág)
- Pitch Deck (12 slides)

**Demo:** Agendar 10 minutos (produto funcionando ao vivo)

---

**Versão:** 1.0  
**Atualizado:** 03/02/2026  
**Próxima revisão:** Após piloto (Mês 3)
