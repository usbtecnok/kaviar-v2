# DECISÃO TÉCNICA — Preferência por Motorista Mulher

**Versão 1.0 — Junho 2026**
**Status: DOCUMENTAÇÃO — Não implementado**

*KAVIAR — Produto da KAVIAR TECNOLOGIA E SERVICOS DIGITAIS LTDA*
*CNPJ 67.783.601/0001-99*

---

## 1. Nome da funcionalidade

**Preferência por Motorista Mulher**

## 2. Finalidade

Oferecer às passageiras participantes a possibilidade de expressar preferência por atendimento de motoristas mulheres participantes, visando conforto, confiança e segurança percebida.

## 3. Princípios

| Princípio | Detalhamento |
|---|---|
| Adesão voluntária | Tanto passageira quanto motorista participam por decisão própria |
| Autodeclaração | A classificação é realizada pela própria pessoa, sem inferência externa |
| Proibição de classificação visual | Vedado classificar por foto, nome, aparência ou qualquer inferência |
| Não exposição a terceiros | A informação de participação não é visível para outros usuários |
| Sem garantia de disponibilidade | A preferência não garante atendimento feminino |
| Mesma tarifa | Nenhuma alteração de preço por usar a preferência |
| Mesmos créditos | Consumo de créditos inalterado |
| Mesmos filtros operacionais | Território, distância, geofence, disponibilidade e créditos se aplicam igualmente |
| Sem fallback silencioso | Ampliação da busca requer autorização explícita da passageira |
| Feature flag | Funcionalidade desligada por padrão (`WOMEN_DRIVER_PREFERENCE_ENABLED=false`) |

## 4. Referências de mercado

- Uber Brasil: "Preferência das Mulheres" — prioriza, sem garantir
- Uber: U-Elas — motoristas mulheres recebem chamadas de passageiras
- 99: 99Mulher — motoristas mulheres atendem passageiras

## 5. Adesão

### Passageira
- Opta por participar via perfil no app
- Pode ativar/desativar a preferência a qualquer momento
- Preferência é per-profile (padrão) com possibilidade de override per-ride

### Motorista
- Opta por participar via perfil no app
- Pode ativar/desativar a qualquer momento
- Participação não altera recebimento de corridas normais

## 6. Correção e revogação

- Qualquer pessoa pode revogar sua participação instantaneamente
- Revogação tem efeito imediato (próxima corrida já não aplica)
- Em caso de fraude ou inconsistência: revisão administrativa pelo SUPER_ADMIN com motivo e auditoria

## 7. Fluxo técnico resumido

```
Passageira participante solicita corrida com preferência
    ↓
Filtros normais (online, localização, distância, território, créditos)
    ↓
Dentro dos candidatos: priorizar motoristas mulheres participantes
    ↓
Se nenhuma disponível/aceitar:
    ↓
Informar passageira:
    • Continuar aguardando
    • Ampliar para qualquer motorista
    • Cancelar
    ↓
Só ampliar após autorização explícita
    ↓
Timeout: corrida cancelada automaticamente (não fica presa)
```

## 8. Estrutura técnica preliminar (não implementar)

```
passengers:
  women_matching_opt_in BOOLEAN NOT NULL DEFAULT false
  prefer_woman_driver_default BOOLEAN NOT NULL DEFAULT false

drivers:
  women_matching_opt_in BOOLEAN NOT NULL DEFAULT false

rides_v2:
  prefer_woman_driver BOOLEAN NOT NULL DEFAULT false
```

Campos de fallback (consentimento) serão definidos com a implementação real.

## 9. Regras contra abuso

- Backend ignora `prefer_woman_driver` no payload se passageira não é `women_matching_opt_in = true`
- Nenhuma classificação por aparência, foto ou nome
- Opção de denúncia para inconsistências
- Auditoria de alterações de elegibilidade
- Informação de preferência não aparece na oferta recebida pela motorista

## 10. Dependências para implementação

- [ ] Análise jurídica/LGPD concluída
- [ ] Base legal definida
- [ ] Texto de transparência aprovado
- [ ] Modelo de consentimento implementado no app
- [ ] Fluxo de revogação funcional
- [ ] Massa mínima de motoristas mulheres participantes
- [ ] Plano de piloto aprovado
- [ ] Feature flag validada em ambiente controlado

---

*KAVIAR — KAVIAR TECNOLOGIA E SERVICOS DIGITAIS LTDA — CNPJ 67.783.601/0001-99*
