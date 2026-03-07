# Diagnóstico: Onboarding Motorista - Gaps Funcionais

## Status Atual
✅ APK instala e abre
✅ Crash inicial resolvido
✅ Tela de login/cadastro aparece
❌ Gaps funcionais no cadastro

## Análise do Fluxo Atual

### O que o app ESTÁ fazendo:
1. ✅ Coleta dados básicos (nome, email, telefone, senha)
2. ✅ Solicita localização GPS
3. ✅ Tenta buscar bairros via `/api/neighborhoods/smart-list`
4. ✅ Permite seleção de bairro
5. ✅ Envia cadastro para `/api/auth/driver/register`
6. ✅ Auto-login com token retornado

### O que o app NÃO está fazendo:
1. ❌ Aceite de termos de uso
2. ❌ Coleta de cor do carro
3. ❌ Upload de documentos (CNH, foto do carro, etc)

## Gaps Identificados

### A. ERRO AO CADASTRAR BAIRRO (PRIORIDADE MÁXIMA)

**Sintoma:** "não foi possível" ao tentar cadastrar bairro

**Causa provável:**
- Endpoint `/api/neighborhoods/smart-list` retorna erro 500
- Possível problema: `territory-service.ts` não encontrado ou com erro

**Verificação necessária:**
```bash
# Verificar se o serviço existe
ls -la backend/src/services/territory-service.ts

# Verificar logs do backend
docker logs kaviar-backend-prod | grep "neighborhoods/smart-list"
```

**Patch mínimo:**
Se o serviço não existir, criar fallback simples:

```typescript
// backend/src/routes/neighborhoods-smart.ts
router.get('/smart-list', async (req: Request, res: Response) => {
  try {
    // Fallback: retornar lista simples de bairros ativos
    const neighborhoods = await prisma.neighborhoods.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        city: true,
        zone: true,
      },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });

    return res.status(200).json({
      success: true,
      data: neighborhoods,
      detected: null,
      nearby: [],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar lista de bairros',
    });
  }
});
```

---

### B. TERMOS DE USO (PRIORIDADE ALTA)

**Gap:** Não há aceite de termos no fluxo de cadastro

**Impacto:** Compliance legal - motorista precisa aceitar termos antes de operar

**Patch mínimo:**

1. Adicionar campo no schema:
```typescript
// backend/src/routes/driver-auth.ts
const driverRegisterSchema = z.object({
  // ... campos existentes
  acceptedTerms: z.boolean().refine(val => val === true, {
    message: 'Você deve aceitar os termos de uso'
  })
});
```

2. Adicionar no frontend (register.tsx):
```tsx
// Após campo de senha
const [acceptedTerms, setAcceptedTerms] = useState(false);

// No JSX
<View style={styles.termsContainer}>
  <TouchableOpacity 
    style={styles.checkbox}
    onPress={() => setAcceptedTerms(!acceptedTerms)}
  >
    {acceptedTerms && <Ionicons name="checkmark" size={20} color="#FF6B35" />}
  </TouchableOpacity>
  <Text style={styles.termsText}>
    Aceito os <Text style={styles.termsLink}>termos de uso</Text>
  </Text>
</View>

// Na validação do step 1
if (!acceptedTerms) {
  Alert.alert('Erro', 'Você deve aceitar os termos de uso');
  return;
}

// No payload de registro
registerPayload.acceptedTerms = true;
```

---

### C. COR DO CARRO (PRIORIDADE MÉDIA)

**Gap:** Não coleta cor do veículo

**Impacto:** Passageiro não consegue identificar o carro facilmente

**Patch mínimo:**

1. Adicionar campo no schema:
```typescript
const driverRegisterSchema = z.object({
  // ... campos existentes
  carColor: z.string().optional(),
  carModel: z.string().optional()
});
```

2. Adicionar no banco (migration):
```sql
ALTER TABLE drivers 
ADD COLUMN car_color VARCHAR(50),
ADD COLUMN car_model VARCHAR(100);
```

3. Adicionar no frontend (step 1):
```tsx
<Text style={styles.label}>Cor do Carro (opcional)</Text>
<TextInput
  style={styles.input}
  value={carColor}
  onChangeText={setCarColor}
  placeholder="Ex: Branco, Preto, Prata"
/>
```

---

### D. UPLOAD DE DOCUMENTOS (PRIORIDADE BAIXA)

**Gap:** Não há upload de CNH, foto do carro, etc

**Impacto:** Admin precisa solicitar documentos manualmente

**Solução:** Implementar em fase posterior
- Requer integração com S3/storage
- Requer validação de documentos
- Pode ser feito após aprovação inicial do motorista

**Alternativa temporária:**
- Motorista cadastra com status `pending`
- Admin solicita documentos via WhatsApp
- Admin aprova manualmente após verificação

---

## Ordem de Correção

### 1. URGENTE - Erro do bairro
```bash
# Verificar serviço
cd /home/goes/kaviar/backend
grep -r "getSmartNeighborhoodList" src/

# Se não existir, criar fallback no endpoint
```

### 2. ALTA - Termos de uso
```bash
# Adicionar checkbox no frontend
# Adicionar validação no backend
```

### 3. MÉDIA - Cor do carro
```bash
# Adicionar campos opcionais
# Migration no banco
```

### 4. BAIXA - Documentos
```bash
# Deixar para fase 2
# Usar processo manual temporariamente
```

## Próximos Passos

1. **Investigar erro do bairro:**
   ```bash
   cd /home/goes/kaviar/backend
   ls -la src/services/territory-service.ts
   ```

2. **Se não existir, criar fallback simples**

3. **Adicionar termos de uso no frontend**

4. **Testar cadastro completo no device**
