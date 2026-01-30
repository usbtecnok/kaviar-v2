import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useRBACInterceptor = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      if (response.status === 403) {
        const adminData = localStorage.getItem('kaviar_admin_data');
        if (adminData) {
          const admin = JSON.parse(adminData);
          if (admin.role === 'ANGEL_VIEWER') {
            alert('Sem permissão: você está em modo somente leitura');
          }
        }
      }
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [navigate]);
};
