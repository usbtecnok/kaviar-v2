import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isDemoMode } from '../demo/demoMode';

const DemoWelcome: React.FC<{ type: 'passenger' | 'admin' }> = ({ type }) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    // Verificar se já foi mostrado nesta sessão
    const key = `demo_welcome_${type}_shown`;
    if (sessionStorage.getItem(key)) {
      setDismissed(true);
    }
  }, [type]);

  if (!isDemoMode() || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem(`demo_welcome_${type}_shown`, 'true');
    setDismissed(true);
  };

  const passengerSteps = [
    { title: '1. Favoritos', desc: 'Veja 8 locais salvos', link: '/passenger/favorites' },
    { title: '2. Histórico', desc: '4 corridas realizadas', link: '/passenger/history' },
    { title: '3. Perfil', desc: 'Dados completos', link: '/passenger/profile' },
  ];

  const adminSteps = [
    { title: '1. Dashboard', desc: 'KPIs e gráficos', link: '/admin/dashboard' },
    { title: '2. Bairros', desc: '162 mapeados', link: '/admin/neighborhoods' },
    { title: '3. System Status', desc: 'Health e versão', link: '/admin/system-status' },
  ];

  const steps = type === 'passenger' ? passengerSteps : adminSteps;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#1E293B' }}>
            Bem-vindo à Demo Kaviar
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B' }}>
            {type === 'passenger' ? 'Visão Passageiro' : 'Visão Admin'}
          </p>
        </div>

        <div style={{ 
          backgroundColor: '#FEF3C7', 
          padding: '12px 16px', 
          borderRadius: '8px',
          marginBottom: '24px',
          border: '1px solid #FCD34D',
        }}>
          <p style={{ fontSize: '14px', color: '#92400E', margin: 0 }}>
            ⚠️ Ambiente de demonstração com dados fictícios. Ações destrutivas estão bloqueadas.
          </p>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1E293B' }}>
          Como explorar (3 passos):
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {steps.map((step, index) => (
            <button
              key={index}
              onClick={() => {
                handleDismiss();
                navigate(step.link);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.borderColor = '#2563EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <div style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#2563EB',
                minWidth: '32px',
              }}>
                {index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B', marginBottom: '2px' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  {step.desc}
                </div>
              </div>
              <div style={{ fontSize: '20px', color: '#94A3B8' }}>→</div>
            </button>
          ))}
        </div>

        <button
          onClick={handleDismiss}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1D4ED8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2563EB';
          }}
        >
          Começar Exploração
        </button>

        <p style={{ 
          fontSize: '12px', 
          color: '#94A3B8', 
          textAlign: 'center', 
          marginTop: '16px',
          marginBottom: 0,
        }}>
          Clique fora para fechar
        </p>
      </div>
    </div>
  );
};

export default DemoWelcome;
