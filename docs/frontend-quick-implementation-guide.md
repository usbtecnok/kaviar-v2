# GUIA DE IMPLEMENTAÇÃO RÁPIDA - KAVIAR MVP

## 🚀 SETUP INICIAL (30 minutos)

### 1. Criar Projeto React
```bash
npx create-react-app kaviar-frontend
cd kaviar-frontend
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material
npm install react-router-dom react-query axios
```

### 2. Configurar API Service
```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000
});

// Interceptors obrigatórios
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 3. Configurar Roteamento
```javascript
// src/App.js
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/passenger" element={<PassengerHome />} />
          <Route path="/driver" element={<DriverHome />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* Adicionar todas as 14 rotas MVP */}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

---

## 📱 TEMPLATES DE TELA (Copy & Paste)

### Template Básico de Tela
```javascript
import React from 'react';
import { useQuery, useMutation } from 'react-query';
import { Container, Button, Typography, Alert } from '@mui/material';
import api from '../services/api';

function TemplatePage() {
  // Buscar dados
  const { data, isLoading, error } = useQuery(
    'query-key',
    () => api.get('/api/endpoint')
  );

  // Ação (mutação)
  const mutation = useMutation(
    (payload) => api.post('/api/endpoint', payload),
    {
      onSuccess: () => {
        alert('Sucesso!');
        // navigate ou invalidateQueries
      },
      onError: (error) => {
        alert(error.response?.data?.error || 'Erro');
      }
    }
  );

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <Alert severity="error">Erro ao carregar</Alert>;

  return (
    <Container>
      <Typography variant="h4">Título da Tela</Typography>
      
      <Button 
        onClick={() => mutation.mutate(payload)}
        disabled={mutation.isLoading}
      >
        {mutation.isLoading ? 'Processando...' : 'Ação'}
      </Button>
    </Container>
  );
}

export default TemplatePage;
```

### Template de Formulário
```javascript
import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';

function FormTemplate() {
  const [formData, setFormData] = useState({
    field1: '',
    field2: ''
  });

  const handleSubmit = () => {
    // Validação UX básica
    if (!formData.field1 || !formData.field2) {
      alert('Campos obrigatórios');
      return;
    }

    // Chamar API
    api.post('/api/endpoint', formData);
  };

  return (
    <Box component="form">
      <TextField
        fullWidth
        label="Campo 1"
        value={formData.field1}
        onChange={(e) => setFormData({...formData, field1: e.target.value})}
        margin="normal"
      />
      
      <TextField
        fullWidth
        label="Campo 2"
        value={formData.field2}
        onChange={(e) => setFormData({...formData, field2: e.target.value})}
        margin="normal"
      />
      
      <Button 
        variant="contained" 
        onClick={handleSubmit}
        fullWidth
        sx={{ mt: 2 }}
      >
        Enviar
      </Button>
    </Box>
  );
}
```

---

## 🎯 IMPLEMENTAÇÃO POR PRIORIDADE

### FASE 1: Passageiro (2-3 dias)
```
1. PassengerHome - 6 botões de serviço
2. RideRequest - Formulário origem/destino
3. RideProgress - Status da corrida
4. RideCompletion - Avaliação
5. PassengerProfile - Comunidade atual
```

### FASE 2: Motorista (2-3 dias)
```
1. DriverHome - Toggle disponibilidade
2. RideReceived - Timer + aceitar/recusar
3. RideActive - Iniciar/finalizar
4. DriverEarnings - Lista de ganhos
5. DriverProfile - Comunidade e habilitações
```

### FASE 3: Admin (1-2 dias)
```
1. AdminDashboard - KPIs básicos
2. AdminCommunities - Lista + criar/ativar
3. AdminCommunityChanges - Aprovar/rejeitar
4. AdminReports - Baixar PDF
```

---

## 🔧 SNIPPETS ÚTEIS

### Botão com Confirmação
```javascript
const handleAction = () => {
  if (window.confirm('Confirmar ação?')) {
    mutation.mutate(data);
  }
};
```

### Lista com Loading
```javascript
{isLoading ? (
  <div>Carregando...</div>
) : data?.length === 0 ? (
  <Alert severity="info">Nenhum item encontrado</Alert>
) : (
  data?.map(item => (
    <div key={item.id}>{item.name}</div>
  ))
)}
```

### Botão Condicional
```javascript
{canPerformAction && (
  <Button onClick={handleAction}>
    Ação Disponível
  </Button>
)}
```

### Navegação com Estado
```javascript
const navigate = useNavigate();

const handleNext = () => {
  navigate('/next-page', { 
    state: { data: responseData } 
  });
};
```

---

## 📋 CHECKLIST DIÁRIO

### Antes de Codificar
- [ ] Identificar qual tela MVP está implementando
- [ ] Consultar mapa botão → endpoint
- [ ] Verificar se endpoint existe e funciona
- [ ] Definir estados de loading/erro/sucesso

### Durante Implementação
- [ ] Usar template de tela como base
- [ ] Implementar apenas validações de UX
- [ ] Chamar exatamente um endpoint por botão
- [ ] Tratar todos os estados de UI

### Antes de Commit
- [ ] Testar todos os botões da tela
- [ ] Verificar estados de loading/erro
- [ ] Confirmar que não há lógica de negócio
- [ ] Testar responsividade básica

---

## 🚨 ERROS COMUNS E SOLUÇÕES

### ❌ Erro: Lógica no Frontend
```javascript
// ERRADO
if (user.community === 'active' && user.hasDrivers) {
  showButton();
}

// CORRETO
const { data: canShow } = useQuery('can-show-button',
  () => api.get('/api/v1/rides/can-request')
);
{canShow && <Button />}
```

### ❌ Erro: Cálculo no Frontend
```javascript
// ERRADO
const total = baseAmount + (serviceType === 'TOUR_GUIDE' ? 15 : 0);

// CORRETO
const { data: calculation } = useQuery(['calculate', baseAmount, serviceType],
  () => api.post('/api/v1/special-services/calculate-total', {baseAmount, serviceType})
);
```

### ❌ Erro: Estado Local de Negócio
```javascript
// ERRADO
const [rideStatus, setRideStatus] = useState('pending');

// CORRETO
const { data: ride } = useQuery(['ride', rideId],
  () => api.get(`/api/v1/rides/${rideId}`)
);
const rideStatus = ride?.status;
```

---

## 📞 SUPORTE RÁPIDO

### Dúvida sobre Endpoint?
1. Consultar `docs/frontend-button-endpoint-map.md`
2. Testar endpoint no Postman/curl
3. Verificar payload obrigatório

### Dúvida sobre Tela?
1. Consultar `docs/frontend-mvp-checklist.md`
2. Verificar elementos obrigatórios
3. Usar template como base

### Dúvida sobre Regra?
1. Consultar `docs/frontend-backend-contract.md`
2. Lembrar: "Se é regra de negócio, é do backend"
3. Criar endpoint se necessário

### Regra de Ouro:
**"Quando em dúvida, pergunte ao backend via API"**
