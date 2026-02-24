# 🚀 KAVIAR APP - Implementação de Navegação Login → Registro

**Data**: 2026-02-21  
**Tarefa**: Adicionar botão "Criar conta" no login + configurar API URL

---

## ✅ MUDANÇAS IMPLEMENTADAS

### 1. Login.tsx - Botão de Navegação
**Arquivo**: `app/(auth)/login.tsx`

**Mudanças**:
- ✅ Adicionado `TouchableOpacity` com link "Criar conta de passageiro"
- ✅ Navegação via `router.push('/(auth)/register')`
- ✅ Estilos minimalistas (azul iOS, underline)
- ✅ Posicionado abaixo do botão "Entrar"

**Linhas modificadas**: 7 linhas adicionadas (código + estilos)

### 2. Configuração de API
**Arquivo**: `.env` (criado)

**Conteúdo**:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```

**⚠️ AÇÃO NECESSÁRIA**:
Você precisa substituir `192.168.1.100` pelo IP real da sua máquina na rede local.

**Como descobrir seu IP**:
```bash
# Linux/Mac
ip addr show | grep "inet " | grep -v 127.0.0.1

# Ou
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Procure pelo IP que começa com `192.168.x.x` ou `10.0.x.x`.

---

## 📋 PATCH COMPLETO

```diff
diff --git a/kaviar-app/app/(auth)/login.tsx b/kaviar-app/app/(auth)/login.tsx
index 5d2ffbb..04c58a8 100644
--- a/kaviar-app/app/(auth)/login.tsx
+++ b/kaviar-app/app/(auth)/login.tsx
@@ -79,6 +79,13 @@ export default function Login() {
         title={loading ? 'Entrando...' : 'Entrar'}
         onPress={handleLogin}
       />
+      
+      <TouchableOpacity
+        style={styles.registerLink}
+        onPress={() => router.push('/(auth)/register')}
+      >
+        <Text style={styles.registerText}>Criar conta de passageiro</Text>
+      </TouchableOpacity>
     </View>
   );
 }
@@ -119,4 +126,14 @@ const styles = StyleSheet.create({
     color: '#FFFFFF',
     fontWeight: '600',
   },
+  registerLink: {
+    marginTop: 16,
+    padding: 12,
+    alignItems: 'center',
+  },
+  registerText: {
+    fontSize: 16,
+    color: '#007AFF',
+    textDecorationLine: 'underline',
+  },
 });
```

---

## 🧪 COMO TESTAR

### Passo 1: Configurar IP da API
```bash
cd /home/goes/kaviar/kaviar-app

# Editar .env e colocar o IP correto da sua máquina
nano .env
# ou
vim .env
```

Exemplo:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000/api
```

### Passo 2: Garantir que o backend está rodando
```bash
# Em outro terminal, na pasta kaviar-backend
cd /home/goes/kaviar/kaviar-backend
npm run dev

# Deve mostrar: Server running on port 3000
```

### Passo 3: Rodar o app Expo
```bash
cd /home/goes/kaviar/kaviar-app
npx expo start --lan --clear
```

### Passo 4: Abrir no Expo Go
1. Escanear o QR code com o Expo Go
2. App abre na tela de login
3. **Verificar**: Abaixo do botão "Entrar" deve aparecer o link azul "Criar conta de passageiro"
4. **Tocar** no link
5. **Resultado esperado**: Navega para a tela de registro (`/(auth)/register`)

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] Arquivo `.env` criado com IP correto
- [ ] Backend rodando na porta 3000
- [ ] App abre no Expo Go via LAN
- [ ] Tela de login mostra o link "Criar conta de passageiro"
- [ ] Ao tocar no link, navega para tela de registro
- [ ] Não há erros no console do Expo

---

## 🔧 TROUBLESHOOTING

### Problema: "Network Error" ao tentar login
**Causa**: IP incorreto no `.env` ou backend não está rodando  
**Solução**:
1. Verificar IP da máquina: `ip addr show`
2. Verificar backend: `curl http://localhost:3000/api/health`
3. Atualizar `.env` com IP correto
4. Reiniciar Expo: `npx expo start --lan --clear`

### Problema: Link não aparece
**Causa**: Cache do Expo  
**Solução**:
```bash
npx expo start --clear
```

### Problema: "Cannot find module env.ts"
**Causa**: Arquivo `.env` não foi lido  
**Solução**:
1. Verificar que `.env` está na raiz de `kaviar-app/`
2. Reiniciar Expo com `--clear`

---

## 📊 RESUMO TÉCNICO

| Item | Valor |
|------|-------|
| Arquivos modificados | 1 (`login.tsx`) |
| Arquivos criados | 2 (`.env`, este doc) |
| Linhas adicionadas | 17 |
| Componentes novos | 0 |
| Dependências novas | 0 |
| Breaking changes | 0 |
| Tempo estimado de teste | 2 minutos |

---

## 🎯 GARANTIAS

- ✅ Mudança mínima (7 linhas de código + estilos)
- ✅ Sem reestruturação
- ✅ Sem Frankenstein
- ✅ Navegação funcional via `expo-router`
- ✅ UX não alterada (apenas adição de link)
- ✅ API URL configurável via `.env`
- ✅ Fallback para localhost mantido

---

## 📝 NOTAS

- O link "Criar conta de passageiro" está sempre visível (não depende do toggle Passageiro/Motorista)
- A tela de registro (`register.tsx`) já existe como placeholder
- Próximo passo: implementar lógica de registro (aguardando autorização)

---

**Implementado por**: Kiro  
**Status**: ✅ Pronto para teste  
**Próxima ação**: Testar no Expo Go
