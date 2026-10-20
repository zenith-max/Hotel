import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';

const emptyMenuForm = {
  category: '',
  name: '',
  description: '',
  price: '',
  dietary: 'veg',
  image: '',
  available: true,
};

const formatPrice = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const getFrontendBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'https://hotel-frontend-0tso.onrender.com';
};

const AdminDashboardPage = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [restaurantProfile, setRestaurantProfile] = useState({ name: '', logo: '', address: '', contact: '' });
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menuForm, setMenuForm] = useState(emptyMenuForm);
  const [categoryForm, setCategoryForm] = useState({ name: '', displayOrder: 0 });
  const [tableForm, setTableForm] = useState({ tableNumber: '' });
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [tableBilling, setTableBilling] = useState(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = async () => {
    try {
      const [restaurantResponse, overviewResponse, menuResponse, categoriesResponse, tablesResponse, ordersResponse] = await Promise.all([
        api.get('/admin/restaurant'),
        api.get('/admin/overview'),
        api.get('/admin/menu'),
        api.get('/admin/categories'),
        api.get('/admin/tables'),
        api.get('/admin/orders'),
      ]);

      const restaurant = restaurantResponse.data.restaurant || {};
      setRestaurantProfile({
        name: restaurant.name || '',
        logo: restaurant.logo || '',
        address: restaurant.address || '',
        contact: restaurant.contact || '',
      });
      setOverview(overviewResponse.data.overview);
      setMenu(menuResponse.data.items || []);
      setCategories(categoriesResponse.data.categories || []);
      setTables(tablesResponse.data.tables || []);
      setOrders(ordersResponse.data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load dashboard data.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const savedState = localStorage.getItem('admin-table-state');
    if (!savedState) return;

    try {
      const parsed = JSON.parse(savedState);
      if (parsed.selectedTableId) {
        setSelectedTableId(parsed.selectedTableId);
      }
      if (parsed.tableBilling) {
        setTableBilling(parsed.tableBilling);
      }
    } catch (error) {
      console.error('Unable to restore admin table state.', error);
    }
  }, []);

  useEffect(() => {
    if (!selectedTableId && !tableBilling) {
      localStorage.removeItem('admin-table-state');
      return;
    }

    localStorage.setItem('admin-table-state', JSON.stringify({ selectedTableId, tableBilling }));
  }, [selectedTableId, tableBilling]);

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);

    const response = await api.post('/admin/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setMenuForm((current) => ({ ...current, image: response.data.imageUrl }));
  };

  const uploadRestaurantImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);

    const response = await api.post('/admin/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setRestaurantProfile((current) => ({ ...current, logo: response.data.imageUrl }));
  };

  const createCategory = async (event) => {
    event.preventDefault();
    const response = await api.post('/admin/categories', categoryForm);
    setCategories((current) => [...current, response.data.category]);
    setCategoryForm({ name: '', displayOrder: 0 });
  };

  const createTable = async (event) => {
    event.preventDefault();
    const response = await api.post('/admin/tables', tableForm);
    setTables((current) => [...current, response.data.table]);
    setTableForm({ tableNumber: '' });
    fetchData();
  };

  const createMenuItem = async (event) => {
    event.preventDefault();
    const payload = { ...menuForm, price: Number(menuForm.price) };
    await api.post('/admin/menu', payload);
    setMenuForm(emptyMenuForm);
    fetchData();
  };

  const saveRestaurantProfile = async (event) => {
    event.preventDefault();
    try {
      const response = await api.put('/admin/restaurant', restaurantProfile);
      setRestaurantProfile({
        name: response.data.restaurant.name || '',
        logo: response.data.restaurant.logo || '',
        address: response.data.restaurant.address || '',
        contact: response.data.restaurant.contact || '',
      });
      setError('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update restaurant profile.');
    }
  };

  const handleStatusChange = async (orderId, status) => {
    await api.patch(`/kitchen/orders/${orderId}/status`, { status });
    fetchData();
  };

  const viewTableBilling = async (tableId) => {
    const response = await api.get(`/admin/tables/${tableId}/billing`);
    setSelectedTableId(tableId);
    setTableBilling(response.data);
  };

  const generateBill = async (tableId) => {
    const response = await api.post(`/admin/tables/${tableId}/bill`);
    setTableBilling((current) => ({
      ...current,
      summary: response.data.bill,
      message: response.data.message,
    }));
    fetchData();
  };

  const clearTable = async (tableId) => {
    const response = await api.post(`/admin/tables/${tableId}/clear`);
    const tableToken = tables.find((table) => table._id === tableId)?.token;
    if (tableToken) {
      localStorage.removeItem(`restaurant-table-order:${tableToken}`);
    }
    setTableBilling(null);
    setSelectedTableId(null);
    setError(response.data.message || 'Table cleared.');
    fetchData();
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    navigate('/admin', { replace: true });
  };

  const displayedOrders = statusFilter === 'all' ? orders : orders.filter((order) => order.status === statusFilter);

  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between rounded-3xl bg-slate-900 p-5 text-white shadow-soft">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-slate-300">Restaurant admin</div>
            <h1 className="mt-2 text-2xl font-bold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm">{user?.name}</span>
            <button onClick={logout} className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-900">Logout</button>
          </div>
        </header>

        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <section className="mb-6 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Brand</div>
              <h2 className="mt-2 text-xl font-bold text-slate-900">Hotel profile</h2>
            </div>
            <div className="flex items-center gap-3 self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-2 sm:self-auto">
              {restaurantProfile.logo ? (
                <img src={restaurantProfile.logo} alt={restaurantProfile.name || 'Restaurant'} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{(restaurantProfile.name || 'H').charAt(0).toUpperCase()}</div>
              )}
              <span className="text-sm font-medium text-slate-700">{restaurantProfile.name || 'Restaurant name'}</span>
            </div>
          </div>

          <form onSubmit={saveRestaurantProfile} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Hotel name</label>
              <input
                value={restaurantProfile.name}
                onChange={(event) => setRestaurantProfile((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
                placeholder="Hotel name"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Profile photo URL</label>
              <input
                value={restaurantProfile.logo}
                onChange={(event) => setRestaurantProfile((current) => ({ ...current, logo: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
                placeholder="https://example.com/logo.jpg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Upload profile photo</label>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadRestaurantImage} className="w-full rounded-xl border border-dashed border-slate-200 px-3 py-2.5" />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
              <input
                value={restaurantProfile.address}
                onChange={(event) => setRestaurantProfile((current) => ({ ...current, address: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
                placeholder="Hotel address"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact</label>
              <input
                value={restaurantProfile.contact}
                onChange={(event) => setRestaurantProfile((current) => ({ ...current, contact: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-brand-500"
                placeholder="Contact number"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Save restaurant profile</button>
            </div>
          </form>
        </section>

        {overview && (
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {[
              { label: 'Total Orders', value: overview.totalOrders },
              { label: 'Active Orders', value: overview.activeOrders },
              { label: 'Completed Orders', value: overview.completedOrders },
              { label: 'Sales', value: formatPrice(overview.totalSales || 0) },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-sm text-slate-500">{card.label}</div>
                <div className="mt-3 text-3xl font-bold text-slate-900">{card.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Menu management</h2>
              <form onSubmit={createMenuItem} className="mt-4 grid gap-3 md:grid-cols-2">
                <select value={menuForm.category} onChange={(event) => setMenuForm({ ...menuForm, category: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>{category.name}</option>
                  ))}
                </select>
                <input value={menuForm.name} onChange={(event) => setMenuForm({ ...menuForm, name: event.target.value })} placeholder="Dish name" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                <input value={menuForm.price} onChange={(event) => setMenuForm({ ...menuForm, price: event.target.value })} placeholder="Price" type="number" min="0" step="0.01" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                <select value={menuForm.dietary} onChange={(event) => setMenuForm({ ...menuForm, dietary: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <option value="veg">Veg</option>
                  <option value="non-veg">Non-Veg</option>
                  <option value="vegan">Vegan</option>
                </select>
                <input value={menuForm.image} onChange={(event) => setMenuForm({ ...menuForm, image: event.target.value })} placeholder="Image URL" className="rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2" />
                <input type="file" accept="image/*" onChange={uploadImage} className="md:col-span-2 rounded-xl border border-dashed border-slate-200 px-3 py-2.5" />
                <textarea value={menuForm.description} onChange={(event) => setMenuForm({ ...menuForm, description: event.target.value })} placeholder="Description" className="md:col-span-2 min-h-24 rounded-xl border border-slate-200 px-3 py-2.5" />
                <label className="md:col-span-2 flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={menuForm.available} onChange={(event) => setMenuForm({ ...menuForm, available: event.target.checked })} />
                  Available for customers
                </label>
                <button type="submit" className="md:col-span-2 rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white">Add item</button>
              </form>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Categories</h2>
              <form onSubmit={createCategory} className="mt-4 flex gap-2">
                <input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Category name" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5" />
                <input value={categoryForm.displayOrder} type="number" onChange={(event) => setCategoryForm({ ...categoryForm, displayOrder: Number(event.target.value) })} className="w-24 rounded-xl border border-slate-200 px-3 py-2.5" />
                <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 font-medium text-white">Add</button>
              </form>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Menu items</h2>
              <div className="mt-4 space-y-3">
                {menu.map((item) => (
                  <div key={item._id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-sm text-slate-500">{item.category?.name} • {formatPrice(item.price)}</div>
                      </div>
                      <div className={`rounded-full px-2 py-1 text-xs font-medium ${item.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {item.available ? 'Available' : 'Unavailable'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Table & NFC</h2>
              <form onSubmit={createTable} className="mt-4 flex gap-2">
                <input value={tableForm.tableNumber} onChange={(event) => setTableForm({ tableNumber: event.target.value })} placeholder="Table number" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5" />
                <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-white">Create</button>
              </form>

              <div className="mt-4 space-y-3">
                {tables.map((table) => {
                  const tableOrders = orders.filter((order) => order.table?._id === table._id);
                  const activeTableOrders = tableOrders.filter((order) => order.status !== 'Completed');
                  const isSelected = selectedTableId === table._id;
                  const tableUrl = `${getFrontendBaseUrl()}/t/${table.token}`;

                  return (
                    <div key={table._id} className="rounded-2xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">Table {table.tableNumber}</div>
                          <div className="text-xs text-slate-500">{table.active ? 'Active' : 'Inactive'} • {tableOrders.length} order(s)</div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 break-all">{tableUrl}</div>
                      <div className="mt-3 flex justify-center rounded-xl bg-white p-2">
                        <QRCodeSVG value={tableUrl} size={96} />
                      </div>

                      {activeTableOrders.length > 0 && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
                          {activeTableOrders.slice(0, 2).map((order) => (
                            <div key={order._id} className="mb-2 last:mb-0">
                              <div className="flex items-center justify-between text-xs text-slate-600">
                                <span>#{order.orderNumber}</span>
                                <span>{order.status}</span>
                              </div>
                              <div className="mt-1 space-y-1 text-xs text-slate-500">
                                {order.items.map((item) => (
                                  <div key={`${order._id}-${item.name}`} className="flex justify-between gap-2">
                                    <span>{item.name} x{item.quantity}</span>
                                    <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <button onClick={() => viewTableBilling(table._id)} className="flex-1 rounded-lg bg-slate-900 px-2 py-2 text-xs font-medium text-white">{isSelected ? 'Refresh bill' : 'View bill'}</button>
                        <button onClick={() => generateBill(table._id)} className="flex-1 rounded-lg bg-emerald-600 px-2 py-2 text-xs font-medium text-white">Generate bill</button>
                        <button onClick={() => clearTable(table._id)} className="flex-1 rounded-lg bg-red-500 px-2 py-2 text-xs font-medium text-white">Clear</button>
                      </div>

                      {isSelected && tableBilling && tableBilling.table?._id === table._id && (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-slate-700">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-semibold">Table bill</span>
                            <span>{tableBilling.summary?.billNumber || 'Bill pending'}</span>
                          </div>
                          {tableBilling.orders?.map((order) => (
                            <div key={order._id} className="mb-2 border-b border-emerald-100 pb-2 last:border-0 last:pb-0">
                              <div className="font-medium text-slate-800">#{order.orderNumber}</div>
                              {order.items.map((item) => (
                                <div key={`${order._id}-${item.name}`} className="mt-1 flex justify-between gap-2 text-slate-600">
                                  <span>{item.name} x{item.quantity}</span>
                                  <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                          <div className="mt-2 border-t border-emerald-100 pt-2">
                            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(tableBilling.summary?.subtotal || 0)}</span></div>
                            <div className="flex justify-between"><span>GST</span><span>{formatPrice(tableBilling.summary?.gstAmount || 0)}</span></div>
                            <div className="flex justify-between font-semibold text-slate-900"><span>Total</span><span>{formatPrice(tableBilling.summary?.total || 0)}</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Orders</h2>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="all">All</option>
                  <option value="Received">Received</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Ready">Ready</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="space-y-3">
                {displayedOrders.map((order) => (
                  <div key={order._id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">#{order.orderNumber}</div>
                        <div className="text-sm text-slate-500">Table {order.table?.tableNumber}</div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{order.status}</span>
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      {order.items.map((item) => (
                        <div key={`${order._id}-${item.name}`} className="flex justify-between gap-3">
                          <span>{item.name} x{item.quantity}</span>
                          <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="font-semibold text-slate-900">Total: {formatPrice(order.total)}</div>
                      <select value={order.status} onChange={(event) => handleStatusChange(order._id, event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
                        <option value="Received">Received</option>
                        <option value="Preparing">Preparing</option>
                        <option value="Ready">Ready</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
