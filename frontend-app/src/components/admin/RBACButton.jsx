export const RBACButton = ({ children, onClick, ...props }) => {
  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  );
};
