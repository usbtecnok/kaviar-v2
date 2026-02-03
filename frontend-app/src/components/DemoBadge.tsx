import React from 'react';
import { isDemoMode, isInvestorView } from '../demo/demoMode';

const DemoBadge: React.FC = () => {
  if (!isDemoMode() && !isInvestorView()) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: '#F59E0B',
        color: '#FFFFFF',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        zIndex: 9999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span>⚠️</span>
      <span>
        {isInvestorView() ? 'Visualização Investidor' : 'Ambiente de Demonstração'}
      </span>
    </div>
  );
};

export default DemoBadge;
