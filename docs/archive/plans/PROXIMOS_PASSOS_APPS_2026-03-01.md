# 🚀 PRÓXIMOS PASSOS - FINALIZAR APPS MOTORISTA E PASSAGEIRO

**Data:** 01/03/2026 19:39 BRT  
**Objetivo:** Guia prático para finalizar desenvolvimento dos apps mobile

---

## 📋 CHECKLIST GERAL

### **Backend - Ajustes Necessários**

- [ ] Validar `neighborhoodId` no cadastro (verificar se existe e está ativo)
- [ ] Criar endpoint `/api/neighborhoods/nearby?lat=X&lng=Y`
- [ ] Adicionar filtro `is_active: true` em `/api/governance/neighborhoods`
- [ ] Implementar persistência automática de bairro via GPS
- [ ] Criar endpoint de notificações push
- [ ] Integrar sistema de pagamentos PIX

### **App Motorista - Telas a Implementar**

- [ ] Tela de cadastro com GPS
- [ ] Tela de upload de documentos
- [ ] Tela home com mapa e toggle disponível
- [ ] Tela de dashboard de métricas
- [ ] Tela de corrida ativa
- [ ] Tela de histórico de corridas
- [ ] Sistema de notificações

### **App Passageiro - Telas a Implementar**

- [ ] Tela de cadastro com GPS
- [ ] Tela home com mapa
- [ ] Tela de solicitação de corrida
- [ ] Tela de corrida ativa
- [ ] Tela de histórico
- [ ] Tela de favoritos
- [ ] Sistema de notificações

---

## 🔧 FASE 1: AJUSTES BACKEND (2 dias)

### **1.1 Validar neighborhoodId no Cadastro**

**Arquivo:** `/backend/src/routes/governance.ts`

**Adicionar validação:**

```typescript
const driverCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  password: z.string().min(6),
  neighborhoodId: z.string().uuid().refine(async (id) => {
    const neighborhood = await prisma.neighborhoods.findUnique({
      where: { id, is_active: true }
    });
    return !!neighborhood;
  }, 'Bairro inválido ou inativo'),
  communityId: z.string().uuid().optional()
});
```

### **1.2 Criar Endpoint de Bairros Próximos**

**Arquivo:** `/backend/src/routes/neighborhoods.ts`

```typescript
router.get('/nearby', async (req, res) => {
  const { lat, lng, radius = 5000 } = req.query;
  
  // Validar coordenadas
  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      error: 'Coordenadas obrigatórias'
    });
  }
  
  // Buscar bairros próximos
  const neighborhoods = await prisma.neighborhoods.findMany({
    where: {
      is_active: true,
      center_lat: { not: null },
      center_lng: { not: null }
    },
    select: {
      id: true,
      name: true,
      city: true,
      center_lat: true,
      center_lng: true
    }
  });
  
  // Calcular distância e filtrar
  const withDistance = neighborhoods
    .map(n => ({
      id: n.id,
      name: n.name,
      city: n.city,
      distance: calculateDistance(
        Number(lat),
        Number(lng),
        Number(n.center_lat),
        Number(n.center_lng)
      )
    }))
    .filter(n => n.distance <= Number(radius))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10); // Top 10 mais próximos
  
  res.json({
    success: true,
    data: withDistance
  });
});
```

### **1.3 Filtrar Bairros Ativos**

**Arquivo:** `/backend/src/routes/governance.ts`

```typescript
router.get('/neighborhoods', async (req, res) => {
  const neighborhoods = await prisma.neighborhoods.findMany({
    where: { is_active: true }, // ✅ Adicionar filtro
    select: {
      id: true,
      name: true,
      city: true,
      zone: true,
      has_geofence: true
    },
    orderBy: { name: 'asc' }
  });
  
  res.json({ success: true, data: neighborhoods });
});
```

### **1.4 Persistir Bairro via GPS**

**Arquivo:** `/backend/src/routes/drivers.ts`

```typescript
router.post('/me/complete-profile', authenticateDriver, async (req, res) => {
  const { latitude, longitude } = req.body;
  const driverId = req.user.id;
  
  // Resolver bairro via GPS
  const territory = await resolveTerritory(longitude, latitude);
  
  if (territory.neighborhood) {
    // Atualizar bairro do motorista
    await prisma.drivers.update({
      where: { id: driverId },
      data: {
        neighborhood_id: territory.neighborhood.id,
        last_lat: latitude,
        last_lng: longitude,
        territory_type: territory.method === 'fallback_800m' 
          ? 'FALLBACK_800M' 
          : 'BAIRRO_OFICIAL'
      }
    });
    
    res.json({
      success: true,
      data: {
        neighborhood: territory.neighborhood,
        method: territory.method
      }
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'Não foi possível determinar seu bairro. Por favor, escolha manualmente.'
    });
  }
});
```

