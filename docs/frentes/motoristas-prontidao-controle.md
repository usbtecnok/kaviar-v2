# CONTROLE DE FRENTE: MOTORISTAS DE PRONTIDÃO POR COMUNIDADE

## 1. NOME DA FRENTE
**Motoristas de Prontidão por Comunidade**

## 2. OBJETIVO
Garantir cobertura mínima de motoristas em horários críticos por comunidade, começando de forma controlada e evoluindo por fases.

**Problema**: Há ocorrência relevante de chamadas sem motorista em horários críticos, a ser quantificada com dados do admin antes da execução  
**Solução**: Rede estruturada de motoristas comprometidos com horários específicos  
**Meta inicial**: Reduzir de forma mensurável as falhas de atendimento em horários críticos, com percentual definido após diagnóstico dos dados reais  

## 3. STATUS ATUAL
🟡 **FASE 1 - PLANO TÉCNICO EM REVISÃO**  
- ✅ Plano estratégico aprovado
- ✅ Documento para investidores criado
- ✅ Plano técnico Fase 1 elaborado
- ❌ **IMPLEMENTAÇÃO BLOQUEADA** até autorização explícita
- ❌ Nenhum código alterado ainda
- ❌ Nenhuma migration aplicada ainda

## 4. REGRA PRINCIPAL
⚠️ **NÃO IMPLEMENTAR TUDO DE UMA VEZ. SEGUIR POR FASES.**

## 4.1. REGRAS DE SEGURANÇA KAVIAR - IMPLEMENTAÇÃO FASE 1

### ⚠️ COMANDOS PROIBIDOS PARA ESTA FRENTE:
```bash
# NUNCA EXECUTAR:
eas build                    # Não gerar APK
npx prisma migrate reset     # Não resetar banco
npx prisma db push          # Não forçar schema
git push --force            # Não forçar push
```

### ⚠️ ARQUIVOS PROTEGIDOS - NÃO TOCAR:
```
app/(passenger)/*           # Passageiro v1.11.4 PROTEGIDO
app/(driver)/*              # App motorista PROTEGIDO  
app/(passenger)/map.tsx     # Já alterado em frente anterior
app/(passenger)/profile.tsx # Já alterado em frente anterior
backend/src/services/dispatcher.*  # Dispatch PROTEGIDO
backend/src/routes/rides-v2.ts     # Rides PROTEGIDO
```

### ⚠️ AUTORIZAÇÕES OBRIGATÓRIAS:
- **"autorizo implementar"** → Pode alterar código
- **"autorizo migration"** → Pode aplicar migration  
- **"autorizo deploy"** → Pode fazer deploy
- **"autorizo build"** → Pode gerar APK (não aplicável nesta frente)

### ✅ ESCOPO PERMITIDO FASE 1:
```
backend/prisma/schema.prisma        # Novas tabelas isoladas
backend/src/routes/admin-*          # Novos módulos admin
backend/src/services/local-*        # Novos services isolados
frontend-app/src/pages/admin/*      # Novas telas admin
frontend-app/src/components/admin/* # Novos componentes admin
```

## 5. FASES APROVADAS

### **FASE 0 - PILOTO MANUAL/OPERACIONAL** (4 semanas, R$ 0)
- Selecionar 2 comunidades (Rocinha + Vidigal)
- Recrutar 6 motoristas (3 por comunidade)
- Ativação via WhatsApp pessoal
- Tracking em planilha
- **Sem código, sem bônus, sem sistema**

### **FASE 1 - ADMIN BÁSICO E CADASTRO** (8 semanas, R$ 15.000)
- Campo `is_standby` na tabela drivers
- Tela admin para marcar motoristas de prontidão
- Tela app para horários preferidos
- Log básico de acionamentos
- **Sem bônus automático, sem dispatch**

### **FASE 2 - INCENTIVOS FINANCIADOS** (Requer investimento R$ 200.000)
- Bônus de prontidão (R$ 4/hora)
- Bônus por atendimento rápido
- Sistema antifraude (GPS obrigatório)
- **Só ativar com recurso confirmado**

### **FASE 3 - AUTOMAÇÃO COMPLETA** (Requer escala R$ 540.000/ano)
- Alertas automáticos
- Priorização no dispatch
- Dashboard executivo
- **Só após validação das fases anteriores**

## 6. FORA DO ESCOPO INICIAL

### ❌ NÃO MEXER:
- Dispatch principal (`DispatcherService`)
- App Passageiro v1.11.4 (já publicado)
- Fluxo principal de corridas
- Sistema de pagamentos automático
- Ranking/gamificação
- Qualquer arquivo de produção sensível

### ❌ NÃO FAZER:
- Alterações no app motorista sem aprovação
- Bônus automático sem recurso
- Deploy sem validação
- APK sem autorização
- Mexer em áreas não relacionadas

## 7. ARQUIVOS PROTEGIDOS

```
app/(passenger)/*                    → Passageiro v1.11.4 já publicado
backend/src/services/dispatcher.*    → Fluxo principal de corridas
backend/src/routes/rides-v2.ts       → Endpoint crítico de corridas
app/(driver)/online.tsx              → Tela principal do motorista
backend/src/services/pricing.*       → Sistema de preços
backend/src/services/payment.*       → Pagamentos
```

