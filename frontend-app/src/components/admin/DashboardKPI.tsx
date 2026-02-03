import React from 'react';
import { isDemoMode } from '../../demo/demoMode';
import demoData from '../../demo/demoData';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: string;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon = '📊',
  color = '#2563EB' 
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #E5E7EB',
        minWidth: '200px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '14px', color: '#64748B', marginBottom: '8px' }}>
            {title}
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: color, marginBottom: '4px' }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ fontSize: '32px', opacity: 0.3 }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const DashboardKPI: React.FC = () => {
  const demo = isDemoMode();
  const data = demo ? demoData.kpis : {
    bairrosMapeados: 0,
    motoristasAtivos: 0,
    motoristasPendentes: 0,
    corridasDemo: 0,
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      <KPICard
        title="Bairros Mapeados"
        value={data.bairrosMapeados}
        subtitle="Rio de Janeiro"
        icon="🗺️"
        color="#2563EB"
      />
      <KPICard
        title="Motoristas Ativos"
        value={data.motoristasAtivos}
        subtitle="Pré-lançamento"
        icon="🚗"
        color="#10B981"
      />
      <KPICard
        title="Pendentes Aprovação"
        value={data.motoristasPendentes}
        subtitle="Aguardando documentos"
        icon="⏳"
        color="#F59E0B"
      />
      <KPICard
        title="Corridas (30 dias)"
        value={data.corridasDemo}
        subtitle={demo ? 'Demonstração' : 'Real'}
        icon="📈"
        color="#8B5CF6"
      />
    </div>
  );
};

export default DashboardKPI;
