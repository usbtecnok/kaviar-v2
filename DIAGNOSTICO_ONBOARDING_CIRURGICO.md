# DIAGNÓSTICO CIRÚRGICO: FLUXO ONBOARDING MOTORISTA

**Data:** 2026-03-07  
**Status:** 3 PROBLEMAS CRÍTICOS IDENTIFICADOS

---

## PROBLEMA 1: REGISTRO NÃO REDIRECIONA PARA UPLOAD DE DOCUMENTOS

### Causa Raiz
**Arquivo:** `app/(auth)/register.tsx` linha 267

```typescript
Alert.alert(
  'Cadastro Realizado!',
  `${territoryMsg}\n\nAguarde aprovação do admin.`,
  [{
    text: 'OK',
    onPress: () => router.replace('/(driver)/online')  // ❌ ERRADO
  }]
);
```

**Problema:** Após cadastro, motorista vai direto para tela "online" sem enviar documentos.

**Impacto:**
- Motorista nunca vê tela de upload de documentos
- Admin não consegue aprovar (faltam documentos)
- Fluxo de aprovação quebrado

### Correção
```typescript
onPress: () => router.replace('/(driver)/documents')  // ✅ CORRETO
```

---

## PROBLEMA 2: BACKEND NÃO CRIA REGISTROS DE DOCUMENTOS

### Causa Raiz
**Arquivo:** `backend/src/routes/driver-auth.ts` linhas 37-150

Backend cria:
- ✅ `drivers` table (status: 'pending')
- ✅ `consents` table (LGPD)
- ✅ `driver_verifications` table (status: 'PENDING')
- ❌ **NÃO cria** `driver_documents` table

**Problema:** Admin espera 6 documentos em `driver_documents` para aprovar, mas tabela está vazia.

**Impacto:**
- `evaluateEligibility()` retorna `isEligible = false` (faltam 6 docs)
- Admin não consegue aprovar motorista
- Motorista fica preso em "pending" eternamente

### Análise do Fluxo de Aprovação
**Arquivo:** `backend/src/services/driver-verification.ts` linhas 50-120

```typescript
const requiredDocs = ['CPF', 'RG', 'CNH', 'PROOF_OF_ADDRESS', 'VEHICLE_PHOTO', 'BACKGROUND_CHECK'];

for (const docType of requiredDocs) {
  const doc = documents.find(d => d.type === docType);
  const isDocValid = doc && (doc.status === 'VERIFIED' || doc.status === 'SUBMITTED');
  
  if (!doc || !isDocValid) {
    missingRequirements.push(docType);  // ❌ Todos os 6 docs faltando
  }
}

const isEligible = missingRequirements.length === 0;  // ❌ Sempre false
```

**Resultado:** Motorista NUNCA é elegível para aprovação.

### Correção
**Opção A (RECOMENDADA):** Redirecionar para upload após registro
- Motorista envia documentos via app
- Backend persiste em `driver_documents`
- Admin aprova quando docs estiverem OK

**Opção B:** Backend cria placeholders
- Criar 6 registros em `driver_documents` com status 'pending'
- Motorista envia depois
- Mais complexo, não recomendado

---

## PROBLEMA 3: "ESQUECI MINHA SENHA" NÃO FUNCIONA NO ANDROID

### Causa Raiz
**Arquivo:** `app/(auth)/login.tsx` linha 42

```typescript
const handleForgotPassword = () => {
  Alert.prompt(  // ❌ NÃO EXISTE NO ANDROID
    'Esqueci minha senha',
    'Digite seu email e nova senha',
    [...]
  );
};
```

**Problema:** `Alert.prompt()` só existe no iOS. No Android, o botão não faz nada.

**Impacto:**
- Motorista não consegue recuperar senha no Android
- UX quebrada

### Correção
Criar tela dedicada de recuperação de senha:
- Nova rota: `app/(auth)/forgot-password.tsx`
- Form com email + nova senha
- Botão "Esqueci minha senha" navega para essa tela

