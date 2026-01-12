# ADR-001: Domínio Territorial e Operacional de Corridas (KAVIAR)

**Status:** ✅ ACEITO / FINAL  
**Data:** 2026-01-12  
**Escopo:** Backend KAVIAR (RJ → Brasil)

## 1. Contexto

O KAVIAR opera em territórios urbanos complexos (bairros formais e favelas), exigindo:

- Resolução territorial oficial e auditável
- Operação diferenciada por contexto local
- Ausência de dependência em Google/PostGIS
- Arquitetura imune a exceções, gambiarras e regressões

O Rio de Janeiro possui 162 bairros oficiais (IPP), que são a única base territorial válida.

## 2. Decisão

### 2.1 Bairro (Neighborhood)

- É a **única unidade territorial**
- Possui GeoJSON Polygon
- Resolve localização via Turf.js (point-in-polygon)
- Toda corrida pertence **obrigatoriamente** a um bairro
- ➡️ **Nunca substituível**

### 2.2 Comunidade (Community)

- **Entidade lógica**
- **NÃO** possui geofence
- **NÃO** resolve localização
- **SEMPRE** pertence a um bairro
- Pode ser criada, ignorada ou arquivada sem impacto geográfico
- **Função:** Ajustar **COMO** a corrida opera, nunca **ONDE**

### 2.3 Ride (Corrida)

- Possui **âncoras geográficas imutáveis:**
  - `neighborhoodId` (obrigatório)
  - `communityId` (opcional)
- Âncoras são definidas **apenas na criação**
- Corrida é uma **fotografia imutável** do contexto

## 3. Fluxo Canônico de Corrida

1. Passageiro envia coordenadas (+ communityId opcional)
2. Sistema resolve bairro **único e definitivo**
3. Comunidade é validada (se informada)
4. Ride é criada com âncoras imutáveis
5. Operação decide **COMO**
6. Dispatch ocorre
7. Execução padrão
8. Auditoria sempre referenciada pelas âncoras

➡️ **Nenhuma revalidação territorial após a criação**

## 4. Regras Operacionais (operationalProfile)

| Perfil | Comportamento |
|--------|---------------|
| **NORMAL** | Operação padrão |
| **RESTRICTED** | Pool filtrado |
| **PRIORITY** | Motoristas locais primeiro |
| **PRIVATE** | Operação exclusiva (pode falhar) |

**Regras:**
- Perfil é **lido**, nunca calculado
- Perfil **não altera geografia**
- Perfil **não muta Ride**
- Apenas **PRIVATE** pode resultar em `NO_DRIVER_AVAILABLE`

## 5. Alternativas Rejeitadas

- ❌ Comunidades com geofence
- ❌ Resolver comunidade por lat/lng
- ❌ Reprocessar bairro após criação
- ❌ Perfil dinâmico por horário/usuário
- ❌ Fallbacks automáticos
- ❌ Lógica territorial em múltiplos serviços

## 6. Invariantes (NÃO QUEBRAR)

- Toda Ride tem `neighborhoodId`
- Nenhuma Ride muda de bairro
- Comunidade é sempre opcional
- Geografia ≠ Operação
- Dispatch lê apenas da Ride
- Falha de comunidade não bloqueia criação

## 7. Anti-Padrões Proibidos

- 🚫 Frankenstein arquitetural
- 🚫 Overengineering geoespacial
- 🚫 Exceções "temporárias"
- 🚫 Correções automáticas pós-create
- 🚫 Dependência externa de mapas proprietários

## 8. Consequências

### Positivas
- Arquitetura simples e auditável
- Escalável para outras cidades
- Imune a dados imperfeitos
- Fácil de manter e explicar

### Negativas (aceitas)
- Comunidades não têm mapa próprio
- Algumas operações exigem cadastro manual
- Sem "mágica" automática

## 9. Status Final

**Este ADR congela definitivamente o domínio territorial e operacional do KAVIAR.**

**Qualquer mudança futura exige novo ADR.**

---

**Implementação:** Commits `2f432f6`, `4ba86b5`, `7e1009d`, `34d369a`  
**Auditoria:** `backend/audit/`  
**Testes:** `backend/test-*.sh`
