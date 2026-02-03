import React, { useState, useEffect } from 'react';
import { isDemoMode } from '../../demo/demoMode';
import demoData from '../../demo/demoData';

interface HealthCheck {
  status: string;
  database: string;
  uptime: string;
}

interface FeatureFlag {
  key: string;
  enabled: boolean;
  rollout: number;
}

const SystemStatus: React.FC = () => {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const demo = isDemoMode();

  useEffect(() => {
    const fetchHealth = async () => {
      if (demo) {
        // Usar dados demo
        setTimeout(() => {
          setHealth({
            status: demoData.systemStatus.health,
            database: demoData.systemStatus.database,
            uptime: demoData.systemStatus.uptime,
          });
          setLoading(false);
        }, 500);
      } else {
        // Chamar API real
        try {
          const response = await fetch('/api/health');
          const data = await response.json();
          setHealth(data);
        } catch (error) {
          console.error('Error fetching health:', error);
          setHealth({ status: 'error', database: 'disconnected', uptime: '0' });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchHealth();
  }, [demo]);

  const statusData = demo ? demoData.systemStatus : {
    version: '1.0.0',
    commit: 'unknown',
    lastDeploy: new Date().toISOString(),
    featureFlags: [],
  };

  const featureFlags: FeatureFlag[] = demo ? demoData.systemStatus.featureFlags : [];

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          borderRadius: '12px', 
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          Carregando...
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'connected':
        return '#10B981';
      case 'degraded':
        return '#F59E0B';
      case 'error':
      case 'disconnected':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'connected':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'error':
      case 'disconnected':
        return '❌';
      default:
        return '⚪';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px' }}>
        Status do Sistema
      </h1>

      {/* Health Checks */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        borderRadius: '12px', 
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #E5E7EB',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          Health Checks
        </h2>
        
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '12px',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
          }}>
            <span style={{ fontWeight: '500' }}>Sistema</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{getStatusIcon(health?.status || 'unknown')}</span>
              <span style={{ 
                color: getStatusColor(health?.status || 'unknown'),
                fontWeight: '600',
              }}>
                {health?.status || 'Unknown'}
              </span>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '12px',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
          }}>
            <span style={{ fontWeight: '500' }}>Database</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{getStatusIcon(health?.database || 'unknown')}</span>
              <span style={{ 
                color: getStatusColor(health?.database || 'unknown'),
                fontWeight: '600',
              }}>
                {health?.database || 'Unknown'}
              </span>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '12px',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
          }}>
            <span style={{ fontWeight: '500' }}>Uptime</span>
            <span style={{ fontWeight: '600', color: '#1E293B' }}>
              {health?.uptime || '0'}
            </span>
          </div>
        </div>
      </div>

      {/* Versão e Deploy */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        borderRadius: '12px', 
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #E5E7EB',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          Versão e Deploy
        </h2>
        
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '12px',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
          }}>
            <span style={{ fontWeight: '500' }}>Versão</span>
            <span style={{ fontFamily: 'monospace', color: '#1E293B' }}>
              {statusData.version}
            </span>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '12px',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
          }}>
            <span style={{ fontWeight: '500' }}>Commit</span>
            <span style={{ fontFamily: 'monospace', color: '#1E293B' }}>
              {statusData.commit}
            </span>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '12px',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
          }}>
            <span style={{ fontWeight: '500' }}>Último Deploy</span>
            <span style={{ color: '#64748B' }}>
              {new Date(statusData.lastDeploy).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        borderRadius: '12px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #E5E7EB',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          Feature Flags (Read-Only)
        </h2>
        
        {featureFlags.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8' }}>
            Nenhuma feature flag ativa
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {featureFlags.map((flag) => (
              <div 
                key={flag.key}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    {flag.key}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Rollout: {flag.rollout}%
                  </div>
                </div>
                <div style={{ 
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: flag.enabled ? '#D1FAE5' : '#FEE2E2',
                  color: flag.enabled ? '#065F46' : '#991B1B',
                }}>
                  {flag.enabled ? 'Ativo' : 'Inativo'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {demo && (
        <div style={{ 
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#FEF3C7',
          borderRadius: '8px',
          border: '1px solid #FCD34D',
          color: '#92400E',
          fontSize: '14px',
        }}>
          ⚠️ Dados de demonstração. Em produção, estes valores são atualizados em tempo real.
        </div>
      )}
    </div>
  );
};

export default SystemStatus;
