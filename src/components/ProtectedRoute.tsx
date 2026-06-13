import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const ProtectedRoute = () => {
  const token = useAuthStore((state) => state.token);

  // If no token exists, redirect to sign-in
  return token ? <Outlet /> : <Navigate to="/signIn" replace />;
};

export default ProtectedRoute;