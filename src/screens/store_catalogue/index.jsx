import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory, useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Flex,
  Grid,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Segmented,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  AppstoreOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  ToolOutlined,
  UploadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { apiConfig, netWorkCall, shopSubCategories } from '../../app/utils';
import { codeText, apiErrorText, isCatalogueUnavailable } from '../../app/utils/catalogue_api';
import { fallbackStockMode, DEFAULT_LOW_STOCK } from '../../app/utils/stock';
import { AddProductModal, ImportProductCsvModal } from '../../app/components/listings';
import routes from '../../app/routes/routes';
import { colors } from '../../app/styles/theme';
import '../client_register/client_register.css';
import './store_catalogue.css';

const { Text } = Typography;

const PAGE_SIZE = 50;
const BULK_LIMIT = 200; // catalog/import-bulk accepts at most 200 items per call
const SEARCH_DEBOUNCE_MS = 300;
const SCOPE_SHOP = 'shop'; // all of the shop's own sub-categories (owners can't browse others)

const STATUS_TAG = {
  added: { color: 'success', text: 'Added' },
  not: { color: 'default', text: 'Not added' },
  needs: { color: 'warning', text: 'Needs details' },
};

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Added', value: 'added' },
  { label: 'Not added', value: 'not_added' },
];

const KIND_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Products', value: 'product' },
  { label: 'Services', value: 'service' },
];

const formatRupees = (value) => {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return null;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const STOCK_MODE_OPTIONS = [
  { value: 'tracked', label: 'Count' },
  { value: 'toggle', label: 'On/Off' },
  { value: 'always', label: 'Always' },
];

const hintNumber = (v) => (Number(v) > 0 ? Number(v) : null);

// Stock mode the API suggests for a catalogue row; services are always available
const defaultModeFor = (item) =>
  item.kind === 'service' ? 'always' : item.default_stock_mode || fallbackStockMode(item.kind === 'service' ? 'service' : 'product');

/** First problem with a price / MRP / stock entry, or null. */
const entryError = ({ price, mrp, mode, qty }) => {
  if (price === null || price === undefined || !(Number(price) >= 0)) return 'Enter a price';
  if (mrp !== null && mrp !== undefined && mrp !== '' && Number(price) > Number(mrp)) return 'Price is above MRP';
  if (mode === 'tracked' && (qty === null || qty === undefined || !(Number(qty) >= 0))) return 'Enter the stock quantity';
  return null;
};

/** One catalog/import(-bulk) item in the spec §E5 shape. */
const importItem = (item, { price, mrp, mode, qty }) => ({
  item_id: item.id,
  price: Number(price),
  ...(mrp !== null && mrp !== undefined && mrp !== '' ? { mrp: Number(mrp) } : {}),
  ...(item.sub_category_id ? { sub_category_id: item.sub_category_id } : {}),
  stock_mode: mode,
  ...(mode === 'tracked' ? { stock_qty: Number(qty), low_stock_threshold: DEFAULT_LOW_STOCK } : {}),
});

const categoryText = (path) => (Array.isArray(path) ? path.filter(Boolean).join(' › ') : path || '');

// A copy is missing details when it has no price, unit or image
const listingNeedsDetails = (listing) => !(Number(listing?.price) > 0) || !listing?.unit || !listing?.img_url;

const rowStatus = (item, listingsById) => {
  if (!item.already_added) return 'not';
  const listing = listingsById.get(String(item.already_added));
  return listing && listingNeedsDetails(listing) ? 'needs' : 'added';
};

const StatusTag = ({ status }) => {
  const meta = STATUS_TAG[status] || STATUS_TAG.not;
  return (
    <Tag color={meta.color} style={{ margin: 0, fontWeight: 600 }}>
      {meta.text}
    </Tag>
  );
};

StatusTag.propTypes = { status: PropTypes.oneOf(['added', 'not', 'needs']).isRequired };

const ItemThumb = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="sc-thumb" aria-hidden="true">
        <AppstoreOutlined style={{ fontSize: 20, color: colors.textMuted }} />
      </div>
    );
  }
  return (
    <div className="sc-thumb">
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
};

ItemThumb.propTypes = { src: PropTypes.string, alt: PropTypes.string };

