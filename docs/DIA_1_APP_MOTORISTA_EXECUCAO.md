# 🚀 DIA 1 - APP MOTORISTA (EXECUÇÃO)

**Data:** 01/03/2026 22:36 BRT  
**Duração:** 4-6 horas  
**Objetivo:** Cadastro + Login + Home básico (sem online/offline ainda)

---

## 🎯 OBJETIVO DO DIA

Criar fluxo mínimo de autenticação no app motorista:
1. Tela de Login
2. Tela de Cadastro (simplificada)
3. Tela Home (apenas exibir nome do motorista)
4. Persistência de token (AsyncStorage)

**FORA DO DIA 1:**
- Toggle online/offline (Dia 2)
- Envio de localização (Dia 2)
- Receber ofertas (Dia 3+)

---

## 📱 TELAS A CRIAR/AJUSTAR

### **1. LoginScreen.tsx** (NOVA)

**Localização:** `kaviar-app/src/screens/LoginScreen.tsx`

**Componentes:**
- Input email
- Input senha (com toggle mostrar/ocultar)
- Botão "Entrar"
- Link "Não tem conta? Cadastre-se"

**Validações:**
- Email válido
- Senha não vazia

**Fluxo:**
1. Usuário preenche email + senha
2. Clica "Entrar"
3. App chama `POST /api/auth/driver/login`
4. Se sucesso: salva token no AsyncStorage + navega para Home
5. Se erro: exibe mensagem de erro

---

### **2. RegisterScreen.tsx** (NOVA)

**Localização:** `kaviar-app/src/screens/RegisterScreen.tsx`

**Componentes:**
- Input nome
- Input email
- Input telefone
- Input senha
- Input confirmar senha
- Botão "Cadastrar"
- Link "Já tem conta? Faça login"

**Validações:**
- Nome mínimo 2 caracteres
- Email válido
- Telefone formato brasileiro (+5521999999999)
- Senha mínimo 6 caracteres
- Senhas coincidem

**Fluxo:**
1. Usuário preenche dados
2. Clica "Cadastrar"
3. App chama `POST /api/governance/driver` (sem neighborhoodId por enquanto)
4. Se sucesso: chama `POST /api/auth/driver/set-password` (definir senha)
5. Faz login automático
6. Salva token no AsyncStorage + navega para Home
7. Se erro: exibe mensagem de erro

---

### **3. HomeScreen.tsx** (NOVA)

**Localização:** `kaviar-app/src/screens/HomeScreen.tsx`

**Componentes:**
- Header com nome do motorista
- Mensagem "Bem-vindo, [Nome]!"
- Botão "Sair" (logout)

**Fluxo:**
1. Ao carregar, busca dados do motorista do token JWT
2. Exibe nome
3. Botão "Sair": limpa AsyncStorage + volta para Login

---

### **4. App.tsx** (AJUSTAR)

**Localização:** `kaviar-app/App.tsx`

**Mudanças:**
- Adicionar navegação (React Navigation)
- Stack Navigator: Login → Register → Home
- Verificar token ao iniciar app:
  - Se token válido: navega para Home
  - Se não: navega para Login

---

## 🔌 ENDPOINTS USADOS

### **1. POST /api/auth/driver/login**

**Referência:** `API_CONTRACT_ADMIN_PUBLIC_2026-03-01.md` (linha ~118)

**Request:**
```json
{
  "email": "motorista@example.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "driver_123",
    "name": "João Silva",
    "email": "motorista@example.com",
    "phone": "+5521999999999",
    "status": "pending",
    "user_type": "DRIVER",
    "isPending": true
  }
}
```

**Response (401):**
```json
{
  "error": "Credenciais inválidas"
}
```

**Arquivo backend:** `backend/src/routes/driver-auth.ts:19`

---

### **2. POST /api/governance/driver**

**Referência:** `API_CONTRACT_ADMIN_PUBLIC_2026-03-01.md` (linha ~237)

