import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './pages/public/SignUp';
import SignIn from './pages/public/SignIn';
import ForgotPassword from './pages/public/ForgotPassword';
import Dashboard from './pages/public/Dashboard';
import FindClients from './pages/public/FindClients';
import ManageClients from './pages/public/ManageClients';


function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/signUp" element={<SignUp />} />
        <Route path="/signIn" element={<SignIn />} />
        <Route path="/forgotPassword" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/find-clients" element={<FindClients />} />
        <Route path="/manage-clients" element={<ManageClients />} />
        
        {/* Protected Routes (Placeholder for now) */}
        {/* We will add a ProtectedRoute wrapper here later */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Redirect root to sign-in for now */}
        <Route path="/" element={<Navigate to="/signUp" replace />} />
        
        {/* Catch all route - 404 */}
        <Route path="*" element={<div className="flex h-screen items-center justify-center">404 - Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;