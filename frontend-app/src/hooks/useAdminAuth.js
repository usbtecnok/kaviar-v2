export const useAdminAuth = () => {
  const getAdminData = () => {
    const data = localStorage.getItem('kaviar_admin_data');
    return data ? JSON.parse(data) : null;
  };

  const isSuperAdmin = () => {
    const admin = getAdminData();
    return admin?.role === 'SUPER_ADMIN';
  };

  const isAngelViewer = () => {
    const admin = getAdminData();
    return admin?.role === 'ANGEL_VIEWER';
  };

  const mustChangePassword = () => {
    const admin = getAdminData();
    return admin?.mustChangePassword === true;
  };

  return { getAdminData, isSuperAdmin, isAngelViewer, mustChangePassword };
};
