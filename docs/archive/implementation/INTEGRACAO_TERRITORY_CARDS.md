# EXEMPLO DE INTEGRAÇÃO: TerritoryCards no Home do Passageiro

## Arquivo: `frontend-app/src/pages/passenger/Home.jsx`

### Adicionar Import:

```javascript
import TerritoryCards from '../../components/territory/TerritoryCards';
```

### Adicionar State para Feature Flags:

```javascript
const [featureFlags, setFeatureFlags] = useState({
  passenger_territory_cards_v1: false // Default OFF
});

// Buscar feature flags do backend (opcional)
useEffect(() => {
  const fetchFeatureFlags = async () => {
    try {
      const token = localStorage.getItem('token');
      const passengerId = localStorage.getItem('passengerId');
      
      if (!token || !passengerId) return;

      const res = await axios.get(`${API_BASE}/admin/feature-flags/passenger_territory_cards_v1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.enabled) {
        setFeatureFlags(prev => ({ ...prev, passenger_territory_cards_v1: true }));
      }
    } catch (err) {
      console.error('Erro ao buscar feature flags:', err);
    }
  };

  fetchFeatureFlags();
}, []);
```

### Adicionar Componente no JSX:

```javascript
return (
  <Layout>
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Solicitar Corrida
      </Typography>

      {/* ADICIONAR AQUI: Cards de Território */}
      <TerritoryCards 
        passengerId={localStorage.getItem('passengerId')} 
        featureFlags={featureFlags} 
      />

      {/* Resto do componente... */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          {/* Formulário de corrida */}
        </CardContent>
      </Card>
    </Box>
  </Layout>
);
```

---

## Ativação da Feature Flag

### Opção 1: Via Admin Dashboard (Recomendado)

```bash
# Endpoint: PUT /api/admin/feature-flags/passenger_territory_cards_v1
curl -X PUT "http://localhost:3000/api/admin/feature-flags/passenger_territory_cards_v1" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "rolloutPercentage": 100}'
```

### Opção 2: Hardcoded (Desenvolvimento)

```javascript
const [featureFlags, setFeatureFlags] = useState({
  passenger_territory_cards_v1: true // Forçar ON para testes
});
```

---

## Testes Manuais

### 1. Verificar Renderização (Flag OFF)

```javascript
// featureFlags.passenger_territory_cards_v1 = false
// Resultado esperado: Nenhum card visível
```

### 2. Verificar Renderização (Flag ON)

```javascript
// featureFlags.passenger_territory_cards_v1 = true
// Resultado esperado: 3 cards visíveis (GPS, Território, Cobertura)
```

### 3. Verificar Debounce

```javascript
// Capturar GPS 2x em <15s e <100m
// Resultado esperado: Segunda captura ignorada (log no console)
```

### 4. Verificar Endpoints

```bash
# Testar endpoint de histórico
curl "http://localhost:3000/api/public/territory/resolution-history?passengerId=pass_123&limit=10"

# Testar endpoint de cobertura
curl "http://localhost:3000/api/public/territory/coverage-check?driverId=drv_123&pickupLat=-23.5505&pickupLng=-46.6333&dropoffLat=-23.5489&dropoffLng=-46.6388"
```

---

## Rollout Gradual (Opcional)

### Fase 1: Beta (10% dos usuários)

```sql
-- Adicionar passageiros ao allowlist
INSERT INTO feature_flag_allowlist (feature_key, passenger_id, added_at)
VALUES ('passenger_territory_cards_v1', 'pass_123', NOW());
```

### Fase 2: Produção (100% dos usuários)

```bash
curl -X PUT "http://localhost:3000/api/admin/feature-flags/passenger_territory_cards_v1" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{"enabled": true, "rolloutPercentage": 100}'
```

---

## Monitoramento

### Logs a Observar:

```
[TerritoryCards] Debounce: aguardando 15s ou 100m
[TerritoryCards] GPS error: <erro>
[TerritoryCards] Error: <erro>
[public/coverage-check] error: <erro>
[public/resolution-history] error: <erro>
```

### Métricas Sugeridas:

- Taxa de captura GPS bem-sucedida
- Taxa de resolução territorial (GEOFENCE vs FALLBACK vs OUTSIDE)
- Tempo médio de resposta dos endpoints
- Erros 4xx/5xx nos novos endpoints

---

## Próximos Passos

1. ✅ **Documentação completa** (ENDPOINTS_PUBLICOS_PARA_7_CARDS.md)
2. ✅ **2 endpoints públicos implementados** (public.ts)
3. ✅ **Cards 1-3 implementados** (TerritoryCards.jsx)
4. ⏳ **Integrar no Home do passageiro** (seguir este guia)
5. ⏳ **Testar localmente** (curls + navegador)
6. ⏳ **Deploy e ativação gradual** (beta → produção)

---

**Autor:** Kiro (AWS AI Assistant)  
**Versão:** 1.0  
**Status:** ✅ Pronto para integração
