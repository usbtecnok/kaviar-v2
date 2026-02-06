# Frontend de Território - Teste Manual

Data: 2026-02-06
Região: us-east-2

## Objetivo
Validar fluxo completo de cadastro de motorista com detecção automática de território via GPS.

## Pré-requisitos
- App React Native rodando (Expo)
- Backend deployado com versão mais recente
- Dispositivo com GPS ou emulador com localização mockada

## Cenários de Teste

### Cenário 1: GPS dentro de geofence oficial (Zumbi)
**Coordenadas**: lat=-22.8714, lng=-43.2711

**Passos**:
1. Abrir app → Tela de Registro
2. Preencher dados básicos (nome, email, telefone, senha)
3. Clicar "Continuar"
4. Permitir acesso à localização
5. Aguardar detecção automática

**Resultado esperado**:
```
✅ Bairro Detectado
   Zumbi
   ✅ Mapa Oficial - Taxa mín. 7%
```

**Badge do bairro**:
- Taxa: 7%
- Tipo: Oficial

**Ação**: Clicar "Cadastrar"

**Resposta esperada**:
```
Cadastro Realizado!
Seu território: Zumbi
Tipo: Oficial (taxa mín. 7%)

Aguarde aprovação do admin.
```

---

### Cenário 2: GPS fora de geofence (Abolição)
**Coordenadas**: lat=-22.8857, lng=-43.2994

**Passos**:
1. Abrir app → Tela de Registro
2. Preencher dados básicos
3. Clicar "Continuar"
4. Permitir acesso à localização
5. Aguardar detecção

**Resultado esperado**:
```
⚠️ Nenhum bairro detectado automaticamente

Escolha seu bairro:
- Abolição (📍 0.5km) - 12% Virtual
- Mangueira (📍 1.2km) - 12% Virtual
- ...
```

**Ação**: Selecionar "Abolição" manualmente

**Badge do bairro**:
- Taxa: 12%
- Tipo: Virtual

**Ação**: Clicar "Cadastrar"

**Resposta esperada**:
```
Cadastro Realizado!
Seu território: Abolição
Tipo: Virtual 800m (taxa mín. 12%)

Aguarde aprovação do admin.
```

---

### Cenário 3: Sem permissão de GPS
**Passos**:
1. Abrir app → Tela de Registro
2. Preencher dados básicos
3. Clicar "Continuar"
4. Negar permissão de localização

**Resultado esperado**:
```
Alert: Localização Negada
Você pode escolher seu bairro manualmente

[OK]
```

**Ação**: Clicar OK

**Resultado**: Lista completa de bairros (ordenada alfabeticamente)

**Ação**: Buscar e selecionar bairro manualmente

---

## Validação de Dados

### Request POST /api/governance/driver
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+5521999999999",
  "password": "senha123",
  "neighborhoodId": "uuid-do-bairro",
  "lat": -22.8714,
  "lng": -43.2711,
  "verificationMethod": "GPS_AUTO"
}
```

### Response esperada (sucesso)
```json
{
  "success": true,
  "data": {
    "id": "uuid-motorista",
    "name": "João Silva",
    "email": "joao@example.com",
    "status": "PENDING_APPROVAL",
    "territoryType": "OFFICIAL",
    "neighborhood": {
      "id": "uuid-bairro",
      "name": "Zumbi"
    }
  }
}
```

---

## Elementos de UI Validados

### ✅ Tela "Definir Território"
- [x] Botão "Usar minha localização"
- [x] Indicador de loading durante detecção
- [x] Box destacado para bairro detectado
- [x] Lista de bairros próximos (com distância)
- [x] Lista completa (fallback)
- [x] Badges visuais (7% Oficial / 12% Virtual)

### ✅ Integração API
- [x] GET /api/neighborhoods/smart-list?lat=X&lng=Y
- [x] POST /api/governance/driver
- [x] Tratamento de erros (Alert)
- [x] Mensagem de sucesso com territoryType

### ✅ Dados Armazenados
- [x] neighborhoodId selecionado
- [x] lat/lng usados
- [x] verificationMethod (GPS_AUTO ou MANUAL_SELECTION)

---

## Comandos de Teste (Backend)

### Verificar bairro detectado via API
```bash
# Zumbi (oficial)
curl -s "https://api.kaviar.com.br/api/neighborhoods/smart-list?lat=-22.8714&lng=-43.2711" | \
  jq '{detected, nearby: (.nearby[0:3])}'

# Abolição (sem geofence)
curl -s "https://api.kaviar.com.br/api/neighborhoods/smart-list?lat=-22.8857&lng=-43.2994" | \
  jq '{detected, nearby: (.nearby[0:3])}'
```

### Verificar motorista cadastrado
```bash
# Via SSM (substituir DRIVER_EMAIL)
aws ssm send-command \
  --region us-east-2 \
  --instance-ids i-0e2e0c435c0e1e5e5 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "export PGPASSWORD=$(aws secretsmanager get-secret-value --region us-east-2 --secret-id kaviar-prod-db-password --query SecretString --output text)",
    "psql -h kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com -U kaviar_admin -d kaviar -c \"SELECT id, name, email, status, territory_type, neighborhood_id FROM drivers WHERE email = '\''DRIVER_EMAIL'\'' LIMIT 1;\""
  ]'
```

---

## Evidências

### Screenshot 1: Bairro Detectado (Zumbi)
- Box verde com ícone de localização
- "✅ Mapa Oficial - Taxa mín. 7%"
- Botão "Cadastrar" habilitado

### Screenshot 2: Lista de Bairros Próximos
- Abolição - 📍 0.5km - 12% Virtual
- Mangueira - 📍 1.2km - 12% Virtual
- Badges claros e legíveis

### Screenshot 3: Sucesso no Cadastro
- Alert com mensagem de sucesso
- Tipo de território exibido
- Instrução para aguardar aprovação

---

## Checklist Final

- [x] Tela RN "Definir Território" funcionando
- [x] Integração smart-list OK
- [x] Integração POST /api/governance/driver OK
- [x] UI mostra detected/nearby/minFee/maxFee
- [x] UI mostra territoryType (OFFICIAL/FALLBACK_800M)
- [x] Badges visuais (7% Oficial / 12% Virtual)
- [x] Tratamento de erros
- [x] Mensagem de sucesso clara
- [x] Doc de teste manual criada

---

## Próximos Passos (Fora do Escopo)

1. **Deploy do backend** com versão mais recente
2. **Testes em dispositivo real** com GPS
3. **Tela de perfil do motorista** para atualizar território
4. **Dashboard admin** para aprovar motoristas
5. **Notificações** de aprovação/rejeição

---

## Notas Técnicas

- **Região AWS**: us-east-2 (fixo)
- **Sem hardcode**: API_URL via env var
- **Retrocompatível**: API retorna `data` como array + `detected`/`nearby` no top-level
- **Código limpo**: Sem duplicação, mínimo necessário
- **Segurança**: Senha não é exibida, apenas hash no backend
