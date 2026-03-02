# 🚀 DIA 2 - APP MOTORISTA (RASCUNHO)

**Data:** TBD  
**Duração:** 4-6 horas  
**Objetivo:** Toggle Online/Offline + Envio de Localização

---

## 🎯 OBJETIVO DO DIA

Adicionar funcionalidade de status online/offline:
1. Toggle na Home para ficar online/offline
2. Enviar localização a cada 10s quando online
3. Parar envio quando offline
4. Exibir status visual (verde = online, cinza = offline)

**PRÉ-REQUISITO:**
- Dia 1 concluído (Login + Cadastro + Home funcionando)

---

## 📱 TELAS A AJUSTAR

### **1. HomeScreen.tsx** (ATUALIZAR)

**Adicionar:**
- Toggle switch "Ficar Online"
- Indicador visual de status (círculo verde/cinza)
- Texto "Online" ou "Offline"
- Serviço de localização em background

**Fluxo:**
1. Usuário clica no toggle
2. Se ativar: solicita permissão de localização
3. Se permitir: muda status para "online" no backend
4. Inicia envio de localização a cada 10s
5. Se desativar: para envio + muda status para "offline"

---

## 🔌 ENDPOINTS NECESSÁRIOS

### **1. POST /api/driver/location** (CRIAR NO BACKEND)

**Request:**
```json
{
  "lat": -22.9708,
  "lng": -43.1829
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Localização atualizada"
}
```

**Arquivo backend:** `backend/src/routes/drivers.ts` (novo endpoint)

**Código backend:**
```typescript
router.post('/location', authenticateDriver, async (req, res) => {
  const driverId = (req as any).userId;
  const { lat, lng } = req.body;

  await prisma.drivers.update({
    where: { id: driverId },
    data: {
      last_location: { lat, lng },
      last_active_at: new Date()
    }
  });

  res.json({ success: true, message: 'Localização atualizada' });
});
```

---

### **2. PATCH /api/driver/status** (CRIAR NO BACKEND)

**Request:**
```json
{
  "status": "online"
}
```

**Response (200):**
```json
{
  "success": true,
  "status": "online"
}
```

**Arquivo backend:** `backend/src/routes/drivers.ts` (novo endpoint)

**Código backend:**
```typescript
router.patch('/status', authenticateDriver, async (req, res) => {
  const driverId = (req as any).userId;
  const { status } = req.body;

  if (!['online', 'offline'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  await prisma.drivers.update({
    where: { id: driverId },
    data: { status, last_active_at: new Date() }
  });

  res.json({ success: true, status });
});
```

---

## 📝 CÓDIGO MÍNIMO

### **1. HomeScreen.tsx (atualizado)**

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://api.kaviar.com';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [locationInterval, setLocationInterval] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    loadUser();
    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, []);

  const loadUser = async () => {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      setUserName(user.name);
    }
  };

  const toggleOnline = async () => {
    if (!isOnline) {
      // Ficar online
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permissão de localização negada');
        return;
      }

      // Atualizar status no backend
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/api/driver/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'online' })
      });

      // Iniciar envio de localização
      const interval = setInterval(async () => {
        const location = await Location.getCurrentPositionAsync({});
        await sendLocation(location.coords.latitude, location.coords.longitude);
      }, 10000); // 10 segundos

      setLocationInterval(interval);
      setIsOnline(true);
    } else {
      // Ficar offline
      if (locationInterval) {
        clearInterval(locationInterval);
        setLocationInterval(null);
      }

      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/api/driver/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'offline' })
      });

      setIsOnline(false);
    }
  };

  const sendLocation = async (lat, lng) => {
    const token = await AsyncStorage.getItem('token');
    await fetch(`${API_URL}/api/driver/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ lat, lng })
    });
  };

  const handleLogout = async () => {
    if (locationInterval) clearInterval(locationInterval);
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo!</Text>
      <Text style={styles.subtitle}>{userName}</Text>
      
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#34C759' : '#8E8E93' }]} />
        <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
      </View>
      
      <View style={styles.toggleContainer}>
        <Text>Ficar Online</Text>
        <Switch value={isOnline} onValueChange={toggleOnline} />
      </View>
      
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 18, color: '#666', marginBottom: 30 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  statusText: { fontSize: 16, fontWeight: '600' },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  button: { backgroundColor: '#FF3B30', padding: 15, borderRadius: 5, width: '100%' },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' }
});
```

---

## 📦 DEPENDÊNCIAS NECESSÁRIAS

```bash
cd kaviar-app

# Instalar expo-location
npx expo install expo-location
```

---

## ✅ CHECKLIST GO/NO-GO DO DIA 2

### **Backend**

- [ ] Endpoint `POST /api/driver/location` criado
- [ ] Endpoint `PATCH /api/driver/status` criado
- [ ] Endpoints testados com curl

### **App Motorista**

- [ ] Toggle adicionado na Home
- [ ] Permissão de localização solicitada
- [ ] Localização enviada a cada 10s quando online
- [ ] Envio para quando offline
- [ ] Status visual atualiza (verde/cinza)

### **Testes Funcionais**

- [ ] Toggle ativa/desativa corretamente
- [ ] Backend recebe localização a cada 10s
- [ ] Status no banco muda para "online"/"offline"
- [ ] Logout para envio de localização

---

## 🎯 PRÓXIMO PASSO (DIA 3)

**Objetivo:** Receber ofertas de corrida

**Entregas:**
- Polling de ofertas (`GET /api/driver/offers/pending`)
- Modal de oferta (origem, destino, valor)
- Botões Aceitar/Rejeitar

---

**FIM DO DIA 2 (RASCUNHO)**
