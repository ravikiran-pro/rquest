import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Skeleton, Empty, Spin, Grid } from 'antd';
import {
  ShopOutlined,
  DatabaseOutlined,
  OrderedListOutlined,
  MessageOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { useHistory } from 'react-router-dom';
import { netWorkCall, apiConfig, checkUserRole } from '../../app/utils';
import { useGlobalStore, useChatStore } from '../../app/services';
import Routes from '../../app/routes/routes';
import './analytics.css';

// Status grouping for tags and counts
const ACTIVE_STATUSES = ['placed', 'pending', 'order_prepare', 'preparing', 'accepted', 'packed', 'ready_for_pickup', 'open_to_delivery', 'out_for_delivery'];
const BAD_STATUSES = ['cancelled', 'rejected'];

const statusGroup = (status) => {
  if (status === 'completed') return 'done';
  if (BAD_STATUSES.includes(status)) return 'bad';
  if (status === 'placed' || status === 'pending') return 'new';
  return 'active';
};

const STATUS_LABELS = {
  placed: 'Placed',
  pending: 'Placed',
  order_prepare: 'Preparing',
  preparing: 'Preparing',
  accepted: 'Preparing',
  packed: 'Packed',
  ready_for_pickup: 'Ready',
  open_to_delivery: 'Fulfilling',
  out_for_delivery: 'On the way',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Cancelled',
};

const statusLabel = (status) => STATUS_LABELS[status] || status || '—';

const formatMoney = (amount) => {
  const n = parseFloat(amount) || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const formatTimeAgo = (iso) => {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} ${Math.round(hrs / 24) === 1 ? 'day' : 'days'} ago`;
};

// Last 7 day buckets (oldest first) for the bar list
const buildDayBuckets = (orders) => {
  const days = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    days.push({
      key: day.toDateString(),
      label: day.toLocaleDateString('en', { weekday: 'short' }).slice(0, 3),
      count: 0,
    });
  }
  orders.forEach((ord) => {
    const created = ord.createdAt ? new Date(ord.createdAt) : null;
    if (!created || Number.isNaN(created.getTime())) return;
    const bucket = days.find((d) => d.key === created.toDateString());
    if (bucket) bucket.count += 1;
  });
  return days;
};

const Delta = ({ value, label }) => {
  if (!value) {
    return (
      <span className="rq-analytics-delta rq-analytics-delta--flat">
        <MinusOutlined aria-hidden="true" /> {label}
      </span>
    );
  }
  const up = value > 0;
  return (
    <span className={`rq-analytics-delta ${up ? 'rq-analytics-delta--up' : 'rq-analytics-delta--down'}`}>
      {up ? <ArrowUpOutlined aria-hidden="true" /> : <ArrowDownOutlined aria-hidden="true" />} {label}
    </span>
  );
};

Delta.propTypes = {
  value: PropTypes.number,
  label: PropTypes.string,
};

const StatCard = ({ label, value, hint, Icon, delta }) => (
  <div className="rq-analytics-stat">
    <div className="rq-analytics-stat-top">
      <span className="rq-analytics-stat-label">{label}</span>
      <span className="rq-analytics-stat-icon" aria-hidden="true">
        <Icon />
      </span>
    </div>
    <div className="rq-analytics-stat-value">{value}</div>
    <div className="rq-analytics-stat-hint">
      {delta ? <Delta value={delta.value} label={delta.label} /> : hint}
    </div>
  </div>
);

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  hint: PropTypes.string,
  Icon: PropTypes.elementType.isRequired,
  delta: PropTypes.shape({ value: PropTypes.number, label: PropTypes.string }),
};

const StatusTag = ({ status }) => (
  <span className={`rq-analytics-status rq-analytics-status--${statusGroup(status)}`}>
    {statusLabel(status)}
  </span>
);

StatusTag.propTypes = {
  status: PropTypes.string,
};

const AnalyticsScreen = () => {
  const history = useHistory();
  const { user_data } = useGlobalStore((state) => state);
  const { unreadTotal } = useChatStore((state) => state);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { isAdmin } = checkUserRole(user_data);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [shops, setShops] = useState([]);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user_data?.user_id) {
      history.push(Routes.login);
      return undefined;
    }

    let alive = true;
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        // Existing endpoints only — aggregated client-side, no new backend surface:
        //   shops/my_shops    owner's stores (admins: own set, usually empty)
        //   orders/owner      store orders + the owner's shops
        //   orders/admin/all  platform-wide orders (admin only, 403 otherwise)
        const [myShopsRes, ownerRes] = await Promise.all([
          netWorkCall(apiConfig.my_shops, 'POST', null, true),
          netWorkCall(apiConfig.orders_owner, 'GET', null, true),
        ]);
        if (!alive) return;

        const shopList = myShopsRes?.data || [];
        const ownerOrders = ownerRes?.data || [];
        let allOrders = ownerOrders;

        if (isAdmin) {
          const adminRes = await netWorkCall(apiConfig.orders_admin, 'GET', null, true);
          if (!alive) return;
          // Admin sees platform-wide data; keep the owner slice as a fallback if denied
          if (adminRes?.data) allOrders = adminRes.data;
        }

        // Active listings per shop from the existing public per-shop listings endpoint
        const listingLists = await Promise.all(
          shopList.slice(0, 12).map((shop) =>
            netWorkCall(`${apiConfig.listings_by_shop}/${shop.id}`, 'GET', null, false).catch(() => null)
          )
        );
        if (!alive) return;
        const flatListings = listingLists.flatMap((res) => (res?.data ? res.data : []));

        setShops(shopList);
        setListings(flatListings);
        setOrders(allOrders);
      } catch (err) {
        console.error('Error loading analytics:', err);
        if (alive) setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [user_data, history, isAdmin]);

  const stats = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const last7 = orders.filter((o) => now - new Date(o.createdAt).getTime() <= 7 * dayMs);
    const prev7 = orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return now - t > 7 * dayMs && now - t <= 14 * dayMs;
    });
    const deltaValue = last7.length - prev7.length;
    const deltaLabel = prev7.length > 0 ? `${Math.round((deltaValue / prev7.length) * 100)}%` : last7.length > 0 ? 'new' : '0%';
    const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
    const availableListings = listings.filter((l) => l.is_available !== false).length;

    return {
      totalShops: shops.length,
      activeListings: availableListings,
      ordersTotal: orders.length,
      activeOrders: activeCount,
      unreadChats: unreadTotal,
      last7: last7.length,
      deltaValue,
      deltaLabel,
    };
  }, [shops, listings, orders, unreadTotal]);

  const weekBars = useMemo(() => buildDayBuckets(orders), [orders]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, isMobile ? 5 : 6),
    [orders, isMobile]
  );

  const roleLabel = isAdmin ? 'Platform admin' : 'Store owner';
  const scopeLine = isAdmin
    ? 'Platform-wide orders across every store, plus your own.'
    : shops.length === 1
      ? shops[0].shop_name || 'Your store'
      : `${shops.length} store${shops.length === 1 ? '' : 's'}`;

  if (loading && !orders.length && !shops.length) {
    return (
      <div className="rq-analytics">
        <div className="rq-analytics-inner">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      </div>
    );
  }

  if (loadError && !orders.length && !shops.length) {
    return (
      <div className="rq-analytics">
        <div className="rq-analytics-inner">
          <Empty description="Could not load analytics right now.">
            <Spin />
          </Empty>
        </div>
      </div>
    );
  }

  const peakCount = Math.max(1, ...weekBars.map((d) => d.count));

  return (
    <div className="rq-analytics">
      <div className="rq-analytics-inner">
        {/* Hero band — echoes the Home hero without illustrations */}
        <section className="rq-analytics-hero">
          <h1 className="rq-analytics-hero-title">
            {isAdmin ? 'Platform analytics' : 'Business analytics'}
          </h1>
          <p className="rq-analytics-hero-sub">
            Orders, listings and messages at a glance.
          </p>
          <div className="rq-analytics-hero-meta">
            <span className="rq-analytics-hero-chip">{roleLabel}</span>
            <span className="rq-analytics-hero-chip">{scopeLine}</span>
            {stats.last7 > 0 && (
              <span className="rq-analytics-hero-chip rq-analytics-hero-chip--lime">
                {stats.last7} order{stats.last7 === 1 ? '' : 's'} this week
              </span>
            )}
          </div>
        </section>

        {/* Summary stat cards */}
        <div className="rq-analytics-section">
          <h2 className="rq-analytics-section-title">Overview</h2>
        </div>
        <div className="rq-analytics-stats">
          <StatCard
            label="Stores"
            value={stats.totalShops}
            hint={isAdmin ? 'Owned by you' : undefined}
            Icon={ShopOutlined}
          />
          <StatCard
            label="Active listings"
            value={stats.activeListings}
            hint={`${listings.length} total`}
            Icon={DatabaseOutlined}
          />
          <StatCard
            label="Orders"
            value={stats.ordersTotal}
            delta={{ value: stats.deltaValue, label: `${stats.deltaLabel} · 7d` }}
            Icon={OrderedListOutlined}
          />
          <StatCard
            label="Unread chats"
            value={stats.unreadChats}
            hint={stats.activeOrders > 0 ? `${stats.activeOrders} active order${stats.activeOrders === 1 ? '' : 's'}` : 'All caught up'}
            Icon={MessageOutlined}
          />
        </div>

        {/* Trend + recent orders */}
        <div className="rq-analytics-section">
          <h2 className="rq-analytics-section-title">This week</h2>
        </div>
        <div className="rq-analytics-columns">
          <div className="rq-analytics-card">
            <h3 className="rq-analytics-card-title">Orders · last 7 days</h3>
            {weekBars.every((d) => d.count === 0) ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No orders in the last 7 days" />
            ) : (
              <div className="rq-analytics-bars" role="img" aria-label="Orders per day, last 7 days">
                {weekBars.map((day, idx) => (
                  <div key={day.key} className="rq-analytics-bar-col">
                    <span className="rq-analytics-bar-count">{day.count > 0 ? day.count : ''}</span>
                    <div
                      className={`rq-analytics-bar${day.count === peakCount ? ' rq-analytics-bar--peak' : ''}${
                        idx === weekBars.length - 1 && day.count > 0 ? ' rq-analytics-bar--today' : ''
                      }`}
                      style={{ height: `${Math.max(4, Math.round((day.count / peakCount) * 100))}%` }}
                    />
                    <span className="rq-analytics-bar-day">{day.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rq-analytics-card">
            <h3 className="rq-analytics-card-title">Recent orders</h3>
            {recentOrders.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No orders yet" />
            ) : (
              recentOrders.map((ord) => (
                <div key={ord.id || ord.order_number} className="rq-analytics-order-row">
                  <div className="rq-analytics-order-main">
                    <div className="rq-analytics-order-number">
                      {ord.order_number || ord.id}
                      {ord.shop?.shop_name ? ` · ${ord.shop.shop_name}` : ''}
                    </div>
                    <div className="rq-analytics-order-sub">
                      {ord.customer?.username ? `${ord.customer.username} · ` : ''}
                      {formatTimeAgo(ord.createdAt)}
                    </div>
                  </div>
                  <div className="rq-analytics-order-side">
                    <span className="rq-analytics-order-amount">{formatMoney(ord.total_amount)}</span>
                    <StatusTag status={ord.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

AnalyticsScreen.propTypes = {};

export default AnalyticsScreen;
