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
        console.log('[HealthProbe] Iniciando probe...');
        const { data, status } = await apiClient.get('/api/health');
        
        console.log('[HealthProbe] Response:', { status, data });
        
        if (status === 200) {
          setResult({ healthy: true });
          console.log('[HealthProbe] ✅ Healthy');
        } else {
          setResult({
            healthy: false,
            error: 'API health check falhou',
            details: `Status: ${status}`,
          });
          console.error('[HealthProbe] ❌ Status não é 200:', status);
        }
      } catch (error: any) {
        console.error('[HealthProbe] ❌ Erro:', error);
        
        if (error.status === 404) {
          setResult({
            healthy: false,
            error: 'API_BASE_URL inválida ou faltando /api',
            details: 'Endpoint /api/health não encontrado (404)',
          });
        } else if (error.status === 0) {
          setResult({
            healthy: false,
            error: 'Erro de CORS ou rede',
            details: 'Verifique se o Origin está na allowlist do backend',
          });
        } else {
          setResult({
            healthy: false,
            error: 'Erro ao conectar com API',
            details: error.message || `Status: ${error.status}`,
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
