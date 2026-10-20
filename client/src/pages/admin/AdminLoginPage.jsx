import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const AdminLoginPage = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    if (user.role === 'super_admin') {
      navigate('/super-admin/dashboard', { replace: true });
      return null;
    }
    if (user.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return null;
    }
    if (user.role === 'kitchen') {
      navigate('/kitchen', { replace: true });
      return null;
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', form);
      const nextUser = response.data.user;
      setUser(nextUser);

      if (nextUser.role === 'super_admin') {
        navigate('/super-admin/dashboard', { replace: true });
        return;
      }
      if (nextUser.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      if (nextUser.role === 'kitchen') {
        navigate('/kitchen', { replace: true });
        return;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <div className="mb-6 text-center">
          <div className="text-sm uppercase tracking-[0.3em] text-brand-600">Staff access</div>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Admin login</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
              type="email"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
              type="password"
              required
            />
          </div>

          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <button disabled={loading} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