---

## CORREÇÕES NECESSÁRIAS

### 1. Redirecionar para Upload de Documentos

**Arquivo:** `app/(auth)/register.tsx`

```typescript
// Linha 267
Alert.alert(
  'Cadastro Realizado!',
  `${territoryMsg}\n\nAgora envie seus documentos para aprovação.`,
  [{
    text: 'Enviar Documentos',
    onPress: () => router.replace('/(driver)/documents')
  }]
);
```

### 2. Criar Tela de Recuperação de Senha

**Arquivo:** `app/(auth)/forgot-password.tsx` (CRIAR)

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 'https://api.kaviar.com.br';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email || !newPassword) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'Senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/driver/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Sucesso',
          'Senha redefinida! Faça login com a nova senha.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Erro', data.error || 'Erro ao redefinir senha');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível redefinir a senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar Senha</Text>
      <Text style={styles.subtitle}>Digite seu email e a nova senha</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="seu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Nova Senha</Text>
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Mínimo 6 caracteres"
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleReset}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Redefinindo...' : 'Redefinir Senha'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>Voltar para Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backText: {
    color: '#007AFF',
    fontSize: 14,
  },
});
```

### 3. Atualizar Login para Navegar para Tela de Recuperação

**Arquivo:** `app/(auth)/login.tsx`

```typescript
// Substituir handleForgotPassword (linha 42)
const handleForgotPassword = () => {
  router.push('/(auth)/forgot-password');
};
```

---

## VALIDAÇÃO PÓS-CORREÇÃO

### Teste 1: Fluxo de Registro
1. ✅ Cadastrar novo motorista
2. ✅ Após "Cadastro Realizado", clicar "Enviar Documentos"
3. ✅ App abre tela `/(driver)/documents`
4. ✅ Motorista vê 6 cards de documentos
5. ✅ Motorista seleciona e envia documentos
6. ✅ Backend persiste em `driver_documents` com status 'SUBMITTED'

### Teste 2: Fluxo de Aprovação
1. ✅ Admin acessa painel
2. ✅ Admin vê motorista com 6 documentos
3. ✅ Admin aprova documentos
4. ✅ `evaluateEligibility()` retorna `isEligible = true`
5. ✅ Admin aprova motorista
6. ✅ Motorista recebe status 'approved'

### Teste 3: Recuperação de Senha
1. ✅ Clicar "Esqueci minha senha" no login
2. ✅ App navega para `/(auth)/forgot-password`
3. ✅ Preencher email + nova senha
4. ✅ Clicar "Redefinir Senha"
5. ✅ Backend atualiza senha
6. ✅ Voltar para login e entrar com nova senha

---

## ORDEM DE IMPLEMENTAÇÃO

1. **Criar tela de recuperação de senha** (novo arquivo)
2. **Atualizar login** (1 linha)
3. **Atualizar registro** (1 linha + texto)
4. **Testar fluxo completo**

---

## COMANDOS

```bash
cd /home/goes/kaviar

# 1. Criar tela de recuperação de senha
# (criar arquivo app/(auth)/forgot-password.tsx com código acima)

# 2. Atualizar login.tsx
# (substituir handleForgotPassword)

# 3. Atualizar register.tsx
# (mudar router.replace para /documents)

# 4. Build novo APK
eas build --platform android --profile driver-apk

# 5. Testar no celular
```

---

## RESUMO

**3 problemas críticos:**
1. ❌ Registro não redireciona para upload de documentos
2. ❌ Admin não consegue aprovar (faltam documentos)
3. ❌ "Esqueci minha senha" não funciona no Android

**3 correções simples:**
1. ✅ Mudar 1 linha em `register.tsx` (router.replace)
2. ✅ Criar tela `forgot-password.tsx` (arquivo novo)
3. ✅ Mudar 1 linha em `login.tsx` (router.push)

**Resultado:**
- Fluxo de onboarding completo
- Admin consegue aprovar motoristas
- Recuperação de senha funciona no Android