## 8. DECISÕES APROVADAS

✅ **Estratégicas:**
- Frente aprovada como visão estratégica
- Execução deve ser faseada
- Plano pode servir para investidores
- Começar pequeno para evitar risco operacional

✅ **Operacionais:**
- Incentivo financeiro só se houver recurso
- Bônus deve depender de atividade real, não apenas cadastro
- Validação GPS obrigatória para pagamento
- Piloto manual antes de qualquer código

✅ **Técnicas:**
- Aproveitar infraestrutura existente (WhatsApp, comunidades, feature flags)
- Não alterar dispatch na Fase 1
- Sistema de logs para auditoria
- Feature flags para controle de rollout

## 9. CRITÉRIOS DE RETOMADA

### Sempre que retomar esta frente:

1. **Ler este documento completamente**
2. **Informar:**
   - Fase atual
   - Último passo concluído
   - Próximo passo recomendado
   - Riscos antes de alterar código

3. **Confirmar contexto:**
   - Status do Passageiro v1.11.4 (deve estar estável)
   - Nenhuma alteração crítica pendente
   - Recursos disponíveis para a fase

## 10. CHECKLIST OBRIGATÓRIO ANTES DE CÓDIGO

### ⚠️ ANTES DE QUALQUER ALTERAÇÃO:

- [ ] Confirmar fase atual
- [ ] Confirmar escopo da fase
- [ ] Listar arquivos que serão alterados
- [ ] Verificar se não toca em áreas protegidas
- [ ] Pedir aprovação antes de aplicar mudanças
- [ ] Confirmar que não afeta Passageiro v1.11.4
- [ ] Verificar se há recursos para incentivos (Fase 2+)

## 11. CHECKLIST OBRIGATÓRIO ANTES DE COMMIT

### ⚠️ ANTES DE QUALQUER COMMIT:

- [ ] Mostrar `git diff --stat`
- [ ] Explicar cada arquivo alterado
- [ ] Confirmar que não tocou em áreas protegidas
- [ ] Verificar se commit está no escopo da fase
- [ ] Testar funcionalidade básica
- [ ] Confirmar que não quebrou funcionalidades existentes

## 12. CHECKLIST OBRIGATÓRIO ANTES DE BUILD/DEPLOY

### ⚠️ ANTES DE QUALQUER PUBLICAÇÃO:

- [ ] Só buildar com autorização explícita
- [ ] Só publicar com validação completa
- [ ] Nunca publicar direto sem teste
- [ ] Confirmar que Passageiro v1.11.4 não foi afetado
- [ ] Verificar se feature flags estão configuradas
- [ ] Backup do estado atual antes de deploy

## 13. ESTRUTURA DE DADOS PLANEJADA

### Fase 1 - Mínima:
```sql
-- Campo simples no drivers
ALTER TABLE drivers ADD COLUMN is_standby BOOLEAN DEFAULT false;

-- Horários preferidos
CREATE TABLE driver_preferred_hours (
  driver_id, day_of_week, start_hour, end_hour
);

-- Log de acionamentos
CREATE TABLE standby_activations (
  driver_id, community_id, activation_type, responded_at
);
```

### Fase 2+ - Expandida:
- Tabela de incentivos
- Log de pagamentos
- Métricas de performance

## 14. MÉTRICAS DE SUCESSO POR FASE

### Fase 0 (Piloto):
- Taxa de resposta aos alertas: a ser medida (meta inicial >50%)
- Redução de "no_driver": a ser medida (meta inicial >20%)
- Satisfação dos motoristas: a ser medida (meta inicial >6/10)

### Fase 1 (Sistema):
- 15 motoristas cadastrados
- 5 comunidades cobertas
- Sistema funcionando sem bugs

### Fase 2 (Incentivos):
- ROI: a ser calculado com dados reais (meta inicial >150% anual)
- 45 motoristas ativos (estimativa)
- Fraude <5% (controle rigoroso)

### Fase 3 (Automação):
- 120 motoristas, 30 comunidades
- Cobertura >85% horários críticos
- Sistema 100% automatizado

## 15. CONTATOS E RESPONSABILIDADES

### Aprovações necessárias:
- **Mudanças de código**: Aprovação do usuário
- **Deploy**: Validação completa
- **Incentivos financeiros**: Confirmação de recurso
- **Alterações no dispatch**: Análise de impacto

### Escalação de problemas:
- **Bug crítico**: Rollback imediato
- **Fraude detectada**: Suspensão automática
- **Custo excessivo**: Revisão de fase

---

## ⚠️ LEMBRETE CRÍTICO

**Esta frente tem potencial de impacto alto no sistema. Sempre seguir as fases, sempre pedir aprovação, sempre testar antes de commit. O sucesso depende de execução controlada e gradual.**

**Última atualização**: 2026-05-03  
**Próxima revisão**: Após conclusão da Fase 0  
**Status**: Aguardando início do Piloto Manual