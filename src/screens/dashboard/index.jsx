import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { Button, Empty, Segmented, Select, Skeleton, Tag } from 'antd';
import {
  ShopOutlined,
  AppstoreOutlined,
  OrderedListOutlined,
  ShoppingOutlined,
  MessageOutlined,
  WarningOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig, checkUserRole } from '../../app/utils';
import { useGlobalStore, useChatStore } from '../../app/services';
import Routes from '../../app/routes/routes';
import { adminTabPath } from '../../app/components/navbar/navConfig';
import { TrendChart, RankBars, SegmentBar, HourBars, Sparkline } from './charts';
import {
  RANGE_OPTIONS,
  ACTIVE_STATUSES,
  periodWindows,
  ordersBetween,
  summarize,
  pctChange,
  dailySeries,
  statusBreakdown,
  typeMix,
  hourBins,
  storeBreakdown,
  topItems,
  stockSummary,
  recentOrders,
  formatMoney,
  formatMoneyFull,
  formatPct,
  formatTimeAgo,
} from './metrics';
import './dashboard.css';

const STATUS_LABEL = {
  placed: 'Placed', pending: 'Placed', order_prepare: 'Preparing', preparing: 'Preparing', accepted: 'Preparing',
  packed: 'Packed', ready_for_pickup: 'Ready', open_to_delivery: 'Fulfilling', out_for_delivery: 'On the way',
  completed: 'Completed', cancelled: 'Cancelled', rejected: 'Cancelled',
};
const statusTone = (s) => (s === 'completed' ? 'done' : s === 'cancelled' || s === 'rejected' ? 'bad' : 'active');

/** Delta chip vs the previous period. Up is good for sales/orders/completion, so colour follows direction only. */
const Delta = ({ value, suffix = '' }) => {
  if (value === null) return <span className="rq-dash-delta rq-dash-delta--flat">new</span>;
  if (Math.abs(value) < 0.5) {
    return (
      <span className="rq-dash-delta rq-dash-delta--flat">
        <MinusOutlined aria-hidden="true" /> no change
      </span>
    );
  }
  const up = value > 0;
  return (
    <span className={`rq-dash-delta ${up ? 'rq-dash-delta--up' : 'rq-dash-delta--down'}`}>
      {up ? <ArrowUpOutlined aria-hidden="true" /> : <ArrowDownOutlined aria-hidden="true" />}
      {` ${Math.abs(Math.round(value))}%${suffix}`}
    </span>
  );
};

Delta.propTypes = { value: PropTypes.number, suffix: PropTypes.string };

const Tile = ({ label, value, Icon, delta, hint, spark, tone }) => (
  <div className={`rq-dash-tile${tone ? ` rq-dash-tile--${tone}` : ''}`}>
    <div className="rq-dash-tile-top">
      <span className="rq-dash-tile-label">{label}</span>
      <span className="rq-dash-tile-icon" aria-hidden="true">
        <Icon />
      </span>
    </div>
    <div className="rq-dash-tile-value">{value}</div>
    <div className="rq-dash-tile-foot">
      {delta !== undefined ? <Delta value={delta} suffix=" vs prev" /> : <span className="rq-dash-muted">{hint}</span>}
    </div>
    {spark && spark.length > 0 && <Sparkline values={spark} />}
  </div>
);

Tile.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  Icon: PropTypes.elementType.isRequired,
  delta: PropTypes.number,
  hint: PropTypes.string,
  spark: PropTypes.arrayOf(PropTypes.number),
  tone: PropTypes.string,
};