const ItemName = ({ item }) => (
  <div className="sc-item">
    <ItemThumb src={item.image_url} alt={item.name} />
    <div style={{ minWidth: 0 }}>
      <div className="sc-item-name">{item.name}</div>
      {item.kind === 'service' && (
        <Tag style={{ marginTop: 4, marginInlineEnd: 0, fontSize: 11 }}>Service</Tag>
      )}
    </div>
  </div>
);

ItemName.propTypes = { item: PropTypes.object.isRequired };

/* ------------------------------------------------------------------ */
/* Single item: add one catalogue item with a price                    */
/* ------------------------------------------------------------------ */

const SingleAddModal = ({ item, shopId, onClose, onAdded }) => {
  const mrpHint = hintNumber(item.mrp_hint);
  const [price, setPrice] = useState(mrpHint ?? hintNumber(item.price_hint));
  const [mrp, setMrp] = useState(mrpHint);
  const [mode, setMode] = useState(defaultModeFor(item));
  const [qty, setQty] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    const problem = entryError({ price, mrp, mode, qty });
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    let outcome = null;
    try {
      const body = { shop_id: shopId, ...importItem(item, { price, mrp, mode, qty }) };
      const res = await netWorkCall(apiConfig.catalog_import, 'POST', JSON.stringify(body), true);
      if (res?.success) {
        message.success(`${item.name} added to your store`);
        outcome = 'added';
      } else if (res?.httpStatus === 409 || res?.code === 'already_added') {
        message.info(codeText('already_added'));
        outcome = 'added';
      } else if (isCatalogueUnavailable(res)) {
        setError('Catalogue not available yet');
      } else {
        setError(apiErrorText(res, 'Could not add this item'));
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
    if (outcome) onAdded();
  };

  return (
    <Modal
      open
      title={`Add ${item.name}`}
      onCancel={onClose}
      destroyOnClose
      width="min(480px, calc(100vw - 32px))"
      footer={
        <Flex justify="end" gap={8} wrap="wrap">
          <Button onClick={onClose} style={{ minHeight: 44 }}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={submit} icon={<PlusOutlined />} style={{ minHeight: 44, background: colors.primary, borderColor: colors.primary }}>
            Add to your store
          </Button>
        </Flex>
      }
    >
      <Text style={{ display: 'block', fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
        Brand, pack size and other details come from the catalogue. Set your price and stock.
      </Text>
      <Flex vertical gap={12}>
        <div>
          <Text strong>Selling price (₹) *</Text>
          <InputNumber
            size="large"
            min={0}
            precision={2}
            value={price}
            onChange={(v) => {
              setPrice(v);
              setError(null);
            }}
            style={{ width: '100%', marginTop: 4 }}
            aria-label={`Selling price for ${item.name}`}
          />
        </div>
        <div>
          <Text strong>MRP (₹)</Text>
          <InputNumber size="large" min={0} precision={2} value={mrp} onChange={setMrp} style={{ width: '100%', marginTop: 4 }} aria-label="MRP" />
        </div>
        <div>
          <Text strong>Stock *</Text>
          {item.kind === 'service' ? (
            <div style={{ marginTop: 4, color: colors.textMuted }}>Always available</div>
          ) : (
            <Flex gap={8} wrap="wrap" align="center" style={{ marginTop: 4 }}>
              <Segmented options={STOCK_MODE_OPTIONS} value={mode} onChange={setMode} aria-label="How you track stock" />
              {mode === 'tracked' && (
                <InputNumber size="large" min={0} precision={0} placeholder="Quantity" value={qty} onChange={setQty} style={{ width: 130 }} aria-label="Quantity in stock" />
              )}
            </Flex>
          )}
        </div>
        {error && <Alert type="error" showIcon message={error} />}
      </Flex>
    </Modal>
  );
};

SingleAddModal.propTypes = {
  item: PropTypes.object.isRequired,
  shopId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClose: PropTypes.func.isRequired,
  onAdded: PropTypes.func.isRequired,
};

/* ------------------------------------------------------------------ */
/* Selected items: price each one, then import in batches of 200       */
/* ------------------------------------------------------------------ */

const BulkAddModal = ({ items, shopId, onClose, onDone }) => {
  const [entries, setEntries] = useState(() => {
    const init = {};
    items.forEach((it) => {
      const mrpHint = hintNumber(it.mrp_hint);
      init[it.id] = { price: mrpHint ?? hintNumber(it.price_hint), mrp: mrpHint, mode: defaultModeFor(it), qty: null };
    });
    return init;
  });
  const [stockForAll, setStockForAll] = useState(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  const setEntry = (id, patch) => setEntries((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
  const applyAll = (fn) =>
    setEntries((e) => {
      const next = { ...e };
      items.forEach((it) => {
        const patch = fn(next[it.id]);
        if (patch) next[it.id] = { ...next[it.id], ...patch };
      });
      return next;
    });

  const submit = async () => {
    const bad = items.filter((it) => entryError(entries[it.id]));
    if (bad.length > 0) {
      setShowErrors(true);
      setError(`Fix ${bad.length} item${bad.length === 1 ? '' : 's'}: each needs a price (not above MRP) and, when counting stock, a quantity.`);
      return;
    }
    setSaving(true);
    setError(null);
    const created = [];
    const skipped = [];
    let failure = null;
    for (let start = 0; start < items.length; start += BULK_LIMIT) {
      const chunk = items.slice(start, start + BULK_LIMIT).map((it) => importItem(it, entries[it.id]));
      try {
        const res = await netWorkCall(
          apiConfig.catalog_import_bulk,
          'POST',
          JSON.stringify({ shop_id: shopId, items: chunk }),
          true
        );
        if (isCatalogueUnavailable(res)) {
          failure = 'Catalogue not available yet.';
          break;
        }
        if (!Array.isArray(res?.created)) {
          failure = apiErrorText(res, 'Some items could not be added. Try again.');
          break;
        }
        // created is [{ item_id, listing_id }]
        created.push(...res.created);
        skipped.push(...(Array.isArray(res.skipped) ? res.skipped : []));
      } catch (err) {
        failure = 'Network error. Some items may not have been added. Check your store and try again.';
        break;
      }
      setProgress(Math.min(start + BULK_LIMIT, items.length));
    }
    setSaving(false);
    if (failure) {
      setError(failure);
      if (created.length === 0 && skipped.length === 0) return;
    }
    onDone({ created: created.length, skipped, failure });
  };

  return (
    <Modal
      open
      title={`Add ${items.length} selected item${items.length === 1 ? '' : 's'}`}
      onCancel={saving ? undefined : onClose}
      closable={!saving}
      maskClosable={!saving}
      destroyOnClose
      width="min(720px, calc(100vw - 32px))"
      footer={
        <Flex justify="end" gap={8} wrap="wrap">
          <Button onClick={onClose} disabled={saving} style={{ minHeight: 44 }}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={submit} icon={<PlusOutlined />} style={{ minHeight: 44, background: colors.primary, borderColor: colors.primary }}>
            {saving ? `Adding… ${progress}/${items.length}` : `Add ${items.length} to your store`}
          </Button>
        </Flex>
      }
    >
      <Text style={{ display: 'block', fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>
        Each item needs a price and a stock choice. Brand and pack details come from the catalogue.
      </Text>
      <Flex wrap="wrap" gap={8} align="center" style={{ marginBottom: 10 }}>
        <Button size="small" onClick={() => applyAll((e) => (e.mrp ? { price: e.mrp } : null))} disabled={saving}>
          Price = MRP
        </Button>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>Stock for all</Text>
        <InputNumber size="small" min={0} precision={0} value={stockForAll} onChange={setStockForAll} style={{ width: 80 }} aria-label="Stock for all counted items" />
        <Button size="small" disabled={saving || stockForAll === null} onClick={() => applyAll((e) => (e.mode === 'tracked' ? { qty: stockForAll } : null))}>
          Apply
        </Button>
      </Flex>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 8 }} />}
      <div className="sc-bulk-list">
        {items.map((it) => {
          const e = entries[it.id];
          const problem = showErrors ? entryError(e) : e.mrp && Number(e.price) > Number(e.mrp) ? 'Price is above MRP' : null;
          return (
            <div className="sc-bulk-row" key={it.id} style={{ flexWrap: 'wrap' }}>
              <div className="sc-bulk-row-name">
                <div className="sc-item-name">{it.name}</div>
                <div className="sc-item-meta">{[it.brand, it.size, it.unit].filter(Boolean).join(' · ')}</div>
                {problem && <div style={{ color: colors.semantic.error, fontSize: 12 }}>{problem}</div>}
              </div>
              <InputNumber
                min={0}
                precision={2}
                prefix="₹"
                placeholder="Price *"
                value={e.price ?? null}
                disabled={saving}
                status={problem && problem.startsWith('Price') ? 'error' : undefined}
                onChange={(v) => setEntry(it.id, { price: v })}
                style={{ width: 120, minHeight: 44 }}
                aria-label={`Price for ${it.name}`}
              />
              <InputNumber
                min={0}
                precision={2}
                placeholder="MRP"
                value={e.mrp ?? null}
                disabled={saving}
                onChange={(v) => setEntry(it.id, { mrp: v })}
                style={{ width: 100, minHeight: 44 }}
                aria-label={`MRP for ${it.name}`}
              />
              {it.kind === 'service' ? (
                <Text style={{ fontSize: 12, color: colors.textMuted }}>Always available</Text>
              ) : (
                <Segmented size="small" options={STOCK_MODE_OPTIONS} value={e.mode} disabled={saving} onChange={(m) => setEntry(it.id, { mode: m })} aria-label={`Stock mode for ${it.name}`} />
              )}
              {e.mode === 'tracked' && (
                <InputNumber
                  min={0}
                  precision={0}
                  placeholder="Stock *"
                  value={e.qty ?? null}
                  disabled={saving}
                  status={problem && problem.includes('stock') ? 'error' : undefined}
                  onChange={(v) => setEntry(it.id, { qty: v })}
                  style={{ width: 100, minHeight: 44 }}
                  aria-label={`Stock for ${it.name}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

BulkAddModal.propTypes = {
  items: PropTypes.array.isRequired,
  shopId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

const StoreCatalogueScreen = () => {
  const history = useHistory();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isPhone = !screens.sm; // under 576px: card list and bottom bar

  const shopParam = new URLSearchParams(location.search).get('shop_id');

  const [shops, setShops] = useState([]);
  const [shopsLoaded, setShopsLoaded] = useState(false);
  const [listings, setListings] = useState([]);

  const [scope, setScope] = useState(SCOPE_SHOP);
  const [searchText, setSearchText] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Selection survives paging and filter changes: Map of item id -> catalogue item
  const [selected, setSelected] = useState(() => new Map());
  const [singleItem, setSingleItem] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [summary, setSummary] = useState(null);

  const shop = useMemo(
    () => shops.find((s) => String(s.id) === shopParam) || shops[0] || null,
    [shops, shopParam]
  );
  const shopId = shop?.id ?? null;
  const shopSubs = useMemo(() => shopSubCategories(shop), [shop]);

  // Shops: the owner's stores (the same list the listings page uses)
  useEffect(() => {
    let cancelled = false;
    netWorkCall(apiConfig.my_shops, 'POST', null, true)
      .then((res) => {
        if (!cancelled && Array.isArray(res?.data)) setShops(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setShopsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A different store starts from its own categories with an empty selection
  useEffect(() => {
    setScope(SCOPE_SHOP);
    setPage(1);
    setSelected(new Map());
  }, [shopId]);

  // The shop's listings: lets rows show Added / Needs details and opens the editor
  const loadListings = useCallback(() => {
    if (!shopId) return Promise.resolve();
    return netWorkCall(`${apiConfig.listings_by_shop}/${shopId}`, 'GET', null, true)
      .then((res) => {
        if (Array.isArray(res?.data)) setListings(res.data);
      })
      .catch(() => {});
  }, [shopId]);

  useEffect(() => {
    loadListings();
  }, [loadListings, reloadTick]);

  const loadRows = useCallback(() => {
    if (!shopId) return undefined;
    let cancelled = false;
    const params = new URLSearchParams();
    params.set('shop_id', String(shopId));
    params.set('limit', String(pageSize));
    params.set('offset', String((page - 1) * pageSize));
    if (q) params.set('q', q);
    if (scope !== SCOPE_SHOP) params.set('sub_category_id', String(scope));
    if (kindFilter !== 'all') params.set('kind', kindFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);

    setLoading(true);
    setLoadError(null);
    netWorkCall(`${apiConfig.catalog_browse}?${params.toString()}`, 'GET', null, true)
      .then((res) => {
        if (cancelled) return;
        if (!Array.isArray(res?.data)) {
          setRows([]);
          setTotal(0);
          setLoadError(
            isCatalogueUnavailable(res)
              ? 'Catalogue not available yet. You can still add custom items or import a CSV from your store.'
              : apiErrorText(res, 'Could not load the master catalogue.')
          );
          return;
        }
        setRows(res.data);
        setTotal(Number(res.count) || 0);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not reach the catalogue. Check your connection and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shopId, page, pageSize, q, scope, kindFilter, statusFilter]);

  useEffect(() => loadRows(), [loadRows, reloadTick]);

  // Debounce the search box; a new search starts at page 1
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchText.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchText]);

  const reloadAll = useCallback(() => setReloadTick((n) => n + 1), []);

  const listingsById = useMemo(() => {
    const m = new Map();
    listings.forEach((l) => m.set(String(l.id), l));
    return m;
  }, [listings]);

  const viewRows = useMemo(
    () =>
      rows.map((item) => ({
        ...item,
        _status: rowStatus(item, listingsById),
        _listing: item.already_added ? listingsById.get(String(item.already_added)) || null : null,
      })),
    [rows, listingsById]
  );

  // Owners browse only their own sub-categories (spec §B1.1)
  const scopeOptions = useMemo(
    () => [
      { value: SCOPE_SHOP, label: shopSubs.length > 1 ? 'All my categories' : shopSubs[0]?.name || 'Your store categories' },
      ...(shopSubs.length > 1 ? shopSubs.map((sc) => ({ value: sc.id, label: sc.name })) : []),
    ],
    [shopSubs]
  );

  const changeScope = (value) => {
    setScope(value);
    setPage(1);
  };

  const changeStatus = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const changeKind = (value) => {
    setKindFilter(value);
    setPage(1);
  };

  // Selection
  const selectedKeys = useMemo(() => Array.from(selected.keys()), [selected]);
  const selectedItems = useMemo(() => Array.from(selected.values()), [selected]);

  const setSelectedMany = (items, checked) =>
    setSelected((prev) => {
      const next = new Map(prev);
      items.forEach((it) => {
        if (checked) next.set(it.id, it);
        else next.delete(it.id);
      });
      return next;
    });

  const openEditor = (listing) => {
    if (!listing) {
      message.info('Your copy is still loading. Try again in a moment.');
      return;
    }
    setEditingListing(listing);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingListing(null);
  };

  const confirmRemove = (item, listing) => {
    if (!listing) return;
    Modal.confirm({
      title: `Remove "${item.name}" from your store?`,
      content: "This deletes your store's copy and its price. The master catalogue is not changed.",
      okText: 'Remove from store',
      okButtonProps: { danger: true },
      cancelText: 'Keep it',
      onOk: async () => {
        const res = await netWorkCall(`${apiConfig.listings_delete}/${listing.id}`, 'DELETE', null, true);
        if (res?.success) {
          message.success('Removed from your store');
          setSelectedMany([item], false);
          reloadAll();
        } else {
          message.error(res?.error || 'Could not remove this item');
        }
      },
    });
  };

  const renderActions = (item) => {
    const status = item._status;
    if (status === 'not') {
      return (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setSingleItem(item)} className="sc-touch" style={{ background: colors.primary, borderColor: colors.primary }}>
          Add
        </Button>
      );
    }
    return (
      <div className="sc-actions">
        <Button icon={<EditOutlined />} onClick={() => openEditor(item._listing)} disabled={!item._listing} className="sc-touch">
          Edit
        </Button>
        {status === 'needs' && (
          <Button icon={<ToolOutlined />} onClick={() => openEditor(item._listing)} className="sc-touch">
            Fill missing
          </Button>
        )}
        <Button danger icon={<DeleteOutlined />} onClick={() => confirmRemove(item, item._listing)} disabled={!item._listing} className="sc-touch">
          Remove from store
        </Button>
      </div>
    );
  };

  const columns = [
    {
      title: 'Item',
      key: 'item',
      width: 280,
      render: (_, item) => <ItemName item={item} />,
    },
    {
      title: 'Brand / size / unit',
      key: 'meta',
      width: 200,
      render: (_, item) => [item.brand, item.size, item.unit].filter(Boolean).join(' · ') || '—',
    },
    {
      title: 'Category',
      key: 'category',
      width: 200,
      render: (_, item) => categoryText(item.category_path) || '—',
    },
    {
      title: 'MRP',
      key: 'price_hint',
      width: 110,
      align: 'right',
      render: (_, item) => formatRupees(item.mrp_hint ?? item.price_hint) || '—',
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_, item) => <StatusTag status={item._status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 330,
      render: (_, item) => renderActions(item),
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedKeys,
    onSelect: (record, checked) => setSelectedMany([record], checked),
    onSelectAll: (checked, _selectedRows, changeRows) => setSelectedMany(changeRows, checked),
    getCheckboxProps: (record) => ({
      disabled: record._status !== 'not',
      'aria-label': `Select ${record.name}`,
    }),
  };

  const pagination = {
    current: page,
    pageSize,
    total,
    showSizeChanger: true,
    pageSizeOptions: [25, 50, 100],
    onChange: (p, ps) => {
      setPage(p);
      setPageSize(ps);
    },
  };

  const reloadButton = (
    <Button icon={<ReloadOutlined />} onClick={reloadAll} className="sc-touch" aria-label="Refresh catalogue" />
  );

  const renderBody = () => {
    if (loadError) {
      return (
        <Alert
          type="warning"
          showIcon
          message={loadError}
          action={<Button size="small" onClick={reloadAll}>Try again</Button>}
        />
      );
    }
    if (viewRows.length === 0 && !loading) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={q ? `No catalogue items match "${q}"` : 'No catalogue items match these filters'}
        />
      );
    }
    if (isPhone) {
      return (
        <div className="sc-cards">
          {viewRows.map((item) => (
            <div className="sc-card" key={item.id}>
              <div className="sc-card-check">
                <Checkbox
                  checked={selected.has(item.id)}
                  disabled={item._status !== 'not'}
                  onChange={(e) => setSelectedMany([item], e.target.checked)}
                  aria-label={`Select ${item.name}`}
                />
              </div>
              <div className="sc-card-body">
                <ItemName item={item} />
                <div className="sc-item-meta">
                  {[item.brand, item.size, item.unit].filter(Boolean).join(' · ')}
                  {categoryText(item.category_path) ? ` · ${categoryText(item.category_path)}` : ''}
                </div>
                <Flex align="center" gap={8} wrap="wrap" style={{ marginTop: 6 }}>
                  <StatusTag status={item._status} />
                  {formatRupees(item.mrp_hint ?? item.price_hint) && (
                    <Text style={{ fontSize: 13 }}>MRP {formatRupees(item.mrp_hint ?? item.price_hint)}</Text>
                  )}
                </Flex>
              </div>
              <div className="sc-card-actions">{renderActions(item)}</div>
            </div>
          ))}
          <Pagination
            align="center"
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
            onChange={(p) => setPage(p)}
          />
        </div>
      );
    }
    return (
      <Table
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={viewRows}
        loading={loading}
        rowSelection={rowSelection}
        pagination={pagination}
        sticky={{ offsetHeader: 64 }}
        scroll={{ x: 1100 }}
      />
    );
  };

  if (shopsLoaded && !shop) {
    return (
      <div className="sc-page">
        <Empty description="No store found for this account">
          <Button type="primary" onClick={() => history.push(routes.client)}>
            Go to your stores
          </Button>
        </Empty>
      </div>
    );
  }

  const backToStore = () => history.push(shopId ? `${routes.client}?shop_id=${shopId}` : routes.client);

  return (
    <div className="sc-page">
      <div className="sc-topbar">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={backToStore}
          className="sc-touch"
          aria-label="Back to store listings"
        >
          {!isPhone && 'Back to listings'}
        </Button>
        <div className="sc-title">Master catalogue</div>
        <Select
          value={scope}
          onChange={changeScope}
          options={scopeOptions}
          className="sc-scope-select"
          style={{ minHeight: 44 }}
          aria-label="Category"
          showSearch
          optionFilterProp="label"
        />
      </div>

      <p className="sc-note">
        Your store keeps its own copy with the catalogue&apos;s details. Changes here don&apos;t affect the master catalogue.{' '}
        {shopId && (
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => history.push(`${routes.client}?shop_id=${shopId}&add=catalogue`)}>
            Try the quick picker in Manage store
          </Button>
        )}
      </p>

      <div className="ms-filterbar sc-filterbar">
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: colors.textMuted }} />}
          placeholder="Search name, brand or size"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="ms-filter-search"
          style={{ minHeight: 44 }}
          aria-label="Search master catalogue"
        />
        <Segmented options={STATUS_OPTIONS} value={statusFilter} onChange={changeStatus} aria-label="Status" />
        <Segmented options={KIND_OPTIONS} value={kindFilter} onChange={changeKind} aria-label="Kind" />
        <Flex wrap="wrap" gap={8} style={{ marginInlineStart: 'auto' }}>
          {reloadButton}
          <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)} className="sc-touch" disabled={!shop}>
            Import CSV
          </Button>
        </Flex>
      </div>

      {renderBody()}

      {selected.size > 0 && (
        <div className={`sc-bulkbar${isPhone ? ' is-phone' : ''}`} role="region" aria-label="Selected catalogue items">
          <Text strong>{selected.size} selected</Text>
          <Flex wrap="wrap" gap={8}>
            <Button icon={<CloseOutlined />} onClick={() => setSelected(new Map())} className="sc-touch">
              Clear selection
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setBulkOpen(true)} className="sc-touch" style={{ background: colors.primary, borderColor: colors.primary }}>
              Add selected ({selected.size})
            </Button>
          </Flex>
        </div>
      )}

      {singleItem && shopId && (
        <SingleAddModal
          item={singleItem}
          shopId={shopId}
          onClose={() => setSingleItem(null)}
          onAdded={() => {
            setSingleItem(null);
            setSelectedMany([singleItem], false);
            reloadAll();
          }}
        />
      )}

      {bulkOpen && shopId && selectedItems.length > 0 && (
        <BulkAddModal
          items={selectedItems}
          shopId={shopId}
          onClose={() => setBulkOpen(false)}
          onDone={(result) => {
            setBulkOpen(false);
            setSelected(new Map());
            // Names are taken now, while the selection still holds the items
            setSummary({
              ...result,
              skipped: result.skipped.map((s) => ({ ...s, name: selectedNameFor(s.item_id, selectedItems, rows) })),
            });
            reloadAll();
          }}
        />
      )}

      <Modal
        open={!!summary}
        title="Import finished"
        onCancel={() => setSummary(null)}
        footer={<Button type="primary" onClick={() => setSummary(null)}>OK</Button>}
        width="min(520px, calc(100vw - 32px))"
      >
        {summary && (
          <Flex vertical gap={12}>
            <Alert
              type={summary.created > 0 ? 'success' : 'info'}
              showIcon
              message={`${summary.created} item${summary.created === 1 ? '' : 's'} added to your store`}
            />
            {summary.failure && <Alert type="error" showIcon message={summary.failure} />}
            {summary.skipped.length > 0 && (
              <>
                <Text strong>{summary.skipped.length} skipped</Text>
                <ul style={{ maxHeight: 240, overflowY: 'auto', paddingLeft: 18, margin: 0 }}>
                  {summary.skipped.map((s) => (
                    <li key={`${s.item_id}-${s.reason}`} style={{ marginBottom: 4, fontSize: 13 }}>
                      {s.name}: {s.message || codeText(s.reason, 'Could not be added')}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Flex>
        )}
      </Modal>

      {editorOpen && (
        <AddProductModal
          open={editorOpen}
          onClose={closeEditor}
          onSuccess={() => {
            closeEditor();
            reloadAll();
          }}
          shop={shop}
          editingItem={editingListing}
        />
      )}

      {shop && (
        <ImportProductCsvModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          shop={shop}
          onSuccess={() => reloadAll()}
        />
      )}
    </div>
  );
};

// Name for a skipped item id: from this import's selection, else the rows on screen
const selectedNameFor = (itemId, items, rows) => {
  const hit = items.find((it) => it.id === itemId) || rows.find((it) => it.id === itemId);
  return hit?.name || `Item ${itemId}`;
};

export default StoreCatalogueScreen;
