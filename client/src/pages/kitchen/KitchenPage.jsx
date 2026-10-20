import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../../services/api';

const statusOrder = ['Received', 'Preparing', 'Ready', 'Completed'];

const KitchenPage = ({ user, setUser }) => {
  const [orders, setOrders] = useState([]);
  const [socketReady, setSocketReady] = useState(false);

  const fetchOrders = async () => {
    const response = await api.get('/kitchen/orders');
    setOrders(response.data.orders || []);
  };

  useEffect(() => {
    fetchOrders();

    const socket = io(window.location.origin, {
      withCredentials: true,
      transports: ['websocket'],
    });

    socket.on('connect', () => setSocketReady(true));
    socket.on('order:new', async () => {
      await fetchOrders();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 880;
      osc.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    });
    socket.on('order:updated', async () => {
      await fetchOrders();
    });

    return () => socket.disconnect();
  }, []);

  const updateOrderStatus = async (orderId, status) => {
    await api.patch(`/kitchen/orders/${orderId}/status`, { status });
    fetchOrders();
  };

  const queueItems = useMemo(() => {
    return orders.flatMap((order) =>
      order.items.map((item) => ({
        orderId: order._id,
        orderNumber: order.orderNumber,
        tableNumber: order.table?.tableNumber,
        status: order.status,
        createdAt: order.createdAt,
        item,
      }))
    );
  }, [orders]);

  const groupedQueueItems = useMemo(() => {
    return {
      Received: queueItems.filter((queueItem) => queueItem.status === 'Received'),
      Preparing: queueItems.filter((queueItem) => queueItem.status === 'Preparing'),
      Ready: queueItems.filter((queueItem) => queueItem.status === 'Ready'),
      Completed: queueItems.filter((queueItem) => queueItem.status === 'Completed'),
    };
  }, [queueItems]);

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    window.location.href = '/admin';
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between rounded-3xl bg-slate-800 p-4 shadow-soft">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-slate-300">Kitchen display</div>
            <h1 className="mt-2 text-2xl font-bold">Order queue</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-700 px-3 py-1.5 text-sm text-slate-200">{socketReady ? 'Live' : 'Connecting...'}</span>
            <button onClick={logout} className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-900">Logout</button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-4">
          {statusOrder.map((status) => (
            <div key={status} className="rounded-3xl border border-slate-700 bg-slate-800 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{status}</h2>
                <span className="rounded-full bg-slate-700 px-2 py-1 text-xs text-slate-200">{groupedQueueItems[status].length}</span>
              </div>

              <div className="space-y-3">
                {groupedQueueItems[status].length ? groupedQueueItems[status].map((queueItem) => (
                  <div key={`${queueItem.orderId}-${queueItem.item.name}-${queueItem.item.quantity}`} className={`rounded-2xl border p-3 ${queueItem.status === 'Received' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-600 bg-slate-900/40'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold">#{queueItem.orderNumber}</div>
                        <div className="text-sm text-slate-300">Table {queueItem.tableNumber}</div>
                      </div>
                      <span className="text-xs text-slate-300">{new Date(queueItem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-slate-200">
                      <div className="flex justify-between gap-2">
                        <span>{queueItem.item.name} x{queueItem.item.quantity}</span>
                        {queueItem.item.specialInstructions && <span className="text-slate-400">({queueItem.item.specialInstructions})</span>}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {status === 'Received' && (
                        <button onClick={() => updateOrderStatus(queueItem.orderId, 'Preparing')} className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium">Start</button>
                      )}
                      {status === 'Preparing' && (
                        <button onClick={() => updateOrderStatus(queueItem.orderId, 'Ready')} className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium">Ready</button>
                      )}
                      {status === 'Ready' && (
                        <button onClick={() => updateOrderStatus(queueItem.orderId, 'Completed')} className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900">Complete</button>
                      )}
                    </div>
                  </div>
                )) : <div className="rounded-xl border border-dashed border-slate-600 p-3 text-sm text-slate-400">No orders here.</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KitchenPage;
