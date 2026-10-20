import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const initialForm = {
  restaurantName: '',
  restaurantAddress: '',
  restaurantContact: '',
  restaurantLogo: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

const SuperAdminDashboardPage = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingRestaurantId, setEditingRestaurantId] = useState('');
  const [editingRestaurant, setEditingRestaurant] = useState({ name: '', logo: '', address: '', contact: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadOverview = async () => {
    try {
      const response = await api.get('/super-admin/overview');
      setRestaurants(response.data.restaurants || []);
      setAdmins(response.data.admins || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load platform data.');
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/super-admin/restaurants', form);
      setForm(initialForm);
      await loadOverview();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create restaurant admin.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (adminId, active) => {
    try {
      await api.put(`/super-admin/admins/${adminId}/status`, { active });
      await loadOverview();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update admin state.');
    }
  };

  const updateAdminPassword = async (adminId) => {
    const password = window.prompt('Enter a new password for this admin (minimum 6 characters):');
    if (!password) return;

    try {
      await api.put(`/super-admin/admins/${adminId}/password`, { password });
      setError('');
      window.alert('Admin password updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update admin password.');
    }
  };

  const deleteRestaurant = async (restaurantId) => {
    const confirmed = window.confirm('Delete this restaurant and permanently remove all menus, tables, orders, and admin users for it?');
    if (!confirmed) return;

    try {
      await api.delete(`/super-admin/restaurants/${restaurantId}`);
      await loadOverview();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete restaurant.');
    }
  };

  const startEditingRestaurant = (restaurant) => {
    setEditingRestaurantId(restaurant._id);
    setEditingRestaurant({
      name: restaurant.name || '',
      logo: restaurant.logo || '',
      address: restaurant.address || '',
      contact: restaurant.contact || '',
    });
  };

  const saveRestaurantDetails = async (event) => {
    event.preventDefault();
    try {
      await api.put(`/super-admin/restaurants/${editingRestaurantId}`, editingRestaurant);
      setEditingRestaurantId('');
      setEditingRestaurant({ name: '', logo: '', address: '', contact: '' });
      await loadOverview();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update hotel details.');
    }
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    navigate('/admin', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-3 rounded-3xl bg-slate-900 p-5 text-white shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-slate-300">Platform control</div>
            <h1 className="mt-2 text-2xl font-bold">Super admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm">{user?.name}</span>
            <button onClick={logout} className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-900">Logout</button>
          </div>
        </header>

        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4">
            <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Create</div>
            <h2 className="mt-2 text-xl font-bold text-slate-900">New restaurant and admin</h2>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Restaurant name</label>
              <input
                value={form.restaurantName}
                onChange={(event) => setForm((current) => ({ ...current, restaurantName: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
                placeholder="Harbor Table"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Logo URL</label>
              <input
                value={form.restaurantLogo}
                onChange={(event) => setForm((current) => ({ ...current, restaurantLogo: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Upload logo image</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const data = new FormData();
                  data.append('image', file);
                  const response = await api.post('/super-admin/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
                  setForm((current) => ({ ...current, restaurantLogo: response.data.imageUrl }));
                }}
                className="w-full rounded-xl border border-dashed border-slate-200 px-3 py-2.5"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Restaurant address</label>
              <input
                value={form.restaurantAddress}
                onChange={(event) => setForm((current) => ({ ...current, restaurantAddress: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
                placeholder="Street, city"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact number</label>
              <input
                value={form.restaurantContact}
                onChange={(event) => setForm((current) => ({ ...current, restaurantContact: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
                placeholder="+91 90000 00000"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Admin name</label>
              <input
                value={form.adminName}
                onChange={(event) => setForm((current) => ({ ...current, adminName: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
                placeholder="Hotel admin"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Admin email</label>
              <input
                value={form.adminEmail}
                onChange={(event) => setForm((current) => ({ ...current, adminEmail: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
                type="email"
                placeholder="admin@hotel.com"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Admin password</label>
              <input
                value={form.adminPassword}
                onChange={(event) => setForm((current) => ({ ...current, adminPassword: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
                type="password"
                placeholder="Create password"
                required
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {loading ? 'Creating...' : 'Create restaurant and admin'}
              </button>
            </div>
          </form>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Restaurants</h2>
            <div className="mt-4 space-y-3">
              {restaurants.length ? (
                restaurants.map((restaurant) => (
                  <div key={restaurant._id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      {restaurant.logo ? (
                        <img src={restaurant.logo} alt={restaurant.name} className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{restaurant.name?.charAt(0)}</div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-900">{restaurant.name}</div>
                        <div className="text-sm text-slate-500">{restaurant.address || 'No address added'}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      {restaurant.contact ? `Contact: ${restaurant.contact}` : 'No contact added'}
                    </div>

                    {editingRestaurantId === restaurant._id ? (
                      <form onSubmit={saveRestaurantDetails} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Hotel name</label>
                          <input
                            value={editingRestaurant.name}
                            onChange={(event) => setEditingRestaurant((current) => ({ ...current, name: event.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Logo URL</label>
                          <input
                            value={editingRestaurant.logo}
                            onChange={(event) => setEditingRestaurant((current) => ({ ...current, logo: event.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Address</label>
                          <input
                            value={editingRestaurant.address}
                            onChange={(event) => setEditingRestaurant((current) => ({ ...current, address: event.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Contact</label>
                          <input
                            value={editingRestaurant.contact}
                            onChange={(event) => setEditingRestaurant((current) => ({ ...current, contact: event.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingRestaurantId('')} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Cancel</button>
                          <button type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Save hotel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="mt-4 flex justify-end gap-2">
                        <button onClick={() => startEditingRestaurant(restaurant)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Edit hotel details</button>
                        <button onClick={() => deleteRestaurant(restaurant._id)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">Delete hotel</button>
                      </div>
                    )}

                    <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">Admins</div>
                    <div className="mt-2 space-y-2">
                      {(restaurant.admins || []).length ? (
                        (restaurant.admins || []).map((admin) => (
                          <div key={admin.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-2">
                            <div>
                              <div className="font-medium text-slate-800">{admin.name}</div>
                              <div className="text-xs text-slate-500">{admin.email}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateAdminPassword(admin.id)}
                                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700"
                              >
                                Reset password
                              </button>
                              <button
                                onClick={() => toggleAdminStatus(admin.id, !admin.active)}
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${admin.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                              >
                                {admin.active ? 'Active' : 'Inactive'}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-slate-500">No admins assigned yet.</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No restaurants created yet.</div>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Admin accounts</h2>
            <div className="mt-4 space-y-3">
              {admins.length ? (
                admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                    <div>
                      <div className="font-semibold text-slate-900">{admin.name}</div>
                      <div className="text-sm text-slate-500">{admin.email}</div>
                      <div className="text-xs text-slate-500">{admin.restaurantName || 'Unassigned restaurant'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateAdminPassword(admin.id)}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700"
                      >
                        Reset password
                      </button>
                      <button
                        onClick={() => toggleAdminStatus(admin.id, !admin.active)}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${admin.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                      >
                        {admin.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No admin users found.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboardPage;
