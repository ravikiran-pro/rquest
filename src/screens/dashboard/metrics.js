// Pure aggregation for the dashboard. Everything is computed client-side from the orders the
// existing endpoints already return (orders/owner, orders/admin/all) plus listings/shop.

export const RANGE_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

export const DAY_MS = 24 * 60 * 60 * 1000;

export const ACTIVE_STATUSES = [
  'placed', 'pending', 'order_prepare', 'preparing', 'accepted', 'packed',
  'ready_for_pickup', 'open_to_delivery', 'out_for_delivery',
];
const CANCELLED_STATUSES = ['cancelled', 'rejected'];

// Display order for the status breakdown (lifecycle order, then the two end states)
export const STATUS_ORDER = [
  { key: 'new', label: 'Placed', statuses: ['placed', 'pending'] },
  { key: 'preparing', label: 'Preparing', statuses: ['order_prepare', 'preparing', 'accepted'] },
  { key: 'packed', label: 'Packed', statuses: ['packed'] },
  { key: 'ready', label: 'Ready / fulfilling', statuses: ['ready_for_pickup', 'open_to_delivery'] },
  { key: 'transit', label: 'On the way', statuses: ['out_for_delivery'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'cancelled', label: 'Cancelled', statuses: CANCELLED_STATUSES },
];

export const TYPE_LABELS = { delivery: 'Delivery', pickup: 'Pickup', service: 'Service' };

export const money = (n) => parseFloat(n) || 0;
const ts = (order) => {
  const t = order?.createdAt ? new Date(order.createdAt).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
};

/** Orders created in [fromMs, toMs). */
export const ordersBetween = (orders, fromMs, toMs) =>
  orders.filter((o) => {
    const t = ts(o);
    return t !== null && t >= fromMs && t < toMs;
  });

/** Current and previous period of `days` days ending now (for period-over-period deltas). */
export const periodWindows = (days, nowMs = Date.now()) => {
  const span = days * DAY_MS;
  return {
    current: { from: nowMs - span, to: nowMs + 1 },
    previous: { from: nowMs - 2 * span, to: nowMs - span },
  };
};

/** Headline numbers for a set of orders. Sales exclude cancelled and rejected orders. */
export const summarize = (orders) => {
  const live = orders.filter((o) => !CANCELLED_STATUSES.includes(o.status));
  const sales = live.reduce((acc, o) => acc + money(o.total_amount), 0);
  const completed = orders.filter((o) => o.status === 'completed').length;
  const cancelled = orders.length - live.length;
  return {
    count: orders.length,
    liveCount: live.length,
    sales,
    aov: live.length ? sales / live.length : 0,
    completed,
    cancelled,
    completionRate: orders.length ? completed / orders.length : 0,
    cancelRate: orders.length ? cancelled / orders.length : 0,
  };
};

/** Percent change, or null when there is nothing to compare against. */
export const pctChange = (curr, prev) => {
  if (!prev) return curr ? null : 0;
  return ((curr - prev) / prev) * 100;
};

/** One bucket per day for the last `days` days, oldest first. */
export const dailySeries = (orders, days, nowMs = Date.now()) => {
  const buckets = [];
  const end = new Date(nowMs);
  end.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * DAY_MS);
    buckets.push({
      key: d.toDateString(),
      date: d,
      sales: 0,
      orders: 0,
      cancelled: 0,
    });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  orders.forEach((o) => {
    const t = ts(o);
    if (t === null) return;
    const i = index.get(new Date(t).toDateString());
    if (i === undefined) return;
    const b = buckets[i];
    b.orders += 1;
    if (CANCELLED_STATUSES.includes(o.status)) b.cancelled += 1;
    else b.sales += money(o.total_amount);
  });
  return buckets;
};

/** Counts per lifecycle group, in STATUS_ORDER. */
export const statusBreakdown = (orders) =>
  STATUS_ORDER.map((group) => ({
    key: group.key,
    label: group.label,
    count: orders.filter((o) => group.statuses.includes(o.status)).length,
    cancelled: group.key === 'cancelled',
  }));

/** Sales and count per order type (delivery / pickup / service). Cancelled orders excluded from sales. */
export const typeMix = (orders) => {
  const acc = Object.keys(TYPE_LABELS).map((key) => ({ key, label: TYPE_LABELS[key], count: 0, sales: 0 }));
  orders.forEach((o) => {
    const row = acc.find((r) => r.key === o.order_type) || acc[0];
    row.count += 1;
    if (!CANCELLED_STATUSES.includes(o.status)) row.sales += money(o.total_amount);
  });
  return acc;
};

/** Order count in 2-hour blocks of the day (12 bins, 00-02 ... 22-24). */
export const hourBins = (orders) => {
  const bins = Array.from({ length: 12 }, (_, i) => ({ key: i, label: `${String(i * 2).padStart(2, '0')}`, count: 0 }));
  orders.forEach((o) => {
    const t = ts(o);
    if (t === null) return;
    bins[Math.floor(new Date(t).getHours() / 2)].count += 1;
  });
  return bins;
};

/** Sales, count and share per store, largest first. */
export const storeBreakdown = (orders) => {
  const byShop = new Map();
  orders.forEach((o) => {
    const key = o.shop?.id || o.shop_id || 'unknown';
    if (!byShop.has(key)) {
      byShop.set(key, { key, name: o.shop?.shop_name || 'Store', count: 0, sales: 0 });
    }
    const row = byShop.get(key);
    row.count += 1;
    if (!CANCELLED_STATUSES.includes(o.status)) row.sales += money(o.total_amount);
  });
  const rows = [...byShop.values()].sort((a, b) => b.sales - a.sales || b.count - a.count);
  const totalSales = rows.reduce((acc, r) => acc + r.sales, 0);
  return rows.map((r) => ({ ...r, share: totalSales ? r.sales / totalSales : 0 }));
};

/** Best sellers by quantity from order line items (cancelled orders excluded). */
export const topItems = (orders, limit = 8) => {
  const byItem = new Map();
  orders.forEach((o) => {
    if (CANCELLED_STATUSES.includes(o.status)) return;
    (o.items || []).forEach((it) => {
      const name = it.item_name || 'Item';
      const key = `${o.shop?.id || o.shop_id || ''}|${name}`;
      if (!byItem.has(key)) {
        byItem.set(key, { key, name, store: o.shop?.shop_name || '', qty: 0, revenue: 0 });
      }
      const row = byItem.get(key);
      row.qty += Number(it.quantity) || 0;
      row.revenue += money(it.subtotal) || money(it.unit_price) * (Number(it.quantity) || 0);
    });
  });
  return [...byItem.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, limit);
};

/** Listings that are switched off or missing, across the given listings. */
export const stockSummary = (listings) => {
  const outOfStock = listings.filter((l) => l.is_available === false);
  return {
    total: listings.length,
    available: listings.length - outOfStock.length,
    outOfStock,
  };
};

export const recentOrders = (orders, limit = 8) =>
  [...orders]
    .sort((a, b) => (ts(b) || 0) - (ts(a) || 0))
    .slice(0, limit);

/** Compact money for big figures: ₹1.2L, ₹45K. Full number for small values. */
export const formatMoney = (amount) => {
  const n = money(amount);
  const abs = Math.abs(n);
  if (abs >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export const formatMoneyFull = (amount) =>
  `₹${money(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const formatPct = (ratio) => `${Math.round((ratio || 0) * 100)}%`;

export const formatTimeAgo = (iso) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
};
