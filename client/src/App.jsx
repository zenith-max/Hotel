import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import CustomerMenuPage from './pages/customer/CustomerMenuPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import SuperAdminDashboardPage from './pages/super-admin/SuperAdminDashboardPage';
import KitchenPage from './pages/kitchen/KitchenPage';
import api from './services/api';

const App = () => {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    };

    loadUser();
  }, []);

  const setSessionUser = (nextUser) => {
    setUser(nextUser);
  };

  if (!authChecked) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading application...</div>;
  }

  return (
    <Routes>
      <Route path="/t/:token" element={<CustomerMenuPage />} />
      <Route path="/admin" element={<AdminLoginPage user={user} setUser={setSessionUser} />} />
      <Route
        path="/super-admin/dashboard"
        element={user && user.role === 'super_admin' ? <SuperAdminDashboardPage user={user} setUser={setSessionUser} /> : <Navigate to="/admin" replace />}
      />
      <Route
        path="/admin/dashboard"
        element={user && user.role === 'admin' ? <AdminDashboardPage user={user} setUser={setSessionUser} /> : <Navigate to="/admin" replace />}
      />
      <Route
        path="/kitchen"
        element={user && (user.role === 'kitchen' || user.role === 'admin') ? <KitchenPage user={user} setUser={setSessionUser} /> : <Navigate to="/admin" replace />}
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default App;
