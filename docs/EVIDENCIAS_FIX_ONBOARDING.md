# EVIDÊNCIAS: FIX CADASTRO PASSAGEIRO (BAIRRO VAZIO)

**Data**: 2026-02-10  
**Prioridade**: ALTA (cadastro travado)  
**Commit**: b966585

---

## PROBLEMA REPORTADO

**Sintoma**: Campo "Bairro" obrigatório no cadastro de passageiro (https://kaviar.com.br/cadastro) aparece vazio, impedindo finalização do cadastro.

**Evidência**: Print mostra dropdown sem opções.

---

## DIAGNÓSTICO

### Código Problemático
```javascript
// frontend-app/src/pages/onboarding/CompleteOnboarding.jsx (linha 75)
const loadNeighborhoods = async () => {
  try {
    const response = { data: { success: true, data: [] } }; // ❌ hardcoded empty array
    if (response.data.success) {
      setNeighborhoods(response.data.data);
    }
```

**Causa raiz**: Código hardcoded retornando array vazio ao invés de fazer chamada real ao endpoint `/api/neighborhoods`.

**Comentário no código**: `// gps-first: legacy public neighborhoods removed` → sugere remoção intencional mas incorreta.

---

## SOLUÇÃO APLICADA

### Correção
```javascript
const loadNeighborhoods = async () => {
  try {
    const response = await api.get('/api/neighborhoods'); // ✅ chamada real
    if (response.data.success) {
      setNeighborhoods(response.data.data);
    }
```

**Endpoint usado**: `/api/neighborhoods` (público, criado em commit 6b8f931)

---

## VALIDAÇÃO

### 1. Endpoint Público Funcionando
```bash
$ curl -sS https://api.kaviar.com.br/api/neighborhoods | jq -r '.success, (.data | length)'
true
268
```

### 2. Deploy Frontend
```
Workflow: deploy-frontend.yml
Status: completed success
Run ID: 21874904893
Commit: b966585
```

### 3. Teste Funcional Esperado
- Acessar https://kaviar.com.br/cadastro
- Preencher "Dados Pessoais"
- Campo "Bairro" deve mostrar 268 opções
- Seleção deve permitir avançar para próximo passo

---

## COMMITS RELACIONADOS

- **6b8f931**: Criou endpoint público `/api/neighborhoods`
- **b966585**: Restaurou chamada API em CompleteOnboarding.jsx

---

## OBSERVAÇÕES

- Problema afetava **apenas cadastro de passageiro** (CompleteOnboarding.jsx)
- Admin panel (NeighborhoodsManagement.jsx) já estava corrigido em commit 6b8f931
- Endpoint backend funcionando desde deploy bf77014
- Frontend agora sincronizado com backend

---

## RUNBOOK: VALIDAR CADASTRO PASSAGEIRO

```bash
# 1. Testar endpoint público
curl -sS https://api.kaviar.com.br/api/neighborhoods | jq '.success, (.data | length)'

# 2. Verificar frontend (browser console)
# Acessar https://kaviar.com.br/cadastro
# Abrir DevTools → Network → filtrar "neighborhoods"
# Deve mostrar: GET /api/neighborhoods → 200 OK → 268 items

# 3. Teste funcional
# - Preencher nome, email, telefone, senha
# - Campo "Bairro" deve listar opções
# - Selecionar bairro → botão "Próximo" deve habilitar
```

---

**Status**: ✅ RESOLVIDO  
**Deploy**: PROD (frontend + backend)  
**Impacto**: Cadastro de passageiro desbloqueado
