import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Utensils, Clock3, Check, Minus, Plus, Sparkles, X } from 'lucide-react';
import api from '../../services/api';

const statusColors = {
  Received: 'bg-amber-100 text-amber-700',
  Preparing: 'bg-blue-100 text-blue-700',
  Ready: 'bg-emerald-100 text-emerald-700',
  Completed: 'bg-slate-200 text-slate-700',
};

const formatPrice = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const CustomerMenuPage = () => {
  const { token } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [table, setTable] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const storageKey = token ? `restaurant-table-order:${token}` : null;

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/public/table/${token}`);
      const payload = response.data;
      setRestaurant(payload.restaurant);
      setTable(payload.table);
      setCategories(payload.categories || []);
      setItems(payload.items || []);
      setSelectedCategory(payload.categories?.[0]?._id || 'all');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load this menu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [token]);

  useEffect(() => {
    if (!storageKey) return;

    try {
      const savedState = localStorage.getItem(storageKey);
      if (!savedState) return;

      const parsed = JSON.parse(savedState);
      if (Array.isArray(parsed.cart)) {
        setCart(parsed.cart);
      }
      if (parsed.order?.orderNumber) {
        setOrder(parsed.order);
      }
      if (typeof parsed.customerName === 'string') {
        setCustomerName(parsed.customerName);
      }
      if (typeof parsed.orderNotes === 'string') {
        setOrderNotes(parsed.orderNotes);
      }
    } catch (error) {
      console.error('Unable to restore saved table session.', error);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;

    const persistentState = {
      cart,
      order,
      customerName,
      orderNotes,
      updatedAt: Date.now(),
    };

    if (cart.length || order || customerName || orderNotes) {
      localStorage.setItem(storageKey, JSON.stringify(persistentState));
      return;
    }

    localStorage.removeItem(storageKey);
  }, [storageKey, cart, order, customerName, orderNotes]);

  useEffect(() => {
    if (!token || !order?.orderNumber) return;

    const syncOrderStatus = async () => {
      try {
        const response = await api.get(`/public/orders/${order.orderNumber}?tableToken=${token}`);
        setOrder(response.data.order);
      } catch (error) {
        console.error('Unable to refresh order status.', error);
      }
    };

    syncOrderStatus();
  }, [token, order?.orderNumber]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category?._id === selectedCategory;
      return matchesCategory;
    });
  }, [items, selectedCategory]);

  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategory === 'all') return 'All dishes';
    return categories.find((category) => category._id === selectedCategory)?.name || 'Main course';
  }, [categories, selectedCategory]);

  const addToCart = (item) => {
    setCart((current) => {
      const existing = current.find((entry) => entry.id === item._id);
      if (existing) {
        return current.map((entry) =>
          entry.id === item._id ? { ...entry, quantity: entry.quantity + 1 } : entry
        );
      }
      return [...current, { id: item._id, name: item.name, price: item.price, image: item.image, quantity: 1, specialInstructions: '' }];
    });
    setCartOpen(true);
  };

  const updateCartQuantity = (id, delta) => {
    setCart((current) =>
      current
        .map((entry) =>
          entry.id === id ? { ...entry, quantity: Math.max(0, entry.quantity + delta) } : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  };

  const updateSpecialInstructions = (id, value) => {
    setCart((current) => current.map((entry) => (entry.id === id ? { ...entry, specialInstructions: value } : entry)));
  };

  const subtotal = cart.reduce((sum, entry) => sum + entry.price * entry.quantity, 0);

  const submitOrder = async () => {
    if (!cart.length) {
      setError('Please add at least one dish to your cart.');
      return;
    }

    try {
      setError('');
      const response = await api.post('/public/orders', {
        tableToken: token,
        clientRequestId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        customerName: customerName.trim() || 'Guest',
        orderNotes: orderNotes.trim(),
        items: cart.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
        })),
      });
      setOrder(response.data.order);
      setCart([]);
      setCustomerName('');
      setOrderNotes('');
      setCartOpen(false);
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify({
          cart: [],
          order: response.data.order,
          customerName: '',
          orderNotes: '',
          updatedAt: Date.now(),
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to place order right now.');
    }
  };

  const statusSteps = ['Received', 'Preparing', 'Ready', 'Completed'];
  const currentStatusIndex = order ? statusSteps.indexOf(order.status) : -1;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading menu...</div>;
  }

  if (error && !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-6 shadow-soft text-center max-w-md">
          <h1 className="text-xl font-bold text-slate-900">Table unavailable</h1>
          <p className="mt-3 text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1d1d1d] p-4">
      <div className="relative mx-auto max-w-[420px] overflow-hidden rounded-[34px] bg-[#f2f2f2] shadow-[0_28px_60px_rgba(0,0,0,0.45)]">
        <div className="flex h-16 items-center justify-between bg-[#4b4b4c] px-5 text-white">
          <span className="text-[1.05rem] font-semibold">9:41</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-white/80" />
              <span className="h-2 w-2 rounded-full bg-white/80" />
              <span className="h-2 w-2 rounded-full bg-white/80" />
            </div>
            <div className="flex items-end gap-[2px]">
              <span className="h-2 w-2 rounded-sm bg-white/90" />
              <span className="h-3 w-2 rounded-sm bg-white/90" />
              <span className="h-4 w-2 rounded-sm bg-white/90" />
            </div>
          </div>
        </div>

        <div className="p-4 pb-10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="w-full appearance-none rounded-full bg-[#e7e6e6] px-4 py-3 pr-10 text-left text-[1.05rem] font-bold text-slate-800 shadow-sm outline-none"
                aria-label="Select food category"
              >
                <option value="all">All dishes</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-700">
                <span className="text-lg">▼</span>
              </div>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#ececeb] text-slate-800 shadow-sm"
              aria-label="Open cart"
            >
              <ShoppingCart size={18} />
              {cart.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f19f63] px-1 text-[10px] font-bold text-white">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>

          <div className="space-y-6">
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <div key={item._id} className="flex items-center justify-between gap-3">
                  <div className="h-24 w-24 overflow-hidden rounded-full border-[3px] border-[#d9d9d9] bg-white shadow-sm">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1 text-right">
                    <h2 className="text-[1.05rem] font-bold leading-tight text-slate-900 sm:text-[1.25rem]">{item.name}</h2>
                    <div className="mt-2 text-[1.15rem] font-bold text-slate-900">{formatPrice(item.price)}</div>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={!item.available}
                      className="mt-3 rounded-full bg-[#f0a15d] px-5 py-2 text-base font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Buy
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
                No dishes available in this section.
              </div>
            )}
          </div>

          {order && (
            <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-emerald-700">Order placed</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">#{order.orderNumber}</div>
                </div>
                <div className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColors[order.status]}`}>
                  {order.status}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-[0.62rem]">
                {statusSteps.map((step, index) => (
                  <div key={step} className={`rounded-xl border p-2 text-center ${index <= currentStatusIndex ? 'border-emerald-200 bg-white text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                    <div className="flex items-center justify-center gap-1">
                      {index <= currentStatusIndex ? <Check size={12} /> : <Clock3 size={12} />}
                      <span>{step}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && !order && (
          <div className="px-4 pb-3">
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
          </div>
        )}

        <div
          className={`pointer-events-none fixed inset-0 z-40 bg-black/20 transition-opacity ${cartOpen ? 'pointer-events-auto opacity-100' : 'opacity-0'}`}
          onClick={() => setCartOpen(false)}
        />

        <div
          className={`fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[420px] transform rounded-t-[28px] bg-white p-5 shadow-[0_-20px_40px_rgba(15,23,42,0.18)] transition-transform duration-200 ${cartOpen ? 'translate-y-0' : 'translate-y-full'}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Your cart</h2>
              <p className="text-xs text-slate-500">Table {table?.tableNumber}</p>
            </div>
            <button onClick={() => setCartOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-700" aria-label="Close cart">
              <X size={16} />
            </button>
          </div>

          {cart.length ? (
            <>
              <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">{formatPrice(item.price)} each</div>
                      </div>
                      <button onClick={() => updateCartQuantity(item.id, -item.quantity)} className="text-xs font-medium text-red-500">
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-slate-200 p-1">
                        <button onClick={() => updateCartQuantity(item.id, -1)} className="rounded-full p-1 hover:bg-slate-100"><Minus size={12} /></button>
                        <span className="min-w-5 text-center text-sm font-semibold">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.id, 1)} className="rounded-full p-1 hover:bg-slate-100"><Plus size={12} /></button>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{formatPrice(item.price * item.quantity)}</div>
                    </div>

                    <textarea
                      value={item.specialInstructions}
                      onChange={(event) => updateSpecialInstructions(item.id, event.target.value)}
                      rows={2}
                      placeholder="Special instructions"
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#f0a15d]"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-bold text-slate-900">
                  <span>Total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#f0a15d]"
                />
                <textarea
                  value={orderNotes}
                  onChange={(event) => setOrderNotes(event.target.value)}
                  placeholder="Add any notes for the kitchen"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#f0a15d]"
                />
              </div>

              <button
                onClick={submitOrder}
                className="mt-4 w-full rounded-2xl bg-[#f0a15d] px-4 py-3 text-base font-bold text-white shadow-sm hover:brightness-105"
              >
                Confirm order
              </button>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Your cart is empty. Add a few dishes to get started.
            </div>
          )}

          {error && cart.length > 0 && (
            <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerMenuPage;
