import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Checkbox, Dropdown, Empty, Input, InputNumber, Modal, Skeleton, Switch, Typography, message } from 'antd';
import { SearchOutlined, ReloadOutlined, CheckCircleOutlined, StopOutlined, SwapOutlined, CloseOutlined } from '@ant-design/icons';
import { QtyStepper } from '../../../app/components/listings/StockControl';
import { apiErrorText, codeText } from '../../../app/utils/catalogue_api';
import { availabilityLabels, STOCK_MODE_SHORT, DEFAULT_LOW_STOCK } from '../../../app/utils/stock';
import useShopListings from './useShopListings';
import { ListingThumb, StockPill, sectionName } from './ListingBits';
import { patchInventory, buildStockUpdates } from './inventoryApi';
import VariantStockRows from './VariantStockRows';
import { hasVariants } from '../../../app/utils/variants';
import './manage_store_catalog.css';

const { Title, Text } = Typography;
const SAVE_DELAY_MS = 600;

/**
 * Inventory tab (spec §F6): stock for every listing, with an inline stepper for counted
 * items (saved 600ms after the last change, optimistic with rollback) and switches for on/off items.
 */
const InventoryTab = ({ shop, sections, active, isPhone, initialFilter, refreshKey, onSummary, onChanged }) => {
  const shopId = shop?.id;
  const [modal, modalHolder] = Modal.useModal();
  const [filter, setFilter] = useState(initialFilter || 'all');
  const [searchText, setSearchText] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState('');
  const [saving, setSaving] = useState({});
  const [drafts, setDrafts] = useState({});
  const timers = useRef({});
  // The last saved stock per row, so a failed save rolls back past several quick taps
  const originals = useRef({});
  // Per row: the owner's pending value ({ qty, stepped }), the server count the taps start from,
  // and the save chain, so saves for one row run one after another in tap order
  const targets = useRef({});
  const bases = useRef({});
  const chains = useRef({});
  const queued = useRef({});
  const labels = availabilityLabels(shop?.shopSubCategory?.listing_type);

  useEffect(() => {
    if (initialFilter) setFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    const t = setTimeout(() => setQ(searchText.trim()), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    setSelected(new Set());
    setDrafts({});
  }, [shopId, filter, q]);

  // Flush nothing on unmount: pending timers are cancelled so a closed tab can't roll back rows
  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
    },
    []
  );

  const list = useShopListings(shopId, { stock: filter, q: q || undefined }, { pageSize: 50 });
  const { items, summary } = list;

  useEffect(() => {
    if (list.loaded) onSummary?.(summary);
  }, [summary, list.loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) list.reload({ silent: true });
    wasActive.current = active;
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  const firstRefresh = useRef(true);
  useEffect(() => {
    if (firstRefresh.current) {
      firstRefresh.current = false;
      return;
    }
    list.reload({ silent: true });
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Single-row saves ---------- */

  const saveRow = async (item, update, rollback) => {
    setSaving((s) => ({ ...s, [item.id]: true }));
    const res = await patchInventory(shopId, [{ id: item.id, ...update }]);
    setSaving((s) => ({ ...s, [item.id]: false }));
    const done = res.updated.find((u) => u.id === item.id);
    if (done) {
      if (!timers.current[item.id] && !queued.current[item.id]) delete originals.current[item.id];
      // The server's row (its count after this change) replaces the optimistic one
      list.mergeItems([done]);
      onChanged?.();
      return done;
    }
    rollback();
    delete originals.current[item.id];
    const skip = res.skipped.find((s) => s.id === item.id);
    message.error(skip ? `${item.name}: ${codeText(skip.reason, 'not saved')}` : apiErrorText(res.error, `Could not save ${item.name}`));
    return null;
  };

  const setDraft = (id, draft) => {
    if (draft) targets.current[id] = draft;
    else delete targets.current[id];
    setDrafts((d) => {
      const next = { ...d };
      if (draft) next[id] = draft.qty;
      else delete next[id];
      return next;
    });
  };

  const rollbackQty = (item) => {
    const before = originals.current[item.id] || item;
    delete bases.current[item.id];
    list.patchItem(item.id, { stock_qty: before.stock_qty, is_available: before.is_available, stock_state: before.stock_state });
    setDraft(item.id, null);
  };

  // One queued save for a row: a tap becomes a delta from the server count (so an order taken
  // meanwhile is kept); typed values stay absolute. Runs after the row's earlier saves.
  const runQty = async (item) => {
    const id = item.id;
    const target = targets.current[id];
    const base = bases.current[id];
    try {
      if (target && target.qty !== null && base !== undefined) {
        const delta = target.qty - base;
        if (!target.stepped || delta !== 0) {
          const update = target.stepped ? { delta } : { stock_qty: target.qty };
          const done = await saveRow(item, update, () => rollbackQty(item));
          if (done) bases.current[id] = done.stock_qty;
        }
      }
    } finally {
      queued.current[id] -= 1;
      // Idle again: nothing newer is waiting, so the row shows the server count
      if (!queued.current[id] && !timers.current[id]) {
        delete bases.current[id];
        setDraft(id, null);
      }
    }
  };

  const enqueueQty = (item) => {
    clearTimeout(timers.current[item.id]);
    delete timers.current[item.id];
    queued.current[item.id] = (queued.current[item.id] || 0) + 1;
    chains.current[item.id] = (chains.current[item.id] || Promise.resolve()).then(() => runQty(item));
  };

  // Stepper: show the new value at once, save 600ms after the last change (or on blur)
  // stepped: true for a +/- tap, false for a typed value
  const changeQty = (item, qty, stepped = false) => {
    if (qty === null || qty === undefined) {
      setDraft(item.id, { qty: null, stepped: false });
      return;
    }
    if (!originals.current[item.id]) {
      originals.current[item.id] = { stock_qty: item.stock_qty, is_available: item.is_available, stock_state: item.stock_state };
    }
    // The count the owner started from: the saved one, until this row's saves are idle
    if (bases.current[item.id] === undefined) bases.current[item.id] = item.stock_qty;
    setDraft(item.id, { qty, stepped });
    list.patchItem(item.id, { stock_qty: qty, is_available: qty > 0, stock_state: undefined });
    clearTimeout(timers.current[item.id]);
    timers.current[item.id] = setTimeout(() => enqueueQty(item), SAVE_DELAY_MS);
  };

  const flushQty = (item) => {
    if (!timers.current[item.id]) {
      // An emptied box goes back to the saved value
      if (targets.current[item.id]?.qty === null) setDraft(item.id, null);
      return;
    }
    enqueueQty(item);
  };

  const toggleRow = (item, checked) => {
    const before = item.is_available;
    list.patchItem(item.id, { is_available: checked, stock_state: checked ? 'in_stock' : 'out' });
    saveRow(item, { is_available: checked }, () => list.patchItem(item.id, { is_available: before, stock_state: item.stock_state }));
  };

  /* ---------- Bulk ---------- */

  const selectedItems = useMemo(() => items.filter((i) => selected.has(i.id)), [items, selected]);

  const runBulk = async (updates, label, unchanged = 0) => {
    if (updates.length === 0) {
      message.info('Nothing to change for these items.');
      return;
    }
    setBusy(label);
    const res = await patchInventory(shopId, updates);
    setBusy('');
    list.mergeItems(res.updated);
    if (res.error) message.error(apiErrorText(res.error, 'Could not update stock'));
    else {
      const left = res.skipped.length + unchanged;
      message.success(`${res.updated.length} updated${left ? ` · ${left} unchanged` : ''}`);
    }
    setSelected(new Set());
    list.reload({ silent: true });
    onChanged?.();
  };

  const askQuantity = (title, okText, onOk) => {
    let qty = 10;
    modal.confirm({
      title,
      content: (
        <div className="mc-qty-dialog">
          <label htmlFor="mc-inv-qty">Quantity in stock for each</label>
          <InputNumber id="mc-inv-qty" min={0} precision={0} defaultValue={qty} inputMode="numeric" onChange={(v) => (qty = v)} style={{ width: 120 }} />
        </div>
      ),
      okText,
      cancelText: 'Cancel',
      centered: true,
      onOk: () => onOk(qty ?? 0),
    });
  };

  const markIn = () => {
    const counted = selectedItems.filter((i) => i.stock_mode === 'tracked');
    if (counted.length === 0) {
      const { updates, unchanged } = buildStockUpdates(selectedItems, 'in');
      runBulk(updates, 'in', unchanged);
      return;
    }
    askQuantity(
      `Set quantity for ${counted.length} counted ${counted.length === 1 ? 'item' : 'items'}`,
      'Mark in stock',
      (qty) => {
        const { updates, unchanged } = buildStockUpdates(selectedItems, 'in', Math.max(1, qty));
        runBulk(updates, 'in', unchanged);
      }
    );
  };

  const markOut = () => {
    const { updates, unchanged } = buildStockUpdates(selectedItems, 'out');
    runBulk(updates, 'out', unchanged);
  };

  const setQuantity = () => {
    const counted = selectedItems.filter((i) => i.stock_mode === 'tracked');
    if (counted.length === 0) {
      message.info('Select items that count stock to set a quantity.');
      return;
    }
    askQuantity(`Set quantity for ${counted.length} ${counted.length === 1 ? 'item' : 'items'}`, 'Set quantity', (qty) =>
      // Variant listings get one update per variant
      runBulk(buildStockUpdates(counted, 'in', qty).updates, 'qty', selectedItems.length - counted.length)
    );
  };

  const changeMode = (mode) => {
    const targets = selectedItems.filter((i) => i.stock_mode !== mode);
    if (mode === 'tracked') {
      askQuantity(`Count stock for ${targets.length} ${targets.length === 1 ? 'item' : 'items'}`, 'Start counting', (qty) =>
        runBulk(
          targets.map((i) => ({ id: i.id, stock_mode: 'tracked', stock_qty: qty, low_stock_threshold: i.low_stock_threshold ?? DEFAULT_LOW_STOCK })),
          'mode'
        )
      );
      return;
    }
    runBulk(targets.map((i) => ({ id: i.id, stock_mode: mode })), 'mode', selectedItems.length - targets.length);
  };

  /* ---------- Render ---------- */

  const chips = [
    { key: 'all', label: 'All', count: summary.total },
    { key: 'low', label: 'Low', count: summary.low, badge: summary.low > 0 },
    { key: 'out', label: labels.off, count: summary.out },
    { key: 'tracked', label: 'Count stock' },
    { key: 'toggle', label: 'On/Off' },
  ];

  const renderControl = (item) => {
    // Variants: the count / switch of each option is in the rows under the item
    if (hasVariants(item)) {
      if (item.stock_mode === 'always') return <span className="mc-pill mc-pill--always">Always</span>;
      return <span className="ms-muted">{item.variants.length} options</span>;
    }
    if (item.stock_mode === 'tracked') {
      const draft = drafts[item.id];
      return (
        <QtyStepper
          value={draft !== undefined ? draft : item.stock_qty}
          onChange={(v) => changeQty(item, v)}
          onStep={(v) => changeQty(item, v, true)}
          onBlur={() => flushQty(item)}
          ariaLabel={`Stock for ${item.name}`}
          size={isPhone ? 'middle' : 'small'}
          disabled={false}
        />
      );
    }
    if (item.stock_mode === 'toggle') {
      return (
        <label className="mc-inv-switch">
          <Switch
            checked={item.is_available !== false}
            loading={Boolean(saving[item.id])}
            onChange={(checked) => toggleRow(item, checked)}
            aria-label={`${item.name}: ${item.is_available !== false ? labels.on : labels.off}`}
          />
          <span>{item.is_available !== false ? labels.on : labels.off}</span>
        </label>
      );
    }
    return <span className="mc-pill mc-pill--always">Always</span>;
  };

  const renderRow = (item) => {
    const secName = sectionName(sections, item.section_id);
    return (
      <div
        key={item.id}
        className={`mc-inv-row ${selected.has(item.id) ? 'is-selected' : ''} ${hasVariants(item) ? 'has-variants' : ''}`}
      >
        <Checkbox
          checked={selected.has(item.id)}
          onChange={(e) =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (e.target.checked) next.add(item.id);
              else next.delete(item.id);
              return next;
            })
          }
          aria-label={`Select ${item.name}`}
        />
        <ListingThumb src={item.img_url} alt="" className="mc-inv-thumb" />
        <div className="mc-inv-main">
          <div className="mc-inv-name" title={item.name}>
            {item.name}
          </div>
          <div className="mc-inv-meta">
            <span className={`mc-mode mc-mode--${item.stock_mode || 'toggle'}`}>{STOCK_MODE_SHORT[item.stock_mode] || 'On/Off'}</span>
            {secName && <span className="ms-muted">{secName}</span>}
            {item.stock_mode === 'tracked' && <StockPill item={item} />}
            {saving[item.id] && <span className="ms-muted">Saving…</span>}
          </div>
        </div>
        <div className="mc-inv-control">{renderControl(item)}</div>
        {hasVariants(item) && (
          <VariantStockRows item={item} isPhone={isPhone} save={(update, rollback) => saveRow(item, update, rollback)} />
        )}
      </div>
    );
  };

  const renderBody = () => {
    if (list.loading && !list.loaded) {
      return (
        <div className="mc-inv-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mc-inv-row">
              <Skeleton active avatar={{ shape: 'square', size: 40 }} title={{ width: '60%' }} paragraph={{ rows: 1, width: '40%' }} />
            </div>
          ))}
        </div>
      );
    }
    if (list.error && items.length === 0) {
      return (
        <Alert
          type="error"
          showIcon
          message="Your stock didn't load"
          description={list.error}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => list.reload({ silent: false })}>
              Retry
            </Button>
          }
        />
      );
    }
    if (summary.total === 0) {
      return (
        <div className="ms-empty ms-empty--compact">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No products yet" />
        </div>
      );
    }
    if (items.length === 0) {
      const allGood = (filter === 'out' || filter === 'low') && !q;
      return (
        <div className="ms-empty ms-empty--compact">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={allGood ? (filter === 'out' ? 'Everything is in stock' : 'Nothing is running low') : 'No items match'}
          >
            {!allGood && (
              <Button
                onClick={() => {
                  setFilter('all');
                  setSearchText('');
                }}
              >
                Show all
              </Button>
            )}
          </Empty>
        </div>
      );
    }
    return (
      <>
        <div className="mc-inv-list">{items.map(renderRow)}</div>
        <div className="ms-list-footer">
          <Text className="ms-muted">
            Showing {items.length} of {list.total}
          </Text>
          {list.hasMore && (
            <Button onClick={list.loadMore} loading={list.loadingMore}>
              Load more
            </Button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="ms-tab-pane">
      {modalHolder}
      <div className="ms-toolbar">
        <div className="ms-toolbar-text">
          <Title level={5} className="ms-section-title">
            Inventory
          </Title>
          <Text className="ms-section-desc">Update stock in one place. Counted items save as you change them.</Text>
        </div>
      </div>

      <div className="mc-summary" role="list" aria-label="Stock summary">
        <span className="mc-summary-chip" role="listitem">
          <strong>{summary.in_stock}</strong> {labels.on.toLowerCase()}
        </span>
        <span className={`mc-summary-chip ${summary.low > 0 ? 'is-low' : ''}`} role="listitem">
          <strong>{summary.low}</strong> low
        </span>
        <span className={`mc-summary-chip ${summary.out > 0 ? 'is-out' : ''}`} role="listitem">
          <strong>{summary.out}</strong> {labels.off.toLowerCase()}
        </span>
        {summary.needs_details > 0 && (
          <span className="mc-summary-chip is-low" role="listitem">
            <strong>{summary.needs_details}</strong> need details
          </span>
        )}
      </div>

      <div className="ms-filterbar">
        <Input
          allowClear
          prefix={<SearchOutlined className="ms-muted" />}
          placeholder="Search stock"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="ms-filter-search"
          aria-label="Search stock"
          maxLength={100}
        />
        <div className="mc-chips" role="radiogroup" aria-label="Stock filter">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={filter === c.key}
              className={`lc-chip ${filter === c.key ? 'is-active' : ''}`}
              onClick={() => setFilter(c.key)}
            >
              {c.label}
              {c.count !== undefined && <span className={`mc-chip-count ${c.badge ? 'is-hot' : ''}`}>{c.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {list.error && items.length > 0 && (
        <Alert
          type="warning"
          showIcon
          className="ms-inline-alert"
          message="Showing the last loaded stock. Refresh failed."
          action={
            <Button size="small" onClick={() => list.reload({ silent: true })}>
              Retry
            </Button>
          }
        />
      )}

      {renderBody()}

      {selected.size > 0 && (
        <div className={`mc-bulkbar ${isPhone ? 'is-phone' : ''}`} role="region" aria-label="Selected items">
          <span className="mc-bulkbar-count">{selected.size} selected</span>
          <div className="mc-bulkbar-actions">
            <Button icon={<CheckCircleOutlined />} loading={busy === 'in'} onClick={markIn}>
              Mark in stock
            </Button>
            <Button icon={<StopOutlined />} loading={busy === 'out'} onClick={markOut}>
              Mark out of stock
            </Button>
            <Button loading={busy === 'qty'} onClick={setQuantity}>
              Set quantity
            </Button>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'tracked', label: 'Count stock' },
                  { key: 'toggle', label: 'On / Off' },
                  { key: 'always', label: 'Always available' },
                ],
                onClick: ({ key }) => changeMode(key),
              }}
            >
              <Button icon={<SwapOutlined />} loading={busy === 'mode'}>
                Change mode
              </Button>
            </Dropdown>
            <Button type="text" icon={<CloseOutlined />} onClick={() => setSelected(new Set())} aria-label="Clear selection" />
          </div>
        </div>
      )}
    </div>
  );
};

InventoryTab.propTypes = {
  shop: PropTypes.object.isRequired,
  sections: PropTypes.array.isRequired,
  active: PropTypes.bool,
  isPhone: PropTypes.bool,
  initialFilter: PropTypes.string,
  refreshKey: PropTypes.number,
  onSummary: PropTypes.func,
  onChanged: PropTypes.func,
};

export default InventoryTab;