const Card = ({ title, sub, children, wide, action }) => (
  <section className={`rq-dash-card${wide ? ' rq-dash-card--wide' : ''}`}>
    <header className="rq-dash-card-head">
      <div>
        <h3 className="rq-dash-card-title">{title}</h3>
        {sub && <p className="rq-dash-card-sub">{sub}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
);

Card.propTypes = {
  title: PropTypes.string.isRequired,
  sub: PropTypes.string,
  children: PropTypes.node,
  wide: PropTypes.bool,
  action: PropTypes.node,
};

const DashboardScreen = () => {
  const history = useHistory();
  const { user_data } = useGlobalStore((state) => state);
  const { unreadTotal } = useChatStore((state) => state);
  const { isAdmin } = checkUserRole(user_data);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [shops, setShops] = useState([]);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [days, setDays] = useState(30);
  const [shopFilter, setShopFilter] = useState('all');

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
        const [myShopsRes, ownerRes] = await Promise.all([
          netWorkCall(apiConfig.my_shops, 'POST', null, true),
          netWorkCall(apiConfig.orders_owner, 'GET', null, true),
        ]);
        if (!alive) return;
        const shopList = myShopsRes?.data || [];
        let allOrders = ownerRes?.data || [];

        if (isAdmin) {
          // Admin sees the platform-wide order book; the owner slice is the fallback if denied
          const adminRes = await netWorkCall(apiConfig.orders_admin, 'GET', null, true);
          if (!alive) return;
          if (adminRes?.data) allOrders = adminRes.data;
        }

        const listingLists = await Promise.all(
          shopList.slice(0, 12).map((shop) =>
            netWorkCall(`${apiConfig.listings_by_shop}/${shop.id}`, 'GET', null, false).catch(() => null)
          )
        );
        if (!alive) return;

        setShops(shopList);
        setListings(listingLists.flatMap((res) => (res?.data ? res.data : [])));
        setOrders(allOrders);
        setUpdatedAt(new Date());
      } catch (err) {
        console.error('Error loading dashboard:', err);
        if (alive) setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [user_data, history, isAdmin, reloadKey]);

  // One scope for every card: the store filter applies to orders and listings alike
  const scopedOrders = useMemo(
    () => (shopFilter === 'all' ? orders : orders.filter((o) => (o.shop?.id || o.shop_id) === shopFilter)),
    [orders, shopFilter]
  );
  const scopedListings = useMemo(
    () => (shopFilter === 'all' ? listings : listings.filter((l) => l.shop_id === shopFilter)),
    [listings, shopFilter]
  );
  const shopNames = useMemo(() => new Map(shops.map((s) => [s.id, s.shop_name])), [shops]);

  const model = useMemo(() => {
    const { current, previous } = periodWindows(days);
    const cur = ordersBetween(scopedOrders, current.from, current.to);
    const prev = ordersBetween(scopedOrders, previous.from, previous.to);
    const s = summarize(cur);
    const p = summarize(prev);
    const series = dailySeries(cur, days);
    const open = scopedOrders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    const stock = stockSummary(scopedListings);
    return {
      s,
      p,
      series,
      statuses: statusBreakdown(cur),
      types: typeMix(cur),
      hours: hourBins(cur),
      stores: storeBreakdown(cur),
      items: topItems(cur),
      recent: recentOrders(scopedOrders, 8),
      open,
      stock,
      salesDelta: pctChange(s.sales, p.sales),
      ordersDelta: pctChange(s.count, p.count),
      aovDelta: pctChange(s.aov, p.aov),
      sparkSales: series.map((d) => d.sales),
      sparkOrders: series.map((d) => d.orders),
    };
  }, [scopedOrders, scopedListings, days]);

  const shopOptions = [
    { value: 'all', label: isAdmin ? 'All stores (platform)' : 'All my stores' },
    ...shops.map((sh) => ({ value: sh.id, label: sh.shop_name || 'Store' })),
  ];
  const showStoreFilter = shops.length > 1 || isAdmin;
  const scopeName =
    shopFilter === 'all' ? (isAdmin ? 'Platform' : shops.length === 1 ? shops[0].shop_name : 'All stores') : shopNames.get(shopFilter) || 'Store';
  const rangeLabel = `${days} days`;

  if (loading && !orders.length && !shops.length) {
    return (
      <div className="rq-dash">
        <div className="rq-dash-inner">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      </div>
    );
  }

  if (loadError && !orders.length && !shops.length) {
    return (
      <div className="rq-dash">
        <div className="rq-dash-inner">
          <div className="rq-dash-empty">
            <Empty description="Could not load the dashboard right now.">
              <Button icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)}>
                Try again
              </Button>
            </Empty>
          </div>
        </div>
      </div>
    );
  }

  const { s, series, stock } = model;
  const outOfStockRows = stock.outOfStock.slice(0, 6);
  const storeRows = model.stores.map((r) => ({
    key: r.key,
    label: r.name,
    value: r.sales,
    display: `${formatMoney(r.sales)} · ${formatPct(r.share)}`,
  }));
  const statusRows = model.statuses.map((g) => ({
    key: g.key,
    label: g.label,
    value: g.count,
    display: String(g.count),
    tone: g.cancelled ? 'bad' : undefined,
  }));
  const typeParts = model.types.map((t) => ({ key: t.key, label: t.label, value: t.count, sales: t.sales }));

  return (
    <div className="rq-dash">
      <div className="rq-dash-inner">
        {/* Hero: one headline figure + the context that explains it */}
        <section className="rq-dash-hero">
          <div className="rq-dash-hero-main">
            <div className="rq-dash-hero-kicker">{isAdmin ? 'Platform dashboard' : 'Business dashboard'}</div>
            <h1 className="rq-dash-hero-title">Dashboard</h1>
            <div className="rq-dash-hero-figure">{formatMoney(s.sales)}</div>
            <div className="rq-dash-hero-caption">
              Sales in the last {rangeLabel} · <Delta value={model.salesDelta} suffix=" vs previous period" />
            </div>
          </div>
          <div className="rq-dash-hero-side">
            <div className="rq-dash-hero-chips">
              <Tag>{isAdmin ? 'Platform admin' : 'Store owner'}</Tag>
              <Tag>{scopeName}</Tag>
              {model.open.length > 0 && (
                <Tag color="blue">
                  {model.open.length} open order{model.open.length === 1 ? '' : 's'}
                </Tag>
              )}
            </div>
            <div className="rq-dash-hero-actions">
              <Button onClick={() => history.push(Routes.orders)}>Orders</Button>
              {isAdmin ? (
                <Button type="primary" onClick={() => history.push(adminTabPath('orders'))}>
                  Admin console
                </Button>
              ) : (
                <Button type="primary" onClick={() => history.push(Routes.client)}>
                  Manage stores
                </Button>
              )}
            </div>
            <div className="rq-dash-updated">
              {updatedAt ? `Updated ${formatTimeAgo(updatedAt.toISOString())}` : ''}
              <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)} aria-label="Refresh dashboard" />
            </div>
          </div>
        </section>

        {/* One filter row for every card below */}
        <div className="rq-dash-filters" role="group" aria-label="Dashboard filters">
          <Segmented
            value={days}
            onChange={setDays}
            options={RANGE_OPTIONS.map((o) => ({ value: o.value, label: `${o.value}d` }))}
            aria-label="Date range"
          />
          {showStoreFilter && (
            <Select
              value={shopFilter}
              onChange={setShopFilter}
              options={shopOptions}
              className="rq-dash-store-select"
              aria-label="Filter by store"
              showSearch
              optionFilterProp="label"
            />
          )}
        </div>

        {/* KPI tiles */}
        <div className="rq-dash-tiles">
          <Tile label="Orders" value={s.count} Icon={OrderedListOutlined} delta={model.ordersDelta} spark={model.sparkOrders} />
          <Tile label="Avg order value" value={formatMoneyFull(s.aov)} Icon={ShoppingOutlined} delta={model.aovDelta} />
          <Tile label="Completion rate" value={formatPct(s.completionRate)} Icon={ThunderboltOutlined} hint={`${s.completed} completed`} />
          <Tile label="Cancellation rate" value={formatPct(s.cancelRate)} Icon={WarningOutlined} hint={`${s.cancelled} cancelled`} tone={s.cancelRate >= 0.15 ? 'warn' : undefined} />
          <Tile label="Open right now" value={model.open.length} Icon={ClockCircleOutlined} hint={model.open.length ? 'Needs action' : 'All caught up'} tone={model.open.length ? 'accent' : undefined} />
          {showStoreFilter ? (
            <Tile label="Stores" value={shops.length} Icon={ShopOutlined} hint={`${model.stores.length} with orders`} />
          ) : (
            <Tile label="Unread chats" value={unreadTotal} Icon={MessageOutlined} hint={unreadTotal ? 'Reply to customers' : 'All caught up'} />
          )}
          <Tile
            label="Active listings"
            value={stock.available}
            Icon={AppstoreOutlined}
            hint={`${stock.outOfStock.length} out of stock · ${stock.total} total`}
            tone={stock.outOfStock.length ? 'warn' : undefined}
          />
        </div>

        {/* Trend + status */}
        <div className="rq-dash-grid rq-dash-grid--2-1">
          <Card
            wide
            title="Sales trend"
            sub={`Daily sales, ${scopeName.toLowerCase()}, last ${rangeLabel}. Hover a day for details.`}
          >
            {s.count === 0 && series.every((d) => d.orders === 0) ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No orders in this period" />
            ) : (
              <TrendChart series={series} height={230} />
            )}
          </Card>
          <Card title="Order status" sub={`Orders by stage, last ${rangeLabel}`}>
            <RankBars rows={statusRows} emptyText="No orders in this period" />
          </Card>
        </div>

        {/* Fulfilment, timing, stores */}
        <div className="rq-dash-grid rq-dash-grid--3">
          <Card title="Fulfilment mix" sub="Share of orders by type">
            <SegmentBar parts={typeParts} />
          </Card>
          <Card title="When orders arrive" sub="Two-hour blocks, all days in range">
            <HourBars bins={model.hours} />
          </Card>
          <Card title={showStoreFilter ? 'Sales by store' : 'Store performance'} sub="Share of sales in range">
            <RankBars rows={storeRows.slice(0, 6)} emptyText="No sales in this period" />
          </Card>
        </div>

        {/* Products + stock */}
        <div className="rq-dash-grid rq-dash-grid--2-1">
          <Card title="Top items" sub={`Best sellers by quantity, last ${rangeLabel}`}>
            {model.items.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No items sold in this period" />
            ) : (
              <div className="rq-dash-table-wrap">
                <table className="rq-dash-table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      {showStoreFilter && <th scope="col">Store</th>}
                      <th scope="col" className="num">Qty</th>
                      <th scope="col" className="num">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.items.map((it) => (
                      <tr key={it.key}>
                        <td>{it.name}</td>
                        {showStoreFilter && <td className="rq-dash-muted">{it.store}</td>}
                        <td className="num">{it.qty}</td>
                        <td className="num">{formatMoneyFull(it.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card
            title="Stock alerts"
            sub={stock.total ? `${stock.outOfStock.length} of ${stock.total} listings are out of stock` : 'No listings yet'}
          >
            {outOfStockRows.length === 0 ? (
              <div className="rq-dash-ok">All listings in stock</div>
            ) : (
              <ul className="rq-dash-stock">
                {outOfStockRows.map((l) => (
                  <li key={l.id}>
                    <span className="rq-dash-stock-name">{l.name}</span>
                    <Tag color="error">Out of stock</Tag>
                    {showStoreFilter && <span className="rq-dash-muted">{shopNames.get(l.shop_id) || ''}</span>}
                  </li>
                ))}
              </ul>
            )}
            {stock.outOfStock.length > outOfStockRows.length && (
              <div className="rq-dash-muted">+{stock.outOfStock.length - outOfStockRows.length} more</div>
            )}
          </Card>
        </div>

        {/* Recent orders */}
        <Card
          wide
          title="Recent orders"
          sub={`Latest ${model.recent.length} ${scopeName.toLowerCase()} orders`}
          action={
            <Button type="link" onClick={() => history.push(Routes.orders)} style={{ padding: 0 }}>
              View all
            </Button>
          }
        >
          {model.recent.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No orders yet" />
          ) : (
            <div className="rq-dash-table-wrap">
              <table className="rq-dash-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    {showStoreFilter && <th scope="col">Store</th>}
                    <th scope="col">Customer</th>
                    <th scope="col">Type</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">Amount</th>
                    <th scope="col">When</th>
                  </tr>
                </thead>
                <tbody>
                  {model.recent.map((o) => (
                    <tr key={o.id || o.order_number}>
                      <td className="rq-dash-strong">{o.order_number || o.id}</td>
                      {showStoreFilter && <td>{o.shop?.shop_name || '—'}</td>}
                      <td>{o.customer?.username || '—'}</td>
                      <td>{o.order_type || '—'}</td>
                      <td>
                        <span className={`rq-dash-status rq-dash-status--${statusTone(o.status)}`}>
                          {STATUS_LABEL[o.status] || o.status || '—'}
                        </span>
                      </td>
                      <td className="num">{formatMoneyFull(o.total_amount)}</td>
                      <td className="rq-dash-muted">{formatTimeAgo(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

DashboardScreen.propTypes = {};

export default DashboardScreen;
