# FIX: REMOVER SELETOR PASSAGEIRO DO APP MOTORISTA

**Data:** 2026-03-07  
**Commit:** `c15db47`  
**Status:** ✅ CORRIGIDO

---

## PROBLEMA

**Sintoma:**
- App Motorista mostra botão "Passageiro" no login
- Fluxos de motorista e passageiro misturados
- UX confusa - usuário pode tentar login como tipo errado

**Impacto:**
- Motorista pode clicar em "Passageiro" por engano
- Login falha ou comportamento inesperado
- Experiência não profissional

---

## CAUSA RAIZ

### Falta de Renderização Condicional

**Seletor sempre renderizado:**
```typescript
// app/(auth)/login.tsx (ANTES)
const [userType, setUserType] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');

<View style={styles.typeSelector}>
  <TouchableOpacity onPress={() => setUserType('PASSENGER')}>
    <Text>Passageiro</Text>
  </TouchableOpacity>
  
  <TouchableOpacity onPress={() => setUserType('DRIVER')}>
    <Text>Motorista</Text>
  </TouchableOpacity>
</View>
```

**Problemas:**
1. Estado inicial sempre `PASSENGER` (errado para app motorista)
2. Seletor sempre renderizado (sem condicional)
3. APP_VARIANT não exposto para runtime

---

## CORREÇÃO MÍNIMA

### 1. Expor Variante no Config

**Arquivo:** `app.config.js`

```javascript
extra: {
  eas: {
    projectId: variantConfig.projectId
  },
  EXPO_PUBLIC_API_URL: 'https://api.kaviar.com.br',
  APP_VARIANT: variant  // ✅ ADICIONAR
}
```

### 2. Usar Variante no Login

**Arquivo:** `app/(auth)/login.tsx`

**Adicionar:**
```typescript
import Constants from 'expo-constants';

const APP_VARIANT = Constants.expoConfig?.extra?.APP_VARIANT || 'driver';
```

**Estado inicial baseado na variante:**
```typescript
// ANTES
const [userType, setUserType] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');

// DEPOIS
const [userType, setUserType] = useState<'PASSENGER' | 'DRIVER'>(
  APP_VARIANT === 'passenger' ? 'PASSENGER' : 'DRIVER'
);
```

**Renderização condicional:**
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

**Antes:**
```
┌─────────────────────────────┐
│ [Passageiro] [Motorista]    │  ❌ Ambos aparecem
│                             │
│ Email: ___________________  │
│ Senha: ___________________  │
│                             │
│ [Entrar]                    │
└─────────────────────────────┘
```

**Depois:**
```
┌─────────────────────────────┐
│ Login Motorista             │  ✅ Sem seletor
│                             │
│ Email: ___________________  │
│ Senha: ___________________  │
│                             │
│ [Entrar]                    │
└─────────────────────────────┘
```

### App Passageiro (variant=passenger)

**Antes e Depois (sem mudança):**
```
┌─────────────────────────────┐
│ [Passageiro] [Motorista]    │  ✅ Seletor mantido
│                             │
│ Email: ___________________  │
│ Senha: ___________________  │
│                             │
│ [Entrar]                    │
└─────────────────────────────┘
```

---

## ARQUIVOS ALTERADOS

```
M  app.config.js                (+1 linha)
M  app/(auth)/login.tsx         (+7 linhas, renderização condicional)
A  DIAGNOSTICO_VARIANTE_LOGIN.md (análise completa)
```

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
4. ✅ Login funciona como motorista
5. ✅ Redireciona para /(driver)/online

### Teste 2: App Passageiro

**Build:**
```bash
APP_VARIANT=passenger eas build --platform android --profile passenger-apk
```

**Validação:**
1. Abrir app Passageiro
2. Ir para tela de login
3. ✅ Seletor "Passageiro/Motorista" DEVE aparecer
4. ✅ Login funciona para ambos os tipos
5. ✅ Redireciona corretamente

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

## COMPORTAMENTO POR VARIANTE

| Variante   | Estado Inicial | Seletor Renderizado? | Login Como     |
|------------|----------------|----------------------|----------------|
| driver     | DRIVER         | ❌ Não               | DRIVER         |
| passenger  | PASSENGER      | ✅ Sim               | Escolha do usuário |

---

## PRINCÍPIOS KAVIAR

✅ **Sem Frankenstein:** Usa variante existente, não cria lógica duplicada  
✅ **Single Source of Truth:** APP_VARIANT define comportamento  
✅ **Minimal Patch:** 8 linhas de código  
✅ **Clean UX:** App motorista mostra apenas fluxo de motorista  
✅ **Surgical Fix:** Corrige causa raiz (falta de condicional)

---

## DOCUMENTAÇÃO

📄 **DIAGNOSTICO_VARIANTE_LOGIN.md** - Análise completa, evidências, fluxos  
📄 **FIX_VARIANTE_LOGIN.md** - Este documento (resumo executivo)

---

## PRÓXIMOS PASSOS

1. ✅ Build novo do app motorista
2. ✅ Validar que seletor não aparece
3. ✅ Testar login como motorista
4. ✅ Verificar UX limpa e profissional

---

## CHECKLIST

### Correção
- [x] Expor APP_VARIANT no config
- [x] Usar variante no login
- [x] Renderização condicional do seletor
- [x] Estado inicial baseado na variante
- [x] Commitar e documentar

### Validação
- [ ] Build app motorista
- [ ] Verificar que seletor não aparece
- [ ] Testar login
- [ ] Confirmar UX limpa
