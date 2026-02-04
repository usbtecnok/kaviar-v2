import { Navigate, useLocation } from 'react-router-dom';

export const ProtectedAdminRoute = ({ children, requireSuperAdmin = false }) => {
  const location = useLocation();
  const token = localStorage.getItem('kaviar_admin_token');
  const adminData = localStorage.getItem('kaviar_admin_data');

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (adminData) {
    const admin = JSON.parse(adminData);
    
    if (requireSuperAdmin && admin.role !== 'SUPER_ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    
    if (admin.mustChangePassword && location.pathname !== '/admin/change-password') {
      return <Navigate to="/admin/change-password" replace />;
    }
  }

  return children;
};
