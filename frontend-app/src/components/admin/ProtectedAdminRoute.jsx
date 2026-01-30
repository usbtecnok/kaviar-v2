import { Navigate, useLocation } from 'react-router-dom';

export const ProtectedAdminRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('kaviar_admin_token');
  const adminData = localStorage.getItem('kaviar_admin_data');

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (adminData) {
    const admin = JSON.parse(adminData);
    if (admin.mustChangePassword && location.pathname !== '/admin/change-password') {
      return <Navigate to="/admin/change-password" replace />;
    }
  }

  return children;
};