---

## 📱 FASE 2: APP MOTORISTA - MVP (7 dias)

### **2.1 Tela de Cadastro (2 dias)**

**Arquivo:** `/kaviar-app/app/(auth)/register-driver.tsx`

**Funcionalidades:**

1. Formulário com campos:
   - Nome completo
   - Email
   - Telefone
   - Senha
   - Confirmar senha

2. Pedir localização GPS:
   ```typescript
   import * as Location from 'expo-location';
   
   const getLocation = async () => {
     const { status } = await Location.requestForegroundPermissionsAsync();
     if (status !== 'granted') {
       alert('Permissão de localização negada');
       return;
     }
     
     const location = await Location.getCurrentPositionAsync({});
     setLocation({
       lat: location.coords.latitude,
       lng: location.coords.longitude
     });
   };
   ```

3. Resolver bairro automaticamente:
   ```typescript
   const resolveNeighborhood = async () => {
     const response = await api.post('/geo/resolve', {
       lat: location.lat,
       lng: location.lng
     });
     
     if (response.data.resolved) {
       setNeighborhood(response.data.neighborhood);
     } else {
       // Mostrar lista de bairros próximos
       const nearby = await api.get('/neighborhoods/nearby', {
         params: { lat: location.lat, lng: location.lng }
       });
       setNearbyNeighborhoods(nearby.data.data);
     }
   };
   ```

4. Cadastrar motorista:
   ```typescript
   const register = async () => {
     const response = await api.post('/governance/driver', {
       name,
       email,
       phone,
       password,
       neighborhoodId: neighborhood.id
     });
     
     if (response.data.success) {
       // Salvar token
       await AsyncStorage.setItem('token', response.data.token);
       // Navegar para upload de documentos
       router.push('/(driver)/upload-documents');
     }
   };
   ```

### **2.2 Tela de Upload de Documentos (1 dia)**

**Arquivo:** `/kaviar-app/app/(driver)/upload-documents.tsx`

**Funcionalidades:**

1. Upload de fotos:
   ```typescript
   import * as ImagePicker from 'expo-image-picker';
   
   const pickImage = async (type: 'cnh' | 'rg' | 'cpf' | 'vehicle') => {
     const result = await ImagePicker.launchImageLibraryAsync({
       mediaTypes: ImagePicker.MediaTypeOptions.Images,
       allowsEditing: true,
       quality: 0.8
     });
     
     if (!result.canceled) {
       uploadDocument(type, result.assets[0].uri);
     }
   };
   ```

2. Upload para S3:
   ```typescript
   const uploadDocument = async (type: string, uri: string) => {
     const formData = new FormData();
     formData.append('file', {
       uri,
       type: 'image/jpeg',
       name: `${type}.jpg`
     });
     formData.append('type', type);
     
     const response = await api.post('/drivers/me/documents', formData, {
       headers: { 'Content-Type': 'multipart/form-data' }
     });
     
     if (response.data.success) {
       alert('Documento enviado com sucesso!');
     }
   };
   ```

3. Campos adicionais:
   - Placa do veículo
   - Modelo do veículo
   - Cor do veículo
   - Chave PIX
   - Tipo de chave PIX

### **2.3 Tela Home com Mapa (2 dias)**

**Arquivo:** `/kaviar-app/app/(driver)/home.tsx`

**Funcionalidades:**

1. Mapa com localização atual:
   ```typescript
   import MapView, { Marker } from 'react-native-maps';
   
   <MapView
     style={{ flex: 1 }}
     initialRegion={{
       latitude: location.lat,
       longitude: location.lng,
       latitudeDelta: 0.01,
       longitudeDelta: 0.01
     }}
   >
     <Marker
       coordinate={{
         latitude: location.lat,
         longitude: location.lng
       }}
       title="Você está aqui"
     />
   </MapView>
   ```

2. Toggle disponível/indisponível:
   ```typescript
   const toggleAvailability = async () => {
     const response = await api.post('/drivers/me/availability', {
       available: !isAvailable
     });
     
     if (response.data.success) {
       setIsAvailable(!isAvailable);
     }
   };
   ```