**Request:**
```json
{
  "name": "João Silva",
  "email": "motorista@example.com",
  "phone": "+5521999999999"
}
```

**Response (201):**
```json
{
  "success": true,
  "driver": {
    "id": "driver_123",
    "name": "João Silva",
    "email": "motorista@example.com",
    "status": "pending"
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Email já cadastrado"
}
```

**Arquivo backend:** `backend/src/routes/governance.ts:237`

---

### **3. POST /api/auth/driver/set-password**

**Referência:** `backend/src/routes/driver-auth.ts:75`

**Request:**
```json
{
  "email": "motorista@example.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Senha atualizada com sucesso"
}
```

**Arquivo backend:** `backend/src/routes/driver-auth.ts:75`

---

## ✅ COMANDOS DE TESTE (BACKEND)

### **1. Verificar backend está rodando**

```bash
curl -X GET "https://api.kaviar.com/health"
```

**Esperado:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-01T22:36:00Z"
}
```

---

### **2. Testar cadastro de motorista**

```bash
curl -X POST "https://api.kaviar.com/api/governance/driver" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Motorista Teste Dia 1",
    "email": "motorista.dia1@kaviar.com",
    "phone": "+5521999999999"
  }'
```

**Esperado:**
```json
{
  "success": true,
  "driver": {
    "id": "driver_...",
    "name": "Motorista Teste Dia 1",
    "email": "motorista.dia1@kaviar.com",
    "status": "pending"
  }
}
```

---

### **3. Testar definir senha**

```bash
curl -X POST "https://api.kaviar.com/api/auth/driver/set-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "motorista.dia1@kaviar.com",
    "password": "senha123"
  }'
```

**Esperado:**
```json
{
  "success": true,
  "message": "Senha atualizada com sucesso"
}
```

---

### **4. Testar login**

```bash
curl -X POST "https://api.kaviar.com/api/auth/driver/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "motorista.dia1@kaviar.com",
    "password": "senha123"
  }'
```

**Esperado:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "driver_...",
    "name": "Motorista Teste Dia 1",
    "email": "motorista.dia1@kaviar.com",
    "status": "pending",
    "user_type": "DRIVER",
    "isPending": true
  }
}
```

---

### **5. Testar login com credenciais inválidas**

```bash
curl -X POST "https://api.kaviar.com/api/auth/driver/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "motorista.dia1@kaviar.com",
    "password": "senha_errada"
  }'
```

**Esperado:**
```json
{
  "error": "Credenciais inválidas"
}
```

---

## 📝 CÓDIGO MÍNIMO

### **1. LoginScreen.tsx**

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://api.kaviar.com';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/driver/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        navigation.navigate('Home');
      } else {
        Alert.alert('Erro', data.error || 'Erro ao fazer login');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Motorista</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Não tem conta? Cadastre-se</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 5, marginTop: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  link: { color: '#007AFF', textAlign: 'center', marginTop: 15 }
});
```

---

### **2. RegisterScreen.tsx**

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://api.kaviar.com';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'Senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      // 1. Criar motorista
      const registerResponse = await fetch(`${API_URL}/api/governance/driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone })
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        Alert.alert('Erro', registerData.error || 'Erro ao cadastrar');
        setLoading(false);
        return;
      }

      // 2. Definir senha
      await fetch(`${API_URL}/api/auth/driver/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      // 3. Fazer login automático
      const loginResponse = await fetch(`${API_URL}/api/auth/driver/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok) {
        await AsyncStorage.setItem('token', loginData.token);
        await AsyncStorage.setItem('user', JSON.stringify(loginData.user));
        navigation.navigate('Home');
      } else {
        Alert.alert('Sucesso', 'Cadastro realizado! Faça login.');
        navigation.navigate('Login');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastro Motorista</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Nome completo"
        value={name}
        onChangeText={setName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Telefone (+5521999999999)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Senha (mínimo 6 caracteres)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Já tem conta? Faça login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 5, marginTop: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  link: { color: '#007AFF', textAlign: 'center', marginTop: 15 }
});
```

---

### **3. HomeScreen.tsx**

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      setUserName(user.name);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo!</Text>
      <Text style={styles.subtitle}>{userName}</Text>
      
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
  button: { backgroundColor: '#FF3B30', padding: 15, borderRadius: 5, width: '100%' },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' }
});
```

