# Favoritos do Passageiro

## Visão Geral

Permite passageiros cadastrarem até 3 endereços favoritos (Casa, Trabalho, etc.) para facilitar solicitação de corridas e alimentar o sistema de favorites matching.

## Backend

### Endpoints

**GET /api/passenger/favorites**
- Autenticação: Bearer token (passageiro)
- Feature flag: `passenger_favorites_matching`
- Response:
```json
{
  "success": true,
  "favorites": [
    {
      "id": "uuid",
      "label": "Casa",
      "type": "HOME",
      "lat": -22.8857,
      "lng": -43.2994,
      "created_at": "2026-02-06T00:00:00Z"
    }
  ]
}
```

**POST /api/passenger/favorites**
- Autenticação: Bearer token (passageiro)
- Feature flag: `passenger_favorites_matching`
- Body:
```json
{
  "label": "Casa",
  "type": "HOME",
  "lat": -22.8857,
  "lng": -43.2994
}
```
- Response:
```json
{
  "success": true,
  "favorite": {
    "id": "uuid",
    "label": "Casa",
    "type": "HOME",
    "lat": -22.8857,
    "lng": -43.2994,
    "created_at": "2026-02-06T00:00:00Z"
  }
}
```

**DELETE /api/passenger/favorites/:id**
- Autenticação: Bearer token (passageiro)
- Feature flag: `passenger_favorites_matching`
- Response:
```json
{
  "success": true,
  "message": "Favorite deleted"
}
```

### Tipos de Favorito
- `HOME`: Casa
- `WORK`: Trabalho
- `OTHER`: Outro

### Feature Flag
Se `passenger_favorites_matching` estiver desabilitada, retorna:
```json
{
  "success": false,
  "error": "Feature not available"
}
```
Status: 403

## Frontend

### Tela: favorites.tsx

**Localização**: `kaviar-app/app/(passenger)/favorites.tsx`

**Funcionalidades**:
1. Lista até 3 favoritos
2. Adicionar novo favorito (desabilitado se já tiver 3)
3. Remover favorito existente
4. Capturar localização via GPS
5. Selecionar tipo (Casa, Trabalho, Outro)

**Estados**:
- `favorites`: Array de favoritos
- `loading`: Indicador de carregamento
- `showAddForm`: Exibe/oculta formulário
- `label`: Nome do favorito
- `type`: Tipo (HOME/WORK/OTHER)
- `location`: { lat, lng } ou null

**Fluxo de Adicionar**:
1. Clicar "Adicionar Favorito"
2. Digitar nome (ex: "Casa")
3. Selecionar tipo (Casa/Trabalho/Outro)
4. Clicar "Usar minha localização atual"
5. Clicar "Salvar"

**Fluxo de Remover**:
1. Clicar ícone de lixeira no card
2. Confirmar remoção
3. Favorito removido da lista

### UI Components

**Card de Favorito**:
```tsx
<View style={styles.favoriteCard}>
  <Ionicons name="home" /> // ou "briefcase" ou "location"
  <Text>{label}</Text>
  <Text>{lat}, {lng}</Text>
  <TouchableOpacity onPress={remove}>
    <Ionicons name="trash-outline" />
  </TouchableOpacity>
</View>
```

**Botão Adicionar**:
- Habilitado: Verde com ícone "+"
- Desabilitado: Cinza com texto "Limite atingido (3/3)"

**Formulário**:
- Input de texto (label)
- 3 botões de tipo (Casa/Trabalho/Outro)
- Botão "Usar minha localização atual"
- Botões Cancelar/Salvar

## Integração

### Autenticação
```typescript
// TODO: Implementar context de autenticação
const token = ''; // Get from auth context/storage

fetch(`${API_URL}/api/passenger/favorites`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Tratamento de Erros

**Feature desabilitada (403)**:
```typescript
if (response.status === 403) {
  Alert.alert('Recurso Indisponível', 'Feature not available');
}
```

**Erro genérico**:
```typescript
Alert.alert('Erro', data.error || 'Erro ao carregar favoritos');
```

## Testes

### Manual

1. **Adicionar favorito**:
   - Abrir tela de favoritos
   - Clicar "Adicionar Favorito"
   - Preencher "Casa"
   - Selecionar tipo "Casa"
   - Clicar "Usar minha localização atual"
   - Permitir GPS
   - Clicar "Salvar"
   - Verificar card aparece na lista

2. **Limite de 3**:
   - Adicionar 3 favoritos
   - Botão "Adicionar" deve ficar desabilitado
   - Texto: "Limite atingido (3/3)"

3. **Remover favorito**:
   - Clicar ícone de lixeira
   - Confirmar remoção
   - Favorito desaparece da lista
   - Botão "Adicionar" volta a ficar habilitado

4. **Feature flag desabilitada**:
   - Desabilitar `passenger_favorites_matching`
   - Tentar acessar tela
   - Deve mostrar: "Recurso Indisponível"

### Backend Validation

```bash
# Listar favoritos
curl -H "Authorization: Bearer TOKEN" \
  https://api.kaviar.com.br/api/passenger/favorites

# Adicionar favorito
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Casa","type":"HOME","lat":-22.8857,"lng":-43.2994}' \
  https://api.kaviar.com.br/api/passenger/favorites

# Remover favorito
curl -X DELETE \
  -H "Authorization: Bearer TOKEN" \
  https://api.kaviar.com.br/api/passenger/favorites/UUID
```

## Próximos Passos

1. **Context de Autenticação**: Implementar para gerenciar token
2. **Seleção no Mapa**: Adicionar mapa para escolher localização visualmente
3. **Busca de Endereço**: Integrar com API de geocoding
4. **Edição de Favorito**: Permitir editar label/tipo/localização
5. **Uso em Request Ride**: Integrar favoritos na tela de solicitar corrida

## Segurança

✅ Autenticação via Bearer token
✅ Feature flag para controle de acesso
✅ Validação de ownership (passageiro só vê/edita seus favoritos)
✅ Limite de 3 favoritos por passageiro
✅ Sem hardcode de URLs/tokens

## Arquivos

### Backend
- `backend/src/routes/passenger-favorites.ts` - Rotas (GET, POST, DELETE)

### Frontend
- `kaviar-app/app/(passenger)/favorites.tsx` - Tela de favoritos

### Documentação
- `kaviar-app/FAVORITOS_README.md` - Este arquivo