3. Lista de corridas disponíveis:
   ```typescript
   const fetchAvailableRides = async () => {
     const response = await api.get('/drivers/me/available-rides');
     setAvailableRides(response.data.data);
   };
   
   // Polling a cada 5 segundos
   useEffect(() => {
     const interval = setInterval(fetchAvailableRides, 5000);
     return () => clearInterval(interval);
   }, []);
   ```

4. Aceitar corrida:
   ```typescript
   const acceptRide = async (rideId: string) => {
     const response = await api.post(`/rides/${rideId}/accept`);
     
     if (response.data.success) {
       router.push(`/(driver)/ride-active?id=${rideId}`);
     }
   };
   ```

### **2.4 Tela de Dashboard (1 dia)**

**Arquivo:** `/kaviar-app/app/(driver)/dashboard.tsx`

**Funcionalidades:**

1. Buscar métricas:
   ```typescript
   const fetchDashboard = async () => {
     const response = await api.get('/drivers/me/dashboard', {
       params: { period: 30 }
     });
     setDashboard(response.data.data);
   };
   ```

2. Exibir cards:
   - Total de corridas
   - Ganhos totais
   - Taxa média
   - Economia vs Uber

3. Gráfico de breakdown:
   ```typescript
   import { PieChart } from 'react-native-chart-kit';
   
   <PieChart
     data={[
       {
         name: 'Mesmo Bairro (7%)',
         population: dashboard.matchBreakdown.sameNeighborhood.count,
         color: '#4CAF50'
       },
       {
         name: 'Adjacente (12%)',
         population: dashboard.matchBreakdown.adjacentNeighborhood.count,
         color: '#FFC107'
       },
       {
         name: 'Fora (20%)',
         population: dashboard.matchBreakdown.outsideFence.count,
         color: '#F44336'
       }
     ]}
     width={300}
     height={200}
     chartConfig={{
       color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
     }}
     accessor="population"
     backgroundColor="transparent"
   />
   ```

### **2.5 Tela de Corrida Ativa (1 dia)**

**Arquivo:** `/kaviar-app/app/(driver)/ride-active.tsx`

**Funcionalidades:**

1. Buscar detalhes da corrida:
   ```typescript
   const fetchRideDetails = async () => {
     const response = await api.get(`/rides/${rideId}`);
     setRide(response.data.data);
   };
   ```

2. Exibir informações:
   - Nome do passageiro
   - Telefone do passageiro
   - Origem
   - Destino
   - Valor da corrida
   - Status

3. Botões de ação:
   ```typescript
   const startRide = async () => {
     await api.post(`/rides/${rideId}/start`);
     setRide({ ...ride, status: 'in_progress' });
   };
   
   const completeRide = async () => {
     await api.post(`/rides/${rideId}/complete`);
     router.push('/(driver)/home');
   };
   
   const cancelRide = async () => {
     await api.post(`/rides/${rideId}/cancel`);
     router.push('/(driver)/home');
   };
   ```

---

## 📱 FASE 3: APP PASSAGEIRO - MVP (7 dias)

### **3.1 Tela de Cadastro (1 dia)**

**Arquivo:** `/kaviar-app/app/(auth)/register-passenger.tsx`

**Similar ao cadastro de motorista, mas sem upload de documentos**

### **3.2 Tela Home com Mapa (2 dias)**

**Arquivo:** `/kaviar-app/app/(passenger)/home.tsx`

**Funcionalidades:**

1. Mapa com localização atual
2. Campo de busca de destino:
   ```typescript
   import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
   
   <GooglePlacesAutocomplete
     placeholder="Para onde?"
     onPress={(data, details = null) => {
       setDestination({
         lat: details.geometry.location.lat,
         lng: details.geometry.location.lng,
         address: data.description
       });
     }}
     query={{
       key: 'YOUR_GOOGLE_API_KEY',
       language: 'pt-BR'
     }}
   />
   ```

3. Botão "Solicitar Corrida":
   ```typescript
   const requestRide = async () => {
     const response = await api.post('/rides', {
       originLat: location.lat,
       originLng: location.lng,
       destinationLat: destination.lat,
       destinationLng: destination.lng
     });
     
     if (response.data.success) {
       router.push(`/(passenger)/ride-active?id=${response.data.data.id}`);
     }
   };
   ```

### **3.3 Tela de Corrida Ativa (2 dias)**

