# CONTRATO FRONTEND ↔ BACKEND - KAVIAR

## 🎯 PRINCÍPIOS FUNDAMENTAIS

### 1. ÚNICA FONTE DE VERDADE
```
BACKEND = Única fonte de verdade
FRONTEND = Interface de usuário apenas

❌ Frontend NÃO decide:
- Quem pode aceitar corrida
- Valores de bônus
- Status de comunidade
- Permissões de usuário
- Regras de negócio

✅ Frontend APENAS:
- Coleta dados do usuário
- Chama endpoints
- Exibe respostas do backend
- Trata estados de UI
```

### 2. FLUXO DE DECISÃO
```
USUÁRIO INTERAGE → FRONTEND VALIDA UX → BACKEND DECIDE → FRONTEND EXIBE
```

### 3. RESPONSABILIDADES

#### BACKEND (Decide tudo)
- ✅ Validações de negócio
- ✅ Cálculos de valores
- ✅ Regras de comunidade
- ✅ Permissões de usuário
- ✅ Estados de corrida
- ✅ Auditoria completa

#### FRONTEND (Exibe tudo)
- ✅ Validações de UX (campos obrigatórios, formatos)
- ✅ Estados de loading/erro/sucesso
- ✅ Navegação entre telas
- ✅ Coleta de dados do usuário

---

## 📋 REGRAS OBRIGATÓRIAS

### R1. CADA BOTÃO = UM ENDPOINT
```javascript
// ✅ CORRETO
<Button onClick={() => api.post('/api/v1/rides', rideData)}>
  Pedir Corrida
</Button>

// ❌ ERRADO - Lógica no frontend
<Button onClick={() => {
  if (user.community === 'active' && hasDrivers) {
    api.post('/api/v1/rides', rideData);
  }
}}>
```

### R2. CONDICIONAIS VÊM DO BACKEND
```javascript
// ✅ CORRETO - Backend decide
const { data: canRequestRide } = useQuery('can-request-ride', 
  () => api.get('/api/v1/rides/can-request')
);

{canRequestRide && (
  <Button>Pedir Corrida</Button>
)}

// ❌ ERRADO - Frontend decide
{user.community.status === 'active' && (
  <Button>Pedir Corrida</Button>
)}
```

### R3. VALORES VÊM DO BACKEND
```javascript
// ✅ CORRETO
const { data: ridePrice } = useQuery('ride-price',
  () => api.post('/api/v1/special-services/calculate-total', {
    base_amount: 25.00,
    service_type: 'TOUR_GUIDE'
  })
);

// ❌ ERRADO - Cálculo no frontend
const ridePrice = baseAmount + (serviceType === 'TOUR_GUIDE' ? 15 : 0);
```

### R4. ESTADOS VÊM DO BACKEND
```javascript
// ✅ CORRETO
const { data: ride } = useQuery('current-ride',
  () => api.get(`/api/v1/rides/${rideId}`)
);

const canCancel = ride?.status === 'pending' || ride?.status === 'accepted';

// ❌ ERRADO - Estado no frontend
const [canCancel, setCanCancel] = useState(true);
```

---

## 🔒 VALIDAÇÕES E SEGURANÇA

### VALIDAÇÕES FRONTEND (Apenas UX)
```javascript
// ✅ Permitido - Melhora UX
const isFormValid = pickup && destination && pickup.length > 3;

<Button disabled={!isFormValid}>
  Confirmar
</Button>

// ❌ Proibido - Regra de negócio
const canCreateRide = user.community.active && user.hasPayment;
```

### CONFIRMAÇÕES OBRIGATÓRIAS
```javascript
// ✅ Obrigatório para ações sensíveis
const handleApproveChange = () => {
  if (confirm('Aprovar mudança de comunidade?')) {
    api.post(`/api/v1/community-change/${id}/approve`, reviewData);
  }
};

// ✅ Obrigatório para valores altos
const handleSpecialService = () => {
  if (confirm(`Confirmar serviço por R$ ${totalAmount}?`)) {
    api.post('/api/v1/rides', rideData);
  }
};
```

---

## 📱 PADRÕES DE UX

### ESTADOS DE INTERFACE
```javascript
// ✅ Padrão obrigatório
function RideButton() {
  const { data, isLoading, error } = useMutation(createRide);
  
  if (isLoading) return <Button disabled>Criando...</Button>;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  
  return <Button onClick={handleCreate}>Pedir Corrida</Button>;
}
```

### FEEDBACK VISUAL
```javascript
// ✅ Sempre mostrar resultado
const createRideMutation = useMutation(api.createRide, {
  onSuccess: () => {
    showSuccess('Corrida criada com sucesso!');
    navigate('/ride-progress');
  },
  onError: (error) => {
    showError(error.response?.data?.error || 'Erro ao criar corrida');
  }
});
```

