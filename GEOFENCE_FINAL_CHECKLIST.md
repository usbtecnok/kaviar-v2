# Checklist de Testes - Cerca Virtual com Separação Comunidade vs Bairro

## ✅ SISTEMA IMPLEMENTADO

### Funcionalidades Entregues
- [x] **Resolve Hierárquico:** COMUNIDADE > BAIRRO/NEIGHBORHOOD > outros
- [x] **Import Automático:** Script para comunidades do SABREN MapServer
- [x] **Fallback Modal:** Pergunta ao usuário se aceita motorista de fora da área
- [x] **Compatibilidade:** Mantém funcionamento de bairros existentes

## 🧪 TESTES OBRIGATÓRIOS

### 1. Testes de Resolução Hierárquica

#### Coordenadas DENTRO de Comunidades (deve retornar comunidade-*)
```bash
# Babilônia (Leme) - após import
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9665&lon=-43.1611"
# Esperado: {"match": true, "area": {"id": "comunidade-babilonia", ...}}

# Cantagalo (Ipanema) - após import  
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9885&lon=-43.1965"
# Esperado: {"match": true, "area": {"id": "comunidade-morro-do-cantagalo", ...}}

# Chapéu Mangueira (Leme) - após import
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9658&lon=-43.1598"
# Esperado: {"match": true, "area": {"id": "comunidade-chapeu-mangueira", ...}}
```

#### Coordenadas DENTRO de Bairros (fora de comunidades - deve retornar bairro-*)
```bash
# Copacabana (área nobre)
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9711&lon=-43.1822"
# Esperado: {"match": true, "area": {"id": "bairro-copacabana", ...}}

# Ipanema (área nobre)
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9846&lon=-43.1980"
# Esperado: {"match": true, "area": {"id": "neighborhood-ipanema", ...}}

# Leme (área nobre)
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9620&lon=-43.1650"
# Esperado: {"match": true, "area": {"id": "bairro-leme", ...}}
```

#### Coordenada FORA de Todas as Áreas
```bash
# Fora do Rio de Janeiro
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.0000&lon=-43.0000"
# Esperado: {"match": false}
```

### 2. Teste de Import de Comunidades

#### Executar Import
```bash
# 1. Obter token admin
export ADMIN_TOKEN=$(curl -X POST https://kaviar-v2.onrender.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"sua_senha"}' \
  | jq -r '.data.token')

# 2. Executar import
export BASE_URL="https://kaviar-v2.onrender.com"
cd /home/goes/kaviar/backend
node scripts/geo/fetch-and-import-rio-comunidades.js
```

#### Validar Resultado
- [ ] Script executa sem erro
- [ ] Relatório mostra comunidades encontradas
- [ ] Comunidades são inseridas com prefixo `comunidade-*`
- [ ] Resolve retorna comunidades com prioridade sobre bairros

### 3. Teste de Fallback no Frontend

#### Cenário: Sem Motoristas na Área
1. [ ] Acessar `/passenger/request-ride`
2. [ ] Selecionar bairro e localizações
3. [ ] Clicar "Solicitar Corrida"
4. [ ] Se não houver motoristas na área:
   - [ ] Modal aparece: "Sem motoristas na sua área"
   - [ ] Mostra contadores de motoristas
   - [ ] Opções "Cancelar" e "Aceitar"
5. [ ] Testar "Cancelar": modal fecha, volta ao formulário
6. [ ] Testar "Aceitar": envia com confirmationToken

### 4. Teste de Integração Backend

#### Solicitação de Corrida com Geofence
```bash
# Dentro de comunidade (deve permitir)
curl -X POST https://kaviar-v2.onrender.com/api/governance/ride/request \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "test-passenger",
    "passengerLat": -22.9665,
    "passengerLng": -43.1611,
    "pickup": {"lat": -22.9665, "lng": -43.1611, "address": "Babilônia"},
    "dropoff": {"lat": -22.9670, "lng": -43.1615, "address": "Próximo"}
  }'

# Fora de área (deve retornar 403)
curl -X POST https://kaviar-v2.onrender.com/api/governance/ride/request \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "test-passenger",
    "passengerLat": -22.0000,
    "passengerLng": -43.0000,
    "pickup": {"lat": -22.0000, "lng": -43.0000, "address": "Fora"},
    "dropoff": {"lat": -22.0001, "lng": -43.0001, "address": "Também fora"}
  }'
```

## 📋 CHECKLIST DE VALIDAÇÃO

### Backend
- [ ] Resolve prioriza comunidade > bairro > outros
- [ ] Import de comunidades funciona via SABREN MapServer
- [ ] Fallback system retorna HTTP 202 com confirmationToken
- [ ] Geofence bloqueia corridas fora da área (HTTP 403)

### Frontend  
- [ ] Modal de fallback aparece quando necessário
- [ ] Usuário pode aceitar ou cancelar motorista de fora
- [ ] Confirmação reenvia com token correto
- [ ] Erros são tratados adequadamente

### Integração
- [ ] Comunidades têm prioridade sobre bairros na resolução
- [ ] Motoristas de comunidades não se misturam com área nobre
- [ ] Sistema de fallback funciona quando não há motoristas locais
- [ ] Compatibilidade mantida com bairros existentes

## 🎯 CRITÉRIO DE SUCESSO

**Sistema aprovado quando:**
1. Todas as coordenadas de teste retornam o tipo correto (comunidade vs bairro)
2. Import de comunidades executa sem erro
3. Modal de fallback funciona no frontend
4. Separação entre comunidade e área nobre está funcionando

**Arquivos Modificados:**
- `backend/src/routes/geo.ts` (resolve hierárquico)
- `backend/scripts/geo/fetch-and-import-rio-comunidades.js` (import)
- `frontend-app/src/pages/passenger/RequestRide.jsx` (modal fallback)
- Documentação e testes