**Arquivo:** `/kaviar-app/app/(passenger)/ride-active.tsx`

**Funcionalidades:**

1. Buscar detalhes da corrida
2. Exibir informações do motorista
3. Mapa com localização do motorista em tempo real
4. Botão "Cancelar"

### **3.4 Tela de Histórico (1 dia)**

**Arquivo:** `/kaviar-app/app/(passenger)/history.tsx`

**Funcionalidades:**

1. Buscar histórico:
   ```typescript
   const fetchHistory = async () => {
     const response = await api.get('/passengers/me/rides', {
       params: { period: 30 }
     });
     setHistory(response.data.data);
   };
   ```

2. Lista de corridas anteriores
3. Filtros por período

### **3.5 Tela de Favoritos (1 dia)**

**Arquivo:** `/kaviar-app/app/(passenger)/favorites.tsx`

**Funcionalidades:**

1. Buscar favoritos:
   ```typescript
   const fetchFavorites = async () => {
     const response = await api.get('/passengers/me/favorites');
     setFavorites(response.data.data);
   };
   ```

2. Lista de motoristas favoritos
3. Botão "Solicitar Corrida" com favorito

---

## 🔔 FASE 4: NOTIFICAÇÕES (3 dias)

### **4.1 Configurar Firebase Cloud Messaging**

1. Criar projeto no Firebase Console
2. Adicionar apps Android e iOS
3. Baixar `google-services.json` e `GoogleService-Info.plist`
4. Instalar dependências:
   ```bash
   npx expo install expo-notifications expo-device expo-constants
   ```

### **4.2 Implementar Notificações no App**

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configurar handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

// Registrar token
const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    alert('Notificações só funcionam em dispositivos físicos');
    return;
  }
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('Permissão de notificações negada');
    return;
  }
  
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Enviar token para backend
  await api.post('/drivers/me/push-token', { token });
};
```

### **4.3 Implementar Notificações no Backend**

```typescript
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: any
) {
  const messages = [{
    to: pushToken,
    sound: 'default',
    title,
    body,
    data
  }];
  
  const chunks = expo.chunkPushNotifications(messages);
  
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  }
}

// Exemplo: notificar motorista de nova corrida
await sendPushNotification(
  driver.push_token,
  'Nova Corrida Disponível',
  'Corrida de R$ 25,00 em Copacabana',
  { rideId: ride.id }
);
```

---

## 💳 FASE 5: PAGAMENTOS PIX (2 dias)

### **5.1 Integrar API de Pagamentos**

**Opções:**
- Mercado Pago
- PagSeguro
- Stripe (com PIX)

**Exemplo com Mercado Pago:**

```typescript
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

const payment = new Payment(client);

// Criar pagamento PIX
const createPixPayment = async (amount: number, email: string) => {
  const response = await payment.create({
    body: {
      transaction_amount: amount,
      description: 'Corrida Kaviar',
      payment_method_id: 'pix',
      payer: {
        email
      }
    }
  });
  
  return {
    qrCode: response.point_of_interaction.transaction_data.qr_code,
    qrCodeBase64: response.point_of_interaction.transaction_data.qr_code_base64,
    paymentId: response.id
  };
};
```

### **5.2 Implementar Fluxo de Pagamento**

1. Ao finalizar corrida, gerar QR Code PIX
2. Exibir QR Code para passageiro
3. Webhook para confirmar pagamento
4. Liberar valor para motorista

---

## 📊 ESTIMATIVA DE TEMPO

| Fase | Descrição | Tempo | Prioridade |
|------|-----------|-------|------------|
| 1 | Ajustes Backend | 2 dias | 🔴 Alta |
| 2 | App Motorista MVP | 7 dias | 🔴 Alta |
| 3 | App Passageiro MVP | 7 dias | 🔴 Alta |
| 4 | Notificações | 3 dias | 🟡 Média |
| 5 | Pagamentos PIX | 2 dias | 🟡 Média |
| **TOTAL** | | **21 dias** | |

---

## 🎯 PRÓXIMO PASSO IMEDIATO

**COMEÇAR POR:**

1. ✅ Validar `neighborhoodId` no backend (1 hora)
2. ✅ Criar endpoint `/api/neighborhoods/nearby` (2 horas)
3. ✅ Implementar tela de cadastro do motorista (2 dias)

**Comando para iniciar:**

```bash
cd /home/goes/kaviar/kaviar-app
npm install
npx expo start
```

---

**FIM DO GUIA**
