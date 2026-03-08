# DIAGNÓSTICO CIRÚRGICO: BOTÃO PASSAGEIRO NO APP MOTORISTA

**Data:** 2026-03-07  
**Status:** 🔴 CAUSA RAIZ IDENTIFICADA

---

## SINTOMA

**Problema:**
- App Motorista mostra botão/seletor de "Passageiro" na tela de login
- Fluxos de Motorista e Passageiro estão misturados
- UX confusa - app de motorista não deveria mostrar opções de passageiro

---

## CAUSA RAIZ

### FALTA DE RENDERIZAÇÃO CONDICIONAL BASEADA EM VARIANTE

**Arquivo:** `app/(auth)/login.tsx`

**Problema:**
```typescript
// Estado sempre permite ambos os tipos
const [userType, setUserType] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');

// Seletor sempre renderizado (sem condicional)
<View style={styles.typeSelector}>
  <TouchableOpacity onPress={() => setUserType('PASSENGER')}>
    <Text>Passageiro</Text>
  </TouchableOpacity>
  
  <TouchableOpacity onPress={() => setUserType('DRIVER')}>
    <Text>Motorista</Text>
  </TouchableOpacity>
</View>
```

**Resultado:**
- App Motorista mostra botão "Passageiro" ❌
- App Passageiro mostra botão "Motorista" ❌
- Usuário pode tentar fazer login como tipo errado

---

## EVIDÊNCIAS

### 1. Variante está configurada

**Arquivo:** `app.config.js` (linha 1)
```javascript
const variant = process.env.APP_VARIANT || 'driver';

const config = {
  driver: {
    name: 'Kaviar Motorista',
    slug: 'kaviar-driver',
    package: 'com.kaviar.driver',
    // ...
  },
  passenger: {
    name: 'Kaviar Passageiro',
    slug: 'kaviar-passenger',
    package: 'com.kaviar.passenger',
    // ...
  }
};
```

**Problema:** Variante não estava exposta no `extra` para runtime

### 2. Login não usa variante

**Arquivo:** `app/(auth)/login.tsx` (linhas 15, 53-68)
```typescript
// ❌ Estado padrão é PASSENGER (errado para app motorista)
const [userType, setUserType] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');

// ❌ Seletor sempre renderizado
<View style={styles.typeSelector}>
  <TouchableOpacity onPress={() => setUserType('PASSENGER')}>
    <Text>Passageiro</Text>
  </TouchableOpacity>
  
  <TouchableOpacity onPress={() => setUserType('DRIVER')}>
    <Text>Motorista</Text>
  </TouchableOpacity>
</View>
```

### 3. Index.tsx redireciona corretamente (mas tarde demais)

**Arquivo:** `app/index.tsx` (linhas 19-23)
```typescript
// ✅ Redireciona baseado no userType salvo
if (userType === 'PASSENGER') {
  router.replace('/(passenger)/map');
} else if (userType === 'DRIVER') {
  router.replace('/(driver)/online');
}
```

**Problema:** Só funciona DEPOIS do login. Na tela de login, ainda mostra ambos os botões.

---

## FLUXO ATUAL (QUEBRADO)

### App Motorista

```
1. Usuário abre app Motorista
   └─> Tela de login aparece

2. Tela de login mostra:
   ┌─────────────────────────────┐
   │ [Passageiro] [Motorista]    │  ❌ Ambos aparecem
   │                             │
   │ Email: ___________________  │
   │ Senha: ___________________  │
   │                             │
   │ [Entrar]                    │
   └─────────────────────────────┘

3. Usuário pode clicar em "Passageiro" por engano
   └─> Tenta fazer login como passageiro
   └─> Erro ou comportamento inesperado
```

### App Passageiro

```
1. Usuário abre app Passageiro
   └─> Tela de login aparece

2. Tela de login mostra:
   ┌─────────────────────────────┐
   │ [Passageiro] [Motorista]    │  ❌ Ambos aparecem
   │                             │
   │ Email: ___________________  │
   │ Senha: ___________________  │
   │                             │
   │ [Entrar]                    │
   └─────────────────────────────┘

3. Usuário pode clicar em "Motorista" por engano
   └─> Tenta fazer login como motorista
   └─> Erro ou comportamento inesperado
```

---

## FLUXO ESPERADO (CORRETO)

### App Motorista

```
1. Usuário abre app Motorista
   └─> Tela de login aparece

2. Tela de login mostra:
   ┌─────────────────────────────┐
   │ Login Motorista             │  ✅ Sem seletor
   │                             │
   │ Email: ___________________  │
   │ Senha: ___________________  │
   │                             │
   │ [Entrar]                    │
   └─────────────────────────────┘

3. Login sempre usa tipo DRIVER
   └─> Sem confusão
   └─> UX limpa
```

### App Passageiro

