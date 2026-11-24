import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Checkbox, Dropdown, Empty, Input, InputNumber, Modal, Segmented, Select, Skeleton, Typography, message } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  FolderOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { apiErrorText } from '../../../app/utils/catalogue_api';
import { availabilityLabels } from '../../../app/utils/stock';
import useShopListings from './useShopListings';
import { ListingThumb, ListingPrice, StockPill, NeedsDetailsDot, sectionName } from './ListingBits';
import { HubCards } from './AddProductsHub';
import { patchInventory, buildStockUpdates, assignSection, deleteListings } from './inventoryApi';
import './manage_store_catalog.css';

const { Title, Text } = Typography;

const EMPTY_TITLES = {
  Products: 'No products yet',
  Menu: 'No menu items yet',
  Services: 'No services yet',
};

const STOCK_FILTERS = (summary, labels) => [
  { label: `All ${summary.total}`, value: 'all' },
  { label: `${labels.on} ${summary.in_stock}`, value: 'in' },
  { label: `Low ${summary.low}`, value: 'low' },
  { label: `${labels.off} ${summary.out}`, value: 'out' },
];

/**
 * Products tab (spec §F1): paged list from listings/manage with search, sub-category,
 * section and stock filters, plus a bulk bar for the selected rows.
 */
const ProductsTab = ({
  shop,
  sections,
  subCategories,
  active,
  isPhone,
  labels,
  catalogue,
  initialStockFilter,
  refreshKey,
  onSummary,
  onOpenHub,
  onOpenPicker,
  onCreateCustom,
  onImportCsv,
  onEdit,
  onChanged,
}) => {
  const shopId = shop?.id;
  const [modal, modalHolder] = Modal.useModal();
  const [searchText, setSearchText] = useState('');
  const [q, setQ] = useState('');
  const [subFilter, setSubFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState(initialStockFilter || 'all');
  const [needsDetails, setNeedsDetails] = useState(false);
  const [sort, setSort] = useState('default');
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState('');
  const [pending, setPending] = useState({});

  const stockLabels = availabilityLabels(shop?.shopSubCategory?.listing_type);

  useEffect(() => {
    if (initialStockFilter) setStockFilter(initialStockFilter);
  }, [initialStockFilter]);

  useEffect(() => {
    const t = setTimeout(() => setQ(searchText.trim()), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  // A new outlet starts with no filters
  useEffect(() => {
    setSearchText('');
    setQ('');
    setSubFilter('all');
    setSectionFilter('all');
    setNeedsDetails(false);
    setSelected(new Set());
  }, [shopId]);

  const filters = {
    q: q.length > 0 ? q.slice(0, 100) : undefined,
    sub_category_id: subFilter,
    section_id: sectionFilter,
    stock: stockFilter,
    needs_details: needsDetails ? 1 : undefined,
    sort: sort === 'default' ? undefined : sort,
  };
  const list = useShopListings(shopId, filters, { pageSize: 30 });
  const { items, summary } = list;

  useEffect(() => {
    if (list.loaded) onSummary?.(summary);
  }, [summary, list.loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coming back to this tab, or another screen saved something: refresh quietly
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
    setSelected(new Set());
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setSelected(new Set()), [q, subFilter, sectionFilter, stockFilter, needsDetails]);

  const hasFilters = Boolean(q) || subFilter !== 'all' || sectionFilter !== 'all' || stockFilter !== 'all' || needsDetails;
  const selectedItems = useMemo(() => items.filter((i) => selected.has(i.id)), [items, selected]);

  const toggleSelect = (id, checked) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const clearFilters = () => {
    setSearchText('');
    setQ('');
    setSubFilter('all');
    setSectionFilter('all');
    setStockFilter('all');
    setNeedsDetails(false);
  };

  /* ---------- Actions ---------- */

  const applyStock = async (targets, direction, qty) => {
    const { updates, unchanged } = buildStockUpdates(targets, direction, qty);
    if (updates.length === 0) {
      message.info('Nothing to change: always-available items stay available.');
      return;
    }
    setBusy(direction === 'in' ? 'in' : 'out');
    const res = await patchInventory(shopId, updates);
    setBusy('');
    list.mergeItems(res.updated);
    if (res.error) message.error(apiErrorText(res.error, 'Could not update stock'));
    else {
      const skippedText = res.skipped.length + unchanged > 0 ? ` · ${res.skipped.length + unchanged} unchanged` : '';
      message.success(`${res.updated.length} updated${skippedText}`);
    }
    setSelected(new Set());
    list.reload({ silent: true });
    onChanged?.();
  };

  const markInStock = (targets) => {
    const counted = targets.filter((t) => t.stock_mode === 'tracked');
    if (counted.length === 0) {
      applyStock(targets, 'in');
      return;
    }
    let qty = 10;
    modal.confirm({
      title: `Set quantity for ${counted.length} counted ${counted.length === 1 ? 'item' : 'items'}`,
      content: (
        <div className="mc-qty-dialog">
          <label htmlFor="mc-bulk-qty">Quantity in stock for each</label>
          <InputNumber id="mc-bulk-qty" min={1} precision={0} defaultValue={qty} inputMode="numeric" onChange={(v) => (qty = v)} style={{ width: 120 }} />
        </div>
      ),
      okText: 'Mark in stock',
      cancelText: 'Cancel',
      centered: true,
      onOk: () => applyStock(targets, 'in', qty || 1),
    });
  };

  const moveToSection = async (sectionId) => {
    const ids = selectedItems.map((i) => i.id);
    if (ids.length === 0) return;
    setBusy('move');
    const res = await assignSection(shopId, ids, sectionId);
    setBusy('');
    if (res.error) {
      message.error(apiErrorText(res.error, 'Could not move these items'));
      return;
    }
    message.success(`${res.updated} moved to ${sectionName(sections, sectionId) || 'the section'}`);
    setSelected(new Set());
    list.reload({ silent: true });
    onChanged?.({ sections: true });
  };

  const confirmDelete = (targets) => {
    const n = targets.length;
    modal.confirm({
      title: n === 1 ? `Delete "${targets[0].name}"?` : `Delete ${n} items?`,
      content: 'They are removed from your storefront. This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Keep',
      centered: true,
      onOk: async () => {
        setBusy('delete');
        const res = await deleteListings(targets.map((t) => t.id));
        setBusy('');
        list.removeItems(res.deleted);
        setSelected(new Set());
        if (res.failed.length) message.error(`${res.failed.length} could not be deleted`);
        if (res.deleted.length) message.success(`${res.deleted.length} deleted`);
        list.reload({ silent: true });
        onChanged?.({ sections: true });
      },
    });
  };

  // One row's on/off switch, from its menu
  const toggleOne = async (item) => {
    setPending((p) => ({ ...p, [item.id]: true }));
    const direction = item.is_available === false ? 'in' : 'out';
    if (item.stock_mode === 'tracked' && direction === 'in') {
      setPending((p) => ({ ...p, [item.id]: false }));
      markInStock([item]);
      return;
    }
    await applyStock([item], direction);
    setPending((p) => ({ ...p, [item.id]: false }));
  };

  /* ---------- Render ---------- */

  const sectionOptions = [
    { label: 'All sections', value: 'all' },
    ...sections.map((s) => ({ label: s.is_hidden ? `${s.name} (hidden)` : s.name, value: s.id })),
  ];

  const rowMenu = (item) => ({
    items: [
      { key: 'edit', icon: <EditOutlined />, label: 'Edit details' },
      item.stock_mode !== 'always'
        ? {
            key: 'toggle',
            icon: item.is_available === false ? <CheckCircleOutlined /> : <StopOutlined />,
            label: item.is_available === false ? `Mark ${stockLabels.on.toLowerCase()}` : `Mark ${stockLabels.off.toLowerCase()}`,
            disabled: Boolean(pending[item.id]),
          }
        : null,
      { type: 'divider' },
      { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
    ].filter(Boolean),
    onClick: ({ key, domEvent }) => {
      domEvent?.stopPropagation?.();
      if (key === 'edit') onEdit(item);
      if (key === 'toggle') toggleOne(item);
      if (key === 'delete') confirmDelete([item]);
    },
  });

  const renderRow = (item) => {
    const isSelected = selected.has(item.id);
    const secName = sectionName(sections, item.section_id);
    return (
      <div key={item.id} className={`ms-item-row mc-row ${item.is_available === false ? 'is-off' : ''} ${isSelected ? 'is-selected' : ''}`}>
        <Checkbox
          className="mc-row-check"
          checked={isSelected}
          onChange={(e) => toggleSelect(item.id, e.target.checked)}
          aria-label={`Select ${item.name}`}
        />
        <button type="button" className="ms-item-row-thumb-btn" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}>
          <ListingThumb src={item.img_url} alt="" className="ms-thumb--row" />
        </button>
        <div className="ms-item-row-main">
          <div className="ms-item-row-top">
            <div className="ms-item-name" title={item.name}>
              <NeedsDetailsDot show={Boolean(item.needs_details)} />
              {item.name}
            </div>
            <Dropdown menu={rowMenu(item)} trigger={['click']} placement="bottomRight">
              <Button type="text" className="ms-icon-btn" icon={<MoreOutlined />} aria-label={`More actions for ${item.name}`} />
            </Dropdown>
          </div>
          <ListingPrice item={item} />
          <div className="mc-row-tags">
            <StockPill item={item} />
            {secName && <span className="ms-mini-tag">{secName}</span>}
            {item.catalog_item_id && <span className="ms-mini-tag ms-mini-tag--master">From catalogue</span>}
            {item.needs_details && <span className="mc-needs-text">Needs details</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderBody = () => {
    if (list.loading && !list.loaded) {
      return (
        <div className="ms-item-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ms-item-row">
              <Skeleton active avatar={{ shape: 'square', size: 64 }} title={{ width: '70%' }} paragraph={{ rows: 2, width: ['35%', '60%'] }} />
            </div>
          ))}
        </div>
      );
    }
    if (list.error && items.length === 0) {
      return (
        <div className="ms-state">
          <Alert
            type="error"
            showIcon
            message="Your products didn't load"
            description={list.error}
            action={
              <Button size="small" icon={<ReloadOutlined />} onClick={() => list.reload({ silent: false })}>
                Retry
              </Button>
            }
          />
        </div>
      );
    }
    if (summary.total === 0 && !hasFilters) {
      return (
        <div className="mc-empty-hub">
          <div className="ms-empty-title">{EMPTY_TITLES[labels.tabText] || `No ${labels.tabText.toLowerCase()} yet`}</div>
          <div className="ms-empty-text">Most stores start with the catalogue.</div>
          <HubCards
            catalogue={catalogue}
            subNames={subCategories.map((s) => s.name)}
            onSearchCatalogue={onOpenPicker}
            onCreateCustom={onCreateCustom}
            onImportCsv={onImportCsv}
          />
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="ms-empty ms-empty--compact">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${labels.itemPlural} match these filters`}>
            <Button onClick={clearFilters}>Clear filters</Button>
          </Empty>
        </div>
      );
    }
    return (
      <>
        <div className="ms-item-list">{items.map(renderRow)}</div>
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

  const allVisibleSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  // On phones the top toolbar scrolls away, so keep the primary action in a sticky bottom bar.
  // The bulk bar takes the bottom slot while rows are selected.
  const showPhoneCta = Boolean(isPhone) && selected.size === 0;

  return (
    <div className={`ms-tab-pane${showPhoneCta ? ' has-phone-cta' : ''}`}>
      {modalHolder}
      <div className="ms-toolbar">
        <div className="ms-toolbar-text">
          <Title level={5} className="ms-section-title">
            {labels.title}
          </Title>
          <Text className="ms-section-desc">{labels.desc}</Text>
        </div>
        <div className="ms-toolbar-actions">
          <Button type="primary" icon={<PlusOutlined />} onClick={onOpenHub} className="ms-btn-primary ms-toolbar-primary">
            Add products
          </Button>
        </div>
      </div>

      {(summary.total > 0 || hasFilters) && (
        <div className="ms-filterbar">
          <Input
            allowClear
            prefix={<SearchOutlined className="ms-muted" />}
            placeholder={`Search ${labels.tabText.toLowerCase()}`}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="ms-filter-search"
            aria-label={`Search ${labels.tabText.toLowerCase()}`}
            maxLength={100}
          />
          {subCategories.length > 1 && (
            <div className="mc-chips" role="radiogroup" aria-label="Category">
              {[{ id: 'all', name: 'All' }, ...subCategories].map((s) => {
                const on = String(subFilter) === String(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`lc-chip ${on ? 'is-active' : ''}`}
                    onClick={() => setSubFilter(s.id)}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
          <div className="ms-filter-scroll">
            <Segmented value={stockFilter} onChange={setStockFilter} options={STOCK_FILTERS(summary, stockLabels)} />
          </div>
          <div className="ms-filter-selects">
            {sections.length > 0 && (
              <Select
                value={sectionFilter}
                onChange={setSectionFilter}
                className="ms-filter-select"
                popupMatchSelectWidth={false}
                aria-label="Filter by section"
                options={sectionOptions}
              />
            )}
            <Select
              value={sort}
              onChange={setSort}
              className="ms-filter-select"
              popupMatchSelectWidth={false}
              aria-label="Sort items"
              options={[
                { label: 'Sort: In stock first', value: 'default' },
                { label: 'Newest first', value: 'newest' },
                { label: 'Name A–Z', value: 'name' },
                { label: 'Price: low to high', value: 'price_asc' },
                { label: 'Price: high to low', value: 'price_desc' },
              ]}
            />
            {summary.needs_details > 0 && (
              <Checkbox checked={needsDetails} onChange={(e) => setNeedsDetails(e.target.checked)}>
                Needs details ({summary.needs_details})
              </Checkbox>
            )}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="mc-select-all">
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={selected.size > 0 && !allVisibleSelected}
            onChange={(e) => setSelected(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())}
          >
            Select all shown
          </Checkbox>
        </div>
      )}

      {list.error && items.length > 0 && (
        <Alert
          type="warning"
          showIcon
          className="ms-inline-alert"
          message="Showing the last loaded list. Refresh failed."
          action={
            <Button size="small" onClick={() => list.reload({ silent: true })}>
              Retry
            </Button>
          }
        />
      )}

      {renderBody()}

      {showPhoneCta && (
        <div className="mc-phone-cta" role="region" aria-label="Add products">
          <Button type="primary" block icon={<PlusOutlined />} onClick={onOpenHub} className="ms-btn-primary">
            Add products
          </Button>
        </div>
      )}

      {selected.size > 0 && (
        <div className={`mc-bulkbar ${isPhone ? 'is-phone' : ''}`} role="region" aria-label="Selected items">
          <span className="mc-bulkbar-count">{selected.size} selected</span>
          <div className="mc-bulkbar-actions">
            <Dropdown
              trigger={['click']}
              disabled={sections.length === 0}
              menu={{
                items: sections.map((s) => ({ key: String(s.id), label: s.name })),
                onClick: ({ key }) => moveToSection(Number(key)),
              }}
            >
              <Button icon={<FolderOutlined />} loading={busy === 'move'}>
                Move to section
              </Button>
            </Dropdown>
            <Button icon={<CheckCircleOutlined />} loading={busy === 'in'} onClick={() => markInStock(selectedItems)}>
              Mark {stockLabels.on.toLowerCase()}
            </Button>
            <Button icon={<StopOutlined />} loading={busy === 'out'} onClick={() => applyStock(selectedItems, 'out')}>
              Mark {stockLabels.off.toLowerCase()}
            </Button>
            <Button danger icon={<DeleteOutlined />} loading={busy === 'delete'} onClick={() => confirmDelete(selectedItems)}>
              Delete
            </Button>
            <Button type="text" icon={<CloseOutlined />} onClick={() => setSelected(new Set())} aria-label="Clear selection" />
          </div>
        </div>
      )}
    </div>
  );
};

ProductsTab.propTypes = {
  shop: PropTypes.object.isRequired,
  sections: PropTypes.array.isRequired,
  subCategories: PropTypes.array.isRequired,
  active: PropTypes.bool,
  isPhone: PropTypes.bool,
  labels: PropTypes.shape({
    title: PropTypes.string,
    desc: PropTypes.string,
    tabText: PropTypes.string,
    itemPlural: PropTypes.string,
  }).isRequired,
  catalogue: PropTypes.object,
  initialStockFilter: PropTypes.string,
  refreshKey: PropTypes.number,
  onSummary: PropTypes.func,
  onOpenHub: PropTypes.func.isRequired,
  onOpenPicker: PropTypes.func.isRequired,
  onCreateCustom: PropTypes.func.isRequired,
  onImportCsv: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onChanged: PropTypes.func,
};

export default ProductsTab;
