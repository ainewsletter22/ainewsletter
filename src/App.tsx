import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './pages/public/SignUp';
import SignIn from './pages/public/SignIn';
import ForgotPassword from './pages/public/ForgotPassword';
import Dashboard from './pages/protected/Dashboard';
import FindClients from './pages/protected/FindClients';
import ManageClients from './pages/protected/ManageClients';
import SendAINewsletterPage from './pages/protected/Sendainewsletterpage';
import ConfirmEmail from './pages/protected/ConfirmEmail';
import SearchHistory from './pages/protected/SearchHistory';
import BrandsPage from './pages/protected/BrandsPage';
import ResetPassword from './pages/public/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { useEffect } from 'react';
import { authService } from './services/authService';
import { useAuthStore } from './store/useAuthStore';


function App() {
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    // Try to rehydrate session using httpOnly refresh cookie on app load
    (async () => {
      try {
        await authService.refresh();
      } catch (e) {
        // ignore - user will be treated as unauthenticated
      } finally {
        setInitialized(true);
      }
    })();
  }, [setInitialized]);

  if (!isInitialized) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Auth Routes (Guest Only) */}
        <Route element={<PublicRoute />}>
          <Route path="/signUp" element={<SignUp />} />
          <Route path="/signIn" element={<SignIn />} />
          <Route path="/forgotPassword" element={<ForgotPassword />} />
          <Route path="/confirm-email/:token" element={<ConfirmEmail />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Route>
        
        {/* Protected Routes (Authenticated Only) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/find-clients" element={<FindClients />} />
          <Route path="/manage-clients" element={<ManageClients />} />
          <Route path="/news-letter" element={<Navigate to="/news-letter/brands" replace />} />
          <Route path="/news-letter/brands" element={<BrandsPage />} />
          <Route path="/news-letter/brands/:brandId" element={<SendAINewsletterPage />} />
          <Route path="/search-history" element={<SearchHistory />} />
        </Route>

        {/* Redirect root to dashboard (Guards will handle guest vs user) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Catch all route - 404 */}
        <Route path="*" element={<div className="flex h-screen items-center justify-center">404 - Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;
