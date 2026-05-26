# KAVIAR Pet — Estrutura de Documentação de Incidentes

**Versão:** v1.0  
**Data:** Maio/2026  
**Status:** Modelagem conceitual

---

## 1. Tipos de Incidente

| Código | Tipo | Gravidade | Exemplo |
|--------|------|-----------|---------|
| `INC-01` | Sujeira extraordinária | Média | Vômito, urina, fezes no veículo |
| `INC-02` | Dano ao veículo | Alta | Arranhão no estofado, rasgo na capa, mordida no cinto |
| `INC-03` | Agressividade do animal | Alta | Mordida, tentativa de ataque, animal descontrolado |
| `INC-04` | Fuga do animal | Crítica | Animal escapou do veículo durante embarque/desembarque |
| `INC-05` | Abandono pelo tutor | Alta | Tutor não apareceu para receber o pet na entrega |
| `INC-06` | Divergência grave | Média | Porte/quantidade muito diferente do informado |
| `INC-07` | Recusa justificada | Baixa | Motorista recusou por condição insegura (registro) |
| `INC-08` | Cancelamento por condição | Baixa | Corrida cancelada por falta de contenção/caixa |
| `INC-09` | Animal doente/ferido | Alta | Animal visivelmente doente ou ferido durante corrida |
| `INC-10` | Problema com higienização | Baixa | Motorista não higienizou ou higienização insuficiente |
| `INC-11` | Cobrança contestada | Média | Tutor contesta taxa de limpeza/dano |
| `INC-12` | Outro | Variável | Qualquer situação não prevista |

---

## 2. Ficha de Incidente

### Template completo:

```
═══════════════════════════════════════════════════
         REGISTRO DE INCIDENTE — KAVIAR PET
═══════════════════════════════════════════════════

ID: INC-PET-[YYYY]-[NNN]
Data/hora: ___
Operador: ___

── CORRIDA ──
Corrida ID: ___
Motorista: ___
Tutor: ___
Origem → Destino: ___
Pet informado: ___ (tipo, porte, quantidade)
Pet encontrado: ___ (se divergente)

── INCIDENTE ──
Tipo: [INC-01 a INC-12]
Gravidade: [Baixa / Média / Alta / Crítica]
Momento: [Embarque / Durante / Desembarque / Pós-corrida]

Descrição:
_______________________________________________
_______________________________________________

── EVIDÊNCIAS ──
Fotos recebidas: [Sim/Não] — Quantidade: ___
Foto de embarque (antes): [Sim/Não]
Foto do incidente (depois): [Sim/Não]
Áudio/relato do motorista: [Sim/Não]
Relato do tutor: [Sim/Não]

── DECISÃO ──
Ação tomada: ___
Justificativa: ___
Taxa aplicada: [Sim (R$___) / Não]
Penalidade ao motorista: [Sim / Não] — Motivo: ___
Penalidade ao tutor: [Sim / Não] — Motivo: ___
Corrida cancelada: [Sim / Não]
Compensação ao motorista: [Sim (R$___) / Não]

── RESOLUÇÃO ──
Status: [Aberto / Em análise / Resolvido / Escalado]
Resolvido em: ___
Resolvido por: ___
Observações finais: ___

═══════════════════════════════════════════════════
```

---

## 3. Evidências por Tipo de Incidente

| Tipo | Evidências obrigatórias | Evidências desejáveis |
|------|------------------------|----------------------|
| Sujeira extraordinária | Foto do estado do veículo | Foto antes (embarque) para comparação |
| Dano ao veículo | Foto detalhada do dano | Orçamento de reparo |
| Agressividade | Relato do motorista | Foto de ferimento (se houver) |
| Fuga | Relato imediato + localização | Foto do local |
| Abandono | Registro de tentativas de contato | Print de mensagens |
| Divergência grave | Foto do embarque (mostrando divergência) | Registro do que foi informado |
| Recusa justificada | Relato do motorista | Foto da condição (se possível) |
| Animal doente/ferido | Relato + foto | Orientação dada ao tutor |
| Cobrança contestada | Fotos originais + decisão do operador | Comunicação com tutor |

---

## 4. Fluxo de Tratamento

### Incidente de gravidade BAIXA:

```
Motorista reporta → Operador registra → Arquivo → Sem ação imediata
```

### Incidente de gravidade MÉDIA:

```
Motorista reporta → Operador registra → Avalia evidências
    → Se cobrança: fotos + decisão → Cobra tutor
    → Se divergência: registra no histórico do tutor
    → Resolve em até 24h
```

### Incidente de gravidade ALTA:

```
Motorista reporta → Operador responde IMEDIATAMENTE
    → Orienta motorista (segurança primeiro)
    → Registra com todas as evidências
    → Decide: cancelar / compensar / cobrar / suspender
    → Se necessário: escalar para admin
    → Resolve em até 12h
```

### Incidente de gravidade CRÍTICA:

```
Motorista reporta → Operador responde EM SEGUNDOS
    → Prioridade: segurança do motorista e do animal
    → Se fuga: orientar NÃO correr atrás, registrar local
    → Se acidente: orientar chamar socorro se necessário
    → Registrar tudo
    → Escalar para admin imediatamente
    → Acompanhar até resolução completa
```

---

## 5. Reincidência e Padrões

### Monitoramento de padrões:

| Padrão | Ação |
|--------|------|
| Mesmo tutor com 2+ divergências | Alerta: tutor pode estar informando errado propositalmente |
| Mesmo tutor com 2+ incidentes de sujeira | Alerta: considerar taxa preventiva ou bloqueio |
| Mesmo motorista com 2+ reclamações | Conversa + possível suspensão temporária |
| Mesmo motorista sem enviar foto | Advertência → Suspensão se reincidente |
| Mesmo motorista sem checklist | Advertência → Suspensão se reincidente |

### Histórico de incidentes por perfil:

**Tutor:**
```
Maria Santos — Histórico Pet
├── 2026-06-15: Divergência de porte (informou pequeno, era médio) — Ajustado
├── 2026-07-02: Sujeira extraordinária (vômito) — Taxa R$30 cobrada
├── 2026-07-20: OK
└── Status: ⚠️ Atenção (2 ocorrências)
```

**Motorista:**
```
João Silva — Histórico Pet
├── 2026-06-01 a 2026-08-01: 23 corridas
├── Incidentes: 1 (sujeira leve, resolvido)
├── Checklists enviados: 23/23 (100%)
├── Fotos enviadas: 23/23 (100%)
└── Status: ✅ Exemplar
```

---

## 6. Cobrança por Incidente

### Tabela de valores sugeridos:

| Tipo | Valor | Quem paga | Condição |
|------|-------|-----------|----------|
| Sujeira leve (pelos, baba) | R$0 | — | Coberto pelo kit do motorista |
| Sujeira extraordinária (vômito, urina, fezes) | R$20-30 | Tutor | Fotos obrigatórias |
| Dano leve (arranhão superficial) | R$30-50 | Tutor | Fotos + avaliação |
| Dano grave (rasgo, mordida profunda) | R$50-150+ | Tutor | Fotos + orçamento |
| Limpeza profissional necessária | R$50-80 | Tutor | Nota fiscal da limpeza |

### Processo de cobrança:

```
Motorista reporta + envia fotos
        ↓
Operador avalia gravidade e evidências
        ↓
Operador define valor
        ↓
Operador informa tutor (WhatsApp)
        ↓
  [Tutor aceita] → Cobrança via Pix/Asaas
  [Tutor contesta] → Operador reavalia → Admin decide
        ↓
Pagamento confirmado → Motorista compensado (se aplicável)
```

---

## 7. Auditoria e Compliance

### Registros mantidos:

| Registro | Retenção | Onde |
|----------|----------|-----|
| Fichas de incidente | Indefinido | Planilha/sistema |
| Fotos de embarque | 90 dias | Drive/S3 |
| Fotos de incidente | Indefinido | Drive/S3 |
| Decisões do operador | Indefinido | Planilha/sistema |
| Comunicações com tutor | 90 dias | WhatsApp/sistema |
| Histórico de suspensões | Indefinido | Planilha/sistema |

### Quem pode acessar:

| Registro | Operador | Admin | Motorista | Tutor |
|----------|:--------:|:-----:|:---------:|:-----:|
| Ficha de incidente | ✅ | ✅ | Parcial (seu) | ❌ |
| Fotos | ✅ | ✅ | Suas fotos | ❌ |
| Decisões | ✅ | ✅ | Resultado | Resultado |
| Histórico completo | ✅ | ✅ | ❌ | ❌ |

---

## 8. Implementação por Fase

| Fase | Como funciona |
|------|--------------|
| **Fase 1 (MVP)** | Ficha preenchida manualmente pelo operador em planilha. Fotos no Drive. WhatsApp para comunicação. |
| **Fase 2** | Formulário de incidente no admin. Fotos vinculadas à corrida. Status rastreável. |
| **Fase 3** | Motorista reporta in-app. Fotos automáticas. Timeline de incidente. |
| **Fase 4** | Dashboard de incidentes. Alertas de padrão. Relatórios automáticos. Cobrança integrada. |

---

*KAVIAR Pet — Estrutura de Incidentes v1.0 — Maio/2026*