```
1. Usuário abre app Passageiro
   └─> Tela de login aparece

2. Tela de login mostra:
   ┌─────────────────────────────┐
   │ [Passageiro] [Motorista]    │  ✅ Seletor aparece
   │                             │  (permite login como motorista)
   │ Email: ___________________  │
   │ Senha: ___________________  │
   │                             │
   │ [Entrar]                    │
   └─────────────────────────────┘

3. Usuário pode escolher tipo
   └─> Flexibilidade mantida
```

---

## CORREÇÃO MÍNIMA

### 1. Expor variante no app.config.js

**Arquivo:** `app.config.js`

**Adicionar:**
```javascript
extra: {
  eas: {
    projectId: variantConfig.projectId
  },
  EXPO_PUBLIC_API_URL: 'https://api.kaviar.com.br',
  APP_VARIANT: variant  // ✅ ADICIONAR
}
```

### 2. Usar variante no login.tsx

**Arquivo:** `app/(auth)/login.tsx`

**Adicionar import:**
```typescript
import Constants from 'expo-constants';

const APP_VARIANT = Constants.expoConfig?.extra?.APP_VARIANT || 'driver';
```

**Corrigir estado inicial:**
```typescript
// ANTES
const [userType, setUserType] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');

// DEPOIS
const [userType, setUserType] = useState<'PASSENGER' | 'DRIVER'>(
  APP_VARIANT === 'passenger' ? 'PASSENGER' : 'DRIVER'
);
```

**Renderizar seletor condicionalmente:**
```typescript
// ANTES
<View style={styles.typeSelector}>
  {/* Sempre renderizado */}
</View>

// DEPOIS
{APP_VARIANT === 'passenger' && (
  <View style={styles.typeSelector}>
    {/* Só renderiza no app passageiro */}
  </View>
)}
```

---

## RESULTADO

### App Motorista (variant=driver)

```typescript
APP_VARIANT = 'driver'

// Estado inicial
userType = 'DRIVER'  ✅

// Seletor renderizado?
APP_VARIANT === 'passenger' → false
→ Seletor NÃO renderiza  ✅

// Login
loginFn = authApi.loginDriver  ✅
```

### App Passageiro (variant=passenger)

```typescript
APP_VARIANT = 'passenger'

// Estado inicial
userType = 'PASSENGER'  ✅

// Seletor renderizado?
APP_VARIANT === 'passenger' → true
→ Seletor renderiza  ✅

// Login
loginFn = authApi.loginPassenger ou authApi.loginDriver (escolha do usuário)  ✅
```

---

## ARQUIVOS ENVOLVIDOS

### Corrigidos
- `app.config.js` - Expor APP_VARIANT no extra
- `app/(auth)/login.tsx` - Usar variante para estado inicial e renderização condicional

### Corretos (não mexer)
- `app/(auth)/register.tsx` - Específico de motorista (tem veículo, CPF)
- `app/index.tsx` - Redireciona corretamente baseado em userType salvo
- `app/_layout.tsx` - Layout genérico (correto)

---

## VALIDAÇÃO

### Teste 1: App Motorista

**Build:**
```bash
APP_VARIANT=driver eas build --platform android --profile driver-apk
```

**Validação:**
1. Abrir app Motorista
2. Ir para tela de login
3. ✅ Seletor "Passageiro/Motorista" NÃO deve aparecer
4. ✅ Login deve funcionar como motorista
5. ✅ Após login, redireciona para /(driver)/online

### Teste 2: App Passageiro

**Build:**
```bash
APP_VARIANT=passenger eas build --platform android --profile passenger-apk
```

**Validação:**
1. Abrir app Passageiro
2. Ir para tela de login
3. ✅ Seletor "Passageiro/Motorista" DEVE aparecer
4. ✅ Login deve funcionar para ambos os tipos
5. ✅ Após login, redireciona corretamente

### Teste 3: Desenvolvimento Local

**Motorista:**
```bash
APP_VARIANT=driver npx expo start
```

**Passageiro:**
```bash
APP_VARIANT=passenger npx expo start
```

---

## PRINCÍPIOS KAVIAR

✅ **Sem Frankenstein:** Usa variante existente, não cria lógica duplicada  
✅ **Single Source of Truth:** APP_VARIANT define comportamento  
✅ **Minimal Patch:** 3 mudanças (1 linha no config, 2 no login)  
✅ **Clean UX:** App motorista mostra apenas fluxo de motorista  
✅ **Surgical Fix:** Corrige causa raiz (falta de condicional)

---

## RESUMO

**Problema:** Seletor de tipo sempre renderizado  
**Causa:** Falta de renderização condicional baseada em APP_VARIANT  
**Correção:** Expor variante + renderizar seletor apenas no app passageiro  
**Impacto:** 3 linhas de código  
**Resultado:** App motorista limpo, sem opções de passageiro
