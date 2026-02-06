# Frontend - Sistema de Território

## Visão Geral

O app React Native implementa detecção automática de território via GPS para motoristas durante o cadastro.

## Arquitetura

### Fluxo de Cadastro

```
1. Dados Básicos
   ↓
2. Solicitar GPS
   ↓
3. Detectar Território (API)
   ↓
4. Confirmar/Selecionar Bairro
   ↓
5. Cadastrar Motorista
```

### Componentes

**Arquivo**: `kaviar-app/app/(auth)/register.tsx`

**Estados**:
- `step`: 1 (dados) ou 2 (território)
- `location`: { lat, lng } ou null
- `detectedNeighborhood`: bairro detectado via GPS
- `neighborhoods`: lista de bairros (nearby ou all)
- `selectedNeighborhood`: bairro escolhido pelo usuário

**Funções principais**:
- `requestLocation()`: Solicita permissão e obtém GPS
- `loadSmartNeighborhoods(coords)`: Chama API com GPS
- `loadNeighborhoods()`: Fallback sem GPS
- `handleRegister()`: Envia POST /api/governance/driver

## API Integration

### GET /api/neighborhoods/smart-list

**Com GPS**:
```typescript
const response = await fetch(
  `${API_URL}/api/neighborhoods/smart-list?lat=${lat}&lng=${lng}`
);
```

**Response**:
```json
{
  "success": true,
  "data": [...],        // Array de todos os bairros
  "detected": {...},    // Bairro detectado (ou null)
  "nearby": [...]       // Bairros próximos (ou [])
}
```

**Lógica**:
- Se `detected` existe → mostrar como "Bairro Detectado"
- Se `detected` null → mostrar `nearby` como sugestões
- Fallback → mostrar `data` (lista completa)

### POST /api/governance/driver

**Payload**:
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "password": "string",
  "neighborhoodId": "uuid",
  "lat": number,
  "lng": number,
  "verificationMethod": "GPS_AUTO" | "MANUAL_SELECTION"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "territoryType": "OFFICIAL" | "FALLBACK_800M",
    ...
  }
}
```

## UI Components

### Box "Bairro Detectado"
```tsx
{detectedNeighborhood && (
  <View style={styles.detectedBox}>
    <Ionicons name="location" size={24} color="#FF6B35" />
    <View style={styles.detectedInfo}>
      <Text style={styles.detectedTitle}>Bairro Detectado</Text>
      <Text style={styles.detectedName}>{detectedNeighborhood.name}</Text>
      <Text style={styles.detectedType}>
        {detectedNeighborhood.hasGeofence 
          ? '✅ Mapa Oficial - Taxa mín. 7%' 
          : '⚠️ Virtual 800m - Taxa mín. 12%'}
      </Text>
    </View>
  </View>
)}
```

### Lista de Bairros
```tsx
<ScrollView style={styles.neighborhoodList}>
  {neighborhoods.map((n) => (
    <TouchableOpacity
      key={n.id}
      style={[
        styles.neighborhoodItem,
        selectedNeighborhood?.id === n.id && styles.neighborhoodItemSelected,
      ]}
      onPress={() => setSelectedNeighborhood(n)}
    >
      <View style={styles.neighborhoodInfo}>
        <Text style={styles.neighborhoodName}>{n.name}</Text>
        {n.zone && <Text style={styles.neighborhoodZone}>{n.zone}</Text>}
        {n.distance && (
          <Text style={styles.neighborhoodDistance}>
            📍 {(n.distance / 1000).toFixed(1)}km
          </Text>
        )}
      </View>
      <View style={styles.neighborhoodBadge}>
        <Text style={styles.neighborhoodFee}>
          {n.hasGeofence ? '7%' : '12%'}
        </Text>
        <Text style={styles.neighborhoodType}>
          {n.hasGeofence ? 'Oficial' : 'Virtual'}
        </Text>
      </View>
    </TouchableOpacity>
  ))}
</ScrollView>
```

### Badges
- **7% Oficial**: Bairro com geofence (ST_Contains)
- **12% Virtual**: Bairro sem geofence (raio 800m)

## Tratamento de Erros

### Permissão Negada
```typescript
if (status !== 'granted') {
  Alert.alert(
    'Localização Negada',
    'Você pode escolher seu bairro manualmente',
    [{ text: 'OK', onPress: loadNeighborhoods }]
  );
  return;
}
```

### Erro na API
```typescript
catch (error) {
  console.error('Erro ao buscar bairros:', error);
  loadNeighborhoods(); // Fallback para lista completa
}
```

### Validação de Campos
```typescript
if (!selectedNeighborhood) {
  Alert.alert('Erro', 'Selecione seu bairro');
  return;
}
```

## Configuração

### Variáveis de Ambiente
```bash
# .env
EXPO_PUBLIC_API_URL=https://api.kaviar.com.br
```

### Dependências
```json
{
  "expo-location": "^16.x",
  "@expo/vector-icons": "^14.x"
}
```

## Testes

### Teste Manual
Ver: `docs/FRONTEND_TERRITORIO_TESTE_2026-02-06.md`

### Coordenadas de Teste
- **Zumbi** (oficial): -22.8714, -43.2711
- **Abolição** (virtual): -22.8857, -43.2994

### Emulador
```bash
# Android Studio
adb emu geo fix -43.2711 -22.8714

# iOS Simulator
Debug → Location → Custom Location
```

## Próximas Melhorias

1. **Busca de bairros**: Input para filtrar lista
2. **Mapa visual**: Mostrar geofence no mapa
3. **Atualização de território**: Tela no perfil do motorista
4. **Histórico**: Log de mudanças de território
5. **Validação em tempo real**: Verificar se motorista está no território

## Segurança

✅ Senha não é exibida (secureTextEntry)
✅ API_URL via env var (não hardcoded)
✅ Validação de campos no frontend e backend
✅ Tratamento de erros sem expor detalhes técnicos

## Compatibilidade

- **iOS**: ✅ Testado
- **Android**: ✅ Testado
- **Web**: ⚠️ GPS pode não funcionar (fallback para seleção manual)
