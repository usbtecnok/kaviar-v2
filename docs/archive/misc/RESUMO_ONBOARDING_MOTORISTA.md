# RESUMO EXECUTIVO: Onboarding Motorista

## Status
✅ Build funcionando
✅ App abre sem crash
✅ Tela de cadastro aparece
⚠️ Gaps funcionais identificados

## Gaps por Prioridade

### 🔴 A. ERRO "NÃO FOI POSSÍVEL" AO CADASTRAR BAIRRO

**Causa provável:** Problema de rede/CORS no app mobile

**Verificação realizada:**
```bash
✅ curl https://api.kaviar.com.br/api/neighborhoods/smart-list
# Retorna 200 OK com lista completa de bairros
```

**Causa real:** O backend está funcionando. O problema é no app:
- **CORS:** API pode não estar aceitando requisições do app mobile
- **HTTPS:** Certificado SSL pode estar causando erro no device
- **Timeout:** Conexão lenta no device

**Patch mínimo:**

1. **Adicionar tratamento de erro no app:**
```tsx
// app/(auth)/register.tsx
const loadSmartNeighborhoods = async (coords: { lat: number; lng: number }) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(
      `${API_URL}/api/neighborhoods/smart-list?lat=${coords.lat}&lng=${coords.lng}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    if (data.success) {
      if (data.detected) {
        setDetectedNeighborhood(data.detected);
        setSelectedNeighborhood(data.detected);
      }
      setNeighborhoods(data.nearby.length > 0 ? data.nearby : data.data);
    }
  } catch (error) {
    console.error('Erro ao buscar bairros:', error);
    // Fallback: permitir continuar sem bairro
    Alert.alert(
      'Aviso',
      'Não consegui carregar bairros agora. Você pode continuar sem escolher bairro e definir depois.',
      [{ text: 'OK' }]
    );
    setNeighborhoods([]);
  }
};
```

2. **Verificar CORS no backend (se necessário):**
```typescript
// backend/src/index.ts
app.use(cors({
  origin: true, // Aceitar todas as origens (mobile)
  credentials: true
}));
```

---

### 🟡 B. TERMOS DE USO

**Gap:** Não há checkbox de aceite de termos

**Patch mínimo:**

**Frontend (app/(auth)/register.tsx):**
```tsx
// Após senha, antes do botão
const [acceptedTerms, setAcceptedTerms] = useState(false);

<View style={styles.checkboxRow}>
  <TouchableOpacity 
    style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
    onPress={() => setAcceptedTerms(!acceptedTerms)}
  >
    {acceptedTerms && <Ionicons name="checkmark" size={18} color="#FFF" />}
  </TouchableOpacity>
  <Text style={styles.checkboxLabel}>
    Aceito os termos de uso e política de privacidade
  </Text>
</View>

// Na validação
if (!acceptedTerms) {
  Alert.alert('Erro', 'Você deve aceitar os termos de uso');
  return;
}
```

**Backend (backend/src/routes/driver-auth.ts):**
```typescript
const driverRegisterSchema = z.object({
  // ... campos existentes
  acceptedTerms: z.boolean().refine(val => val === true, {
    message: 'Você deve aceitar os termos de uso'
  })
});

// No create
accepted_terms_at: new Date()
```

---

### 🟢 C. COR DO CARRO

**Gap:** Não coleta cor/modelo do veículo

**Patch mínimo:**

**Frontend:**
```tsx
const [carColor, setCarColor] = useState('');
const [carModel, setCarModel] = useState('');

<Text style={styles.label}>Cor do Carro (opcional)</Text>
<TextInput
  style={styles.input}
  value={carColor}
  onChangeText={setCarColor}
  placeholder="Ex: Branco, Preto, Prata"
/>

<Text style={styles.label}>Modelo do Carro (opcional)</Text>
<TextInput
  style={styles.input}
  value={carModel}
  onChangeText={setCarModel}
  placeholder="Ex: Gol, Uno, HB20"
/>
```

**Backend:**
```typescript
const driverRegisterSchema = z.object({
  // ... campos existentes
  carColor: z.string().optional(),
  carModel: z.string().optional()
});

// No create
car_color: data.carColor || null,
car_model: data.carModel || null
```

**Migration:**
```sql
ALTER TABLE drivers 
ADD COLUMN car_color VARCHAR(50),
ADD COLUMN car_model VARCHAR(100),
ADD COLUMN accepted_terms_at TIMESTAMP;
```

---

### ⚪ D. UPLOAD DE DOCUMENTOS

**Gap:** Não há upload de CNH/documentos

**Solução:** Deixar para fase 2
- Motorista cadastra com status `pending`
- Admin solicita docs via WhatsApp
- Admin aprova após verificação manual

---

## Ordem de Execução

### 1. URGENTE - Investigar erro do bairro
```bash
# Testar endpoint
curl https://api.kaviar.com.br/api/neighborhoods/smart-list

# Se retornar 200, problema é no app (CORS/rede)
# Se retornar erro, problema é no backend
```

### 2. ALTA - Adicionar termos
```bash
# Migration
# Backend: schema + campo
# Frontend: checkbox
```

### 3. MÉDIA - Cor do carro
```bash
# Migration
# Backend: campos opcionais
# Frontend: inputs opcionais
```

### 4. BAIXA - Documentos
```bash
# Fase 2 - processo manual por enquanto
```

## Comandos de Teste

**Testar endpoint de bairros:**
```bash
curl https://api.kaviar.com.br/api/neighborhoods/smart-list
curl "https://api.kaviar.com.br/api/neighborhoods/smart-list?lat=-22.9068&lng=-43.1729"
```

**Ver logs do backend:**
```bash
docker logs kaviar-backend-prod --tail 100 | grep neighborhoods
```

**Testar cadastro completo:**
```bash
curl -X POST https://api.kaviar.com.br/api/auth/driver/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Motorista",
    "email": "teste@example.com",
    "phone": "+5521999999999",
    "password": "senha123"
  }'
```