### NAVEGAÇÃO CONDICIONAL
```javascript
// ✅ Baseada na resposta do backend
const handleRideCreated = (response) => {
  const { ride } = response.data;
  
  if (ride.service_type === 'STANDARD_RIDE') {
    navigate('/ride-progress');
  } else {
    navigate('/service-confirmation', { state: { ride } });
  }
};
```

---

## 🌐 ESTRUTURA DE API

### PADRÃO DE RESPOSTA
```javascript
// ✅ Todas as respostas seguem este padrão
{
  "success": true,
  "data": { /* dados */ },
  "message": "Operação realizada com sucesso"
}

// Em caso de erro
{
  "success": false,
  "error": "Mensagem de erro clara",
  "code": "ERROR_CODE"
}
```

### TRATAMENTO DE ERROS
```javascript
// ✅ Padrão obrigatório
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || 'Erro interno';
    
    // Mostrar erro para usuário
    showError(message);
    
    // Redirect se não autorizado
    if (error.response?.status === 401) {
      navigate('/login');
    }
    
    return Promise.reject(error);
  }
);
```

---

## 📊 DADOS E CACHE

### CACHE INTELIGENTE
```javascript
// ✅ Configuração obrigatória
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});
```

### INVALIDAÇÃO DE CACHE
```javascript
// ✅ Invalidar após mutações
const approveMutation = useMutation(api.approveChange, {
  onSuccess: () => {
    queryClient.invalidateQueries('pending-changes');
    queryClient.invalidateQueries('community-stats');
  }
});
```

---

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### ESTRUTURA DE PASTAS
```
src/
├── components/
│   ├── passenger/     # Telas do passageiro
│   ├── driver/        # Telas do motorista
│   ├── admin/         # Telas administrativas
│   └── common/        # Componentes compartilhados
├── services/
│   └── api.js         # ÚNICA fonte de comunicação
├── hooks/             # Custom hooks para lógica de UI
└── utils/             # Utilitários (formatação, validação UX)
```

### SERVIÇO DE API
```javascript
// ✅ Organização obrigatória por domínio
export const ridesAPI = {
  create: (data) => api.post('/api/v1/rides', data),
  accept: (id, driverId) => api.post(`/api/v1/rides/${id}/accept`, {driver_id: driverId}),
  cancel: (id, reason) => api.post(`/api/v1/rides/${id}/cancel`, {reason})
};

export const communityChangeAPI = {
  request: (data) => api.post('/api/v1/community-change/request', data),
  approve: (id, reviewData) => api.post(`/api/v1/community-change/${id}/approve`, reviewData)
};
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Antes de Começar
- [ ] Ler este contrato completamente
- [ ] Configurar ambiente com React + Material-UI + React Query
- [ ] Configurar interceptors de API
- [ ] Implementar tratamento de erros global

### Durante Desenvolvimento
- [ ] Cada botão chama exatamente um endpoint
- [ ] Nenhuma lógica de negócio no frontend
- [ ] Todas as condicionais baseadas em respostas da API
- [ ] Estados de loading/erro/sucesso implementados
- [ ] Confirmações para ações sensíveis

### Antes de Entregar
- [ ] Todas as 14 telas MVP implementadas
- [ ] Todos os endpoints do mapa funcionando
- [ ] Zero hardcode de regras de negócio
- [ ] Responsivo (mobile + desktop)
- [ ] Tratamento de erros funcionando

---

## 🚨 AVISOS CRÍTICOS

### ❌ NUNCA FAÇA
```javascript
// ❌ Decidir regras no frontend
if (user.type === 'driver' && service === 'TOUR_GUIDE') {
  // Lógica de habilitação
}

// ❌ Calcular valores no frontend
const bonus = baseAmount * 0.2;

// ❌ Hardcode de permissões
if (user.role === 'admin') {
  showAdminButtons();
}

// ❌ Estados de corrida no frontend
const [rideStatus, setRideStatus] = useState('pending');
```

### ✅ SEMPRE FAÇA
```javascript
// ✅ Perguntar ao backend
const { data: canAcceptRide } = useQuery(
  ['can-accept', rideId, driverId],
  () => api.get(`/api/v1/rides/${rideId}/can-accept/${driverId}`)
);

// ✅ Usar valores do backend
const { data: calculation } = useQuery(
  ['ride-price', baseAmount, serviceType],
  () => api.post('/api/v1/special-services/calculate-total', {baseAmount, serviceType})
);

// ✅ Respeitar permissões do backend
const { data: userPermissions } = useQuery('user-permissions',
  () => api.get('/api/v1/auth/permissions')
);
```

---

## 📞 SUPORTE

### Em caso de dúvida:
1. **Consulte este contrato primeiro**
2. **Verifique o mapa botão → endpoint**
3. **Teste o endpoint diretamente**
4. **Se ainda houver dúvida, pergunte especificamente sobre o endpoint**

### Regra de ouro:
**"Se você está pensando em implementar uma regra no frontend, provavelmente deveria ser no backend"**
