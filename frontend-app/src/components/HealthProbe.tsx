/**
 * Health Probe - Auto-defesa do Admin
 * Valida API config ao carregar
 */

import { apiClient } from '../lib/apiClient';
import { useState, useEffect } from 'react';
import { Alert, Box } from '@mui/material';

interface ProbeResult {
  healthy: boolean;
  error?: string;
  details?: string;
}

export function useHealthProbe() {
  const [result, setResult] = useState<ProbeResult | null>(null);

  useEffect(() => {
    const probe = async () => {
      try {
        // Tenta /api/health (deve ser 200)
        const { data, status } = await apiClient.get('/api/health');
        
        if (status === 200 && data.success) {
          setResult({ healthy: true });
        } else {
          setResult({
            healthy: false,
            error: 'API health check falhou',
            details: `Status: ${status}`,
          });
        }
      } catch (error: any) {
        if (error.status === 404) {
          setResult({
            healthy: false,
            error: 'API_BASE_URL inválida ou faltando /api',
            details: 'Endpoint /api/health não encontrado (404)',
          });
        } else {
          setResult({
            healthy: false,
            error: 'Erro ao conectar com API',
            details: error.message,
          });
        }
      }
    };

    probe();
  }, []);

  return result;
}

export function HealthProbeBanner() {
  const probe = useHealthProbe();

  if (!probe) return null; // Carregando
  if (probe.healthy) return null; // Tudo OK

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      <Alert severity="error">
        <strong>⚠️ Configuração de API inválida:</strong> {probe.error}
        {probe.details && <div style={{ fontSize: '0.9em', marginTop: 4 }}>{probe.details}</div>}
      </Alert>
    </Box>
  );
}