---

### **4. App.tsx (navegação)**

```typescript
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState('Login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    const token = await AsyncStorage.getItem('token');
    setInitialRoute(token ? 'Home' : 'Login');
    setLoading(false);
  };

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Cadastro' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## 📦 DEPENDÊNCIAS NECESSÁRIAS

```bash
cd kaviar-app

# Instalar dependências
npm install @react-navigation/native @react-navigation/native-stack
npm install @react-native-async-storage/async-storage
npm install react-native-screens react-native-safe-area-context

# Expo
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-screens react-native-safe-area-context
```

---

## ✅ CHECKLIST GO/NO-GO DO DIA 1

### **Backend (pré-requisito)**

- [ ] Backend está rodando (`curl https://api.kaviar.com/health`)
- [ ] Endpoint `/api/governance/driver` funciona (cadastro)
- [ ] Endpoint `/api/auth/driver/set-password` funciona
- [ ] Endpoint `/api/auth/driver/login` funciona

### **App Motorista**

- [ ] Dependências instaladas
- [ ] Tela de Login criada
- [ ] Tela de Cadastro criada
- [ ] Tela Home criada
- [ ] Navegação configurada (React Navigation)
- [ ] AsyncStorage configurado

### **Testes Funcionais**

- [ ] Cadastro cria motorista no backend
- [ ] Login retorna token válido
- [ ] Token é salvo no AsyncStorage
- [ ] App navega para Home após login
- [ ] Nome do motorista aparece na Home
- [ ] Botão "Sair" limpa token e volta para Login
- [ ] Reabrir app com token válido vai direto para Home

### **Testes de Erro**

- [ ] Login com senha errada exibe erro
- [ ] Cadastro com email duplicado exibe erro
- [ ] Campos vazios exibem erro

---

## 🚫 CRITÉRIO NO-GO

**Bloqueia Dia 2 se:**
- [ ] Backend não está acessível
- [ ] Login não retorna token
- [ ] Token não persiste no AsyncStorage
- [ ] Navegação não funciona

---

## 🐛 TROUBLESHOOTING

### **Problema: Erro de CORS no app**

**Causa:** Backend não permite requisições do app mobile.

**Solução:**
```bash
# Verificar CORS no backend
grep -r "cors" backend/src/app.ts

# Deve ter:
app.use(cors({ origin: '*' }));
```

---

### **Problema: AsyncStorage não funciona**

**Erro:** `AsyncStorage is not defined`

**Solução:**
```bash
# Reinstalar dependência
npx expo install @react-native-async-storage/async-storage

# Limpar cache
npx expo start -c
```

---

### **Problema: Navegação não funciona**

**Erro:** `Cannot read property 'navigate' of undefined`

**Solução:**
```bash
# Verificar se NavigationContainer está no App.tsx
# Verificar se useNavigation está dentro de um Screen
```

---

## 📊 EVIDÊNCIAS DO DIA 1

**Coletar:**
1. Screenshot da tela de Login
2. Screenshot da tela de Cadastro
3. Screenshot da tela Home (com nome do motorista)
4. Log do backend mostrando cadastro + login
5. Comando curl de teste funcionando

**Salvar em:** `docs/evidencias_dia1/`

---

## 🎯 PRÓXIMO PASSO (DIA 2)

Após concluir Dia 1, o Dia 2 será:

**Objetivo:** Adicionar toggle Online/Offline + envio de localização

**Entregas:**
- Botão toggle na Home
- Envio de localização a cada 10s quando online
- Criar endpoint `POST /api/driver/location` (se não existir)
- Criar endpoint `PATCH /api/driver/status` (se não existir)

---

**FIM DO DIA 1**
