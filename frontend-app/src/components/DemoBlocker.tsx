import React from 'react';
import { canPerformAction, getBlockedActionMessage } from '../demo/demoMode';

interface DemoBlockerProps {
  action: string;
  children: React.ReactNode;
  showTooltip?: boolean;
}

const DemoBlocker: React.FC<DemoBlockerProps> = ({ 
  action, 
  children, 
  showTooltip = true 
}) => {
  const canPerform = canPerformAction(action);
  
  if (canPerform) {
    return <>{children}</>;
  }

  // Bloquear ação
  const blockedMessage = getBlockedActionMessage(action);
  
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        opacity: 0.5,
        cursor: 'not-allowed',
      }}
      title={showTooltip ? blockedMessage : undefined}
    >
      <div
        style={{
          pointerEvents: 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default DemoBlocker;
