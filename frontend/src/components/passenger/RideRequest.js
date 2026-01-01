import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import {
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Alert,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';
import { LocationOn, MyLocation, Warning } from '@mui/icons-material';
import { ridesAPI, specialServicesAPI } from '../../services/api';

/**
 * TELA DE PEDIDO DE CORRIDA
 * 
 * Coleta origem/destino e cria corrida via backend.
 * Respeita service_type selecionado na tela anterior.
 */
function RideRequest() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { serviceType = 'STANDARD_RIDE', isEmergency = false } = location.state || {};
  
  const [formData, setFormData] = useState({
    pickup_location: '',
    destination: '',
    service_notes: ''
  });
  
  const [calculatedTotal, setCalculatedTotal] = useState(null);
  const [showExternalOption, setShowExternalOption] = useState(false);

  // Buscar configurações do serviço selecionado
  const { data: serviceConfigs } = useQuery(
    'service-configs',
    specialServicesAPI.getConfigs,
    {
      select: (response) => response.data.configs
    }
  );

  // Calcular valor total quando há valor base
  const calculateTotalMutation = useMutation(
    ({ baseAmount, serviceType }) => 
      specialServicesAPI.calculateTotal(baseAmount, serviceType),
    {
      onSuccess: (response) => {
        setCalculatedTotal(response.data.calculation);
      }
    }
  );

  // Criar corrida
  const createRideMutation = useMutation(
    (rideData) => ridesAPI.create(rideData),
    {
      onSuccess: (response) => {
        const ride = response.data.data;
        
        if (serviceType === 'STANDARD_RIDE') {
          navigate('/passenger/ride-in-progress', { 
            state: { rideId: ride.id } 
          });
        } else {
          navigate('/passenger/service-confirmation', { 
            state: { 
              rideId: ride.id,
              serviceType,
              calculatedTotal 
            } 
          });
        }
      },
      onError: (error) => {
        const errorMsg = error.response?.data?.error || 'Erro ao criar corrida';
        
        // Se não há motoristas na comunidade, mostrar opção externa
        if (errorMsg.includes('motorista') && errorMsg.includes('comunidade')) {
          setShowExternalOption(true);
        }
      }
    }
  );

  // Permitir motoristas externos
  const allowExternalMutation = useMutation(
    ({ rideId, passengerId }) => 
      ridesAPI.allowExternal(rideId, passengerId),
    {
      onSuccess: () => {
        navigate('/passenger/ride-in-progress');
      }
    }
  );

  // Buscar configuração do serviço atual
  const currentServiceConfig = serviceConfigs?.find(
    config => config.service_type === serviceType
  );

  // Calcular total quando há valor base (exemplo: R$ 25,00)
  useEffect(() => {
    if (currentServiceConfig?.base_additional_fee > 0) {
      const baseAmount = 25.00; // Valor exemplo - viria de cálculo de distância
      calculateTotalMutation.mutate({ baseAmount, serviceType });
    }
  }, [currentServiceConfig]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfirmRide = () => {
    if (!formData.pickup_location || !formData.destination) {
      return;
    }

    const rideData = {
      passenger_id: 'current-user-id', // Viria do contexto de auth
      pickup_location: formData.pickup_location,
      destination: formData.destination,
      service_type: serviceType,
      service_notes: formData.service_notes || null,
      base_amount: calculatedTotal?.base_amount || 25.00,
      additional_fee: calculatedTotal?.additional_fee || 0,
      allow_external_drivers: false
    };

    createRideMutation.mutate(rideData);
  };

  const handleAllowExternal = () => {
    const rideData = {
      ...formData,
      passenger_id: 'current-user-id',
      service_type: serviceType,
      allow_external_drivers: true
    };

    createRideMutation.mutate(rideData);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          {isEmergency ? 'Corrida de Emergência' : 'Nova Corrida'}
        </Typography>
        
        {currentServiceConfig && (
          <Chip 
            label={currentServiceConfig.display_name}
            color="primary"
            sx={{ mb: 2 }}
          />
        )}
      </Box>

      {/* Formulário */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          {/* Origem */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <MyLocation sx={{ verticalAlign: 'middle', mr: 1 }} />
              De onde você está?
            </Typography>
            <TextField
              fullWidth
              placeholder="Digite o endereço de origem"
              value={formData.pickup_location}
              onChange={(e) => handleInputChange('pickup_location', e.target.value)}
              variant="outlined"
            />
          </Box>

          {/* Destino */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <LocationOn sx={{ verticalAlign: 'middle', mr: 1 }} />
              Para onde você vai?
            </Typography>
            <TextField
              fullWidth
              placeholder="Digite o endereço de destino"
              value={formData.destination}
              onChange={(e) => handleInputChange('destination', e.target.value)}
              variant="outlined"
            />
          </Box>

          {/* Notas do serviço (para serviços especiais) */}
          {serviceType !== 'STANDARD_RIDE' && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Observações (opcional)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Detalhes sobre o serviço solicitado"
                value={formData.service_notes}
                onChange={(e) => handleInputChange('service_notes', e.target.value)}
                variant="outlined"
              />
            </Box>
          )}

          {/* Informações do serviço */}
          {currentServiceConfig && (
            <Box sx={{ mb: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {currentServiceConfig.description}
              </Typography>
              
              {calculatedTotal && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    Valor base: R$ {calculatedTotal.base_amount.toFixed(2)}
                  </Typography>
                  {calculatedTotal.additional_fee > 0 && (
                    <Typography variant="body2">
                      Taxa do serviço: R$ {calculatedTotal.additional_fee.toFixed(2)}
                    </Typography>
                  )}
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
                    Total: R$ {calculatedTotal.total_amount.toFixed(2)}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Aviso sobre comunidade */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Priorizamos motoristas da sua comunidade local
            </Typography>
          </Alert>

          {/* Erro e opção externa */}
          {showExternalOption && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Não há motoristas disponíveis na sua comunidade no momento.
              </Typography>
              <Button
                size="small"
                onClick={handleAllowExternal}
                disabled={allowExternalMutation.isLoading}
              >
                Buscar motorista fora da comunidade
              </Button>
            </Alert>
          )}

          {/* Botões */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate('/passenger')}
            >
              Cancelar
            </Button>
            
            <Button
              variant="contained"
              fullWidth
              onClick={handleConfirmRide}
              disabled={
                !formData.pickup_location || 
                !formData.destination || 
                createRideMutation.isLoading
              }
            >
              {createRideMutation.isLoading ? (
                <CircularProgress size={24} />
              ) : (
                'Confirmar Corrida'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default RideRequest;
