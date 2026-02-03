import React from 'react';
import { isDemoMode } from '../../demo/demoMode';
import demoData from '../../demo/demoData';

const RidesChart: React.FC = () => {
  const demo = isDemoMode();
  const data = demo ? demoData.corridasPorDia : [];

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        borderRadius: '12px', 
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #E5E7EB',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          Corridas por Dia
        </h3>
        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
          Sem dados disponíveis
        </div>
      </div>
    );
  }

  // Calcular valores para o gráfico
  const maxCorridas = Math.max(...data.map(d => d.corridas));
  const chartHeight = 200;

  return (
    <div style={{ 
      backgroundColor: '#FFFFFF', 
      borderRadius: '12px', 
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #E5E7EB',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Corridas por Dia
        </h3>
        <span style={{ fontSize: '14px', color: '#64748B' }}>
          Últimos 30 dias {demo && '(Demo)'}
        </span>
      </div>

      {/* Gráfico de barras simples */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: '4px', 
        height: `${chartHeight}px`,
        borderBottom: '2px solid #E5E7EB',
        paddingBottom: '8px',
      }}>
        {data.map((item, index) => {
          const barHeight = (item.corridas / maxCorridas) * chartHeight;
          const isRecent = index >= data.length - 7;
          
          return (
            <div
              key={index}
              style={{
                flex: 1,
                height: `${barHeight}px`,
                backgroundColor: isRecent ? '#2563EB' : '#93C5FD',
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
              }}
              title={`${item.data}: ${item.corridas} corridas`}
            >
              {isRecent && (
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#2563EB',
                }}>
                  {item.corridas}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: '12px',
        fontSize: '12px',
        color: '#64748B',
      }}>
        <span>{data[0]?.data}</span>
        <span>{data[data.length - 1]?.data}</span>
      </div>

      {/* Estatísticas */}
      <div style={{ 
        display: 'flex', 
        gap: '24px', 
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #E5E7EB',
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>Total</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#1E293B' }}>
            {data.reduce((sum, item) => sum + item.corridas, 0)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>Média/dia</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#1E293B' }}>
            {(data.reduce((sum, item) => sum + item.corridas, 0) / data.length).toFixed(1)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>Máximo</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#1E293B' }}>
            {maxCorridas}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RidesChart;
