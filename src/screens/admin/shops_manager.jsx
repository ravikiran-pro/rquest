import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  Button,
  Input,
  Tag,
  Select,
  Flex,
  Avatar,
  Grid,
  Alert,
  Empty,
  Pagination,
  Popconfirm,
  Skeleton,
  Spin,
  Tooltip,
  message,
} from 'antd';
import {
  ShopOutlined,
  SettingOutlined,
  ReloadOutlined,
  BuildOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  UserOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { apiConfig, netWorkCall } from '../../app/utils';
import { colors, radii, typography } from '../../app/styles/theme';
import FormSchemaBuilderModal from './form_schema_builder';

const headFont = typography.fontFamily.headline;
const bodyFont = typography.fontFamily.body;

const PAGE_SIZE_OPTIONS = ['8', '16', '32', '64'];

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const customFieldCount = (shop) => (Array.isArray(shop?.form_schema) ? shop.form_schema.length : 0);
const categoryFieldCount = (shop) =>
  Array.isArray(shop?.shopCategory?.form_schema) ? shop.shopCategory.form_schema.length : 0;
const categoryName = (shop) => shop?.shopCategory?.name || shop?.shop_type || 'No category';
const shopPhone = (shop) => shop?.mobile_number || shop?.owner?.mobile || '';
const shopLocation = (shop) => shop?.area || shop?.address || '';

/* ---------------- small pieces ---------------- */

const CategoryTag = ({ shop }) => (
  <Tag
    style={{
      margin: 0,
      fontWeight: 600,
      borderRadius: radii.full,
      padding: '1px 10px',
      background: colors.serviceChipBg,
      borderColor: colors.serviceChipBorder,
      color: colors.serviceChipText,
      fontSize: 12,
      fontFamily: bodyFont,
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}
  >
    {categoryName(shop)}
  </Tag>
);
CategoryTag.propTypes = { shop: PropTypes.object };

// Which product form the shop's listings use: its own override, or the category default
const FormStatusTag = ({ shop }) => {
  const custom = customFieldCount(shop);
  if (custom > 0) {
    return (
      <Tag
        icon={<BuildOutlined />}
        style={{
          margin: 0,
          fontWeight: 700,
          borderRadius: radii.full,
          padding: '1px 10px',
          background: colors.semantic.infoLight,
          borderColor: colors.semantic.infoBorder,
          color: colors.semantic.info,
          fontSize: 12,
          fontFamily: bodyFont,
          whiteSpace: 'nowrap',
        }}
      >
        Custom form · {custom} field{custom !== 1 ? 's' : ''}
      </Tag>
    );
  }
  const std = categoryFieldCount(shop);
  return (
    <Tag
      style={{
        margin: 0,
        fontWeight: 500,
        borderRadius: radii.full,
        padding: '1px 10px',
        background: colors.surfaceContainerLow,
        borderColor: colors.border,
        color: colors.textMuted,
        fontSize: 12,
        fontFamily: bodyFont,
        whiteSpace: 'nowrap',
      }}
    >
      Category form{std ? ` · ${std} field${std !== 1 ? 's' : ''}` : ''}
    </Tag>
  );
};
FormStatusTag.propTypes = { shop: PropTypes.object };

// Shops have no account status column; a map pin is what delivery distance and maps depend on
const PinStatusTag = ({ shop }) => {
  const pinned = shop?.latitude != null && shop?.longitude != null;
  return pinned ? (
    <Tag
      icon={<EnvironmentOutlined />}
      style={{
        margin: 0,
        fontWeight: 600,
        borderRadius: radii.full,
        padding: '1px 10px',
        background: colors.semantic.successLight,
        borderColor: colors.semantic.successBorder,
        color: colors.semantic.successHover,
        fontSize: 12,
        fontFamily: bodyFont,
        whiteSpace: 'nowrap',
      }}
    >
      Map pin set
    </Tag>
  ) : (
    <Tag
      style={{
        margin: 0,
        fontWeight: 500,
        borderRadius: radii.full,
        padding: '1px 10px',
        background: colors.surfaceContainerLow,
        borderColor: colors.border,
        color: colors.textMuted,
        fontSize: 12,
        fontFamily: bodyFont,
        whiteSpace: 'nowrap',
      }}
    >
      No map pin
    </Tag>
  );
};
PinStatusTag.propTypes = { shop: PropTypes.object };

const ShopAvatar = ({ shop, size }) => (
  <Avatar
    shape="square"
    size={size}
    src={shop.img_url || undefined}
    icon={<ShopOutlined />}
    alt=""
    style={{
      flex: `0 0 ${size}px`,
      borderRadius: radii.md,
      background: colors.primaryLight,
      color: colors.primary,
    }}
  />
);
ShopAvatar.propTypes = { shop: PropTypes.object.isRequired, size: PropTypes.number };

const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

/* ---------------- screen ---------------- */

const ShopsManager = () => {
  const screens = Grid.useBreakpoint();
  // useBreakpoint is empty on the first render; fall back to the window width
  const isPhone =
    screens.md === undefined ? typeof window !== 'undefined' && window.innerWidth < 768 : !screens.md;

  const [shopsList, setShopsList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  // What the list is fetched with. One object, so a filter change and the jump back
  // to page 1 land in a single update (and a single request).
  const [params, setParams] = useState({ page: 1, pageSize: 8, search: '', category: 'all' });
  const { page, pageSize } = params;
  const [reloadKey, setReloadKey] = useState(0);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [selectedShopForSchema, setSelectedShopForSchema] = useState(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const aliveRef = useRef(true);
  const requestIdRef = useRef(0);
  useEffect(
    () => () => {
      aliveRef.current = false;
    },
    []
  );

  // Categories for the filter dropdown
  useEffect(() => {
    netWorkCall(apiConfig.my_categories, 'GET', null, false)
      .then((res) => {
        if (aliveRef.current && Array.isArray(res?.data)) setCategories(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (aliveRef.current) setCategoriesLoading(false);
      });
  }, []);

  // Stores: refetch whenever the page, page size or applied filters change
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    netWorkCall(
      apiConfig.master_shops,
      'POST',
      JSON.stringify({
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
        search: params.search || '',
        category_id: params.category !== 'all' ? params.category : undefined,
      }),
      true
    )
      .then((res) => {
        // Ignore answers to requests that a newer one has replaced
        if (!aliveRef.current || requestId !== requestIdRef.current) return;
        if (res?.success) {
          const rows = Array.isArray(res.data) ? res.data : [];
          const count = Number(res.count) || 0;
          // The last page can empty out (e.g. after a refresh); step back to a page that has rows
          if (!rows.length && count > 0 && params.page > 1) {
            const lastPage = Math.max(1, Math.ceil(count / params.pageSize));
            setParams((prev) => ({ ...prev, page: lastPage }));
            return;
          }
          setShopsList(rows);
          setTotal(count);
          setLoadError(null);
          setHasLoaded(true);
        } else {
          setLoadError(res?.error || res?.message || 'Failed to load stores');
        }
      })
      .catch((err) => {
        console.error('Error fetching master shops:', err);
        if (aliveRef.current && requestId === requestIdRef.current) {
          setLoadError('Could not reach the server. Check your connection and try again.');
        }
      })
      .finally(() => {
        if (aliveRef.current && requestId === requestIdRef.current) setLoading(false);
      });
  }, [params, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const setPage = (p) => setParams((prev) => (prev.page === p ? prev : { ...prev, page: p }));

  const applySearch = (value) => {
    const search = (value || '').trim();
    setParams((prev) => (prev.search === search ? prev : { ...prev, search, page: 1 }));
  };

  // Search as the admin types (after a short pause); Enter / the search button applies at once
  useEffect(() => {
    const t = setTimeout(() => applySearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleCategoryFilter = (catId) => {
    setParams((prev) => (prev.category === catId ? prev : { ...prev, category: catId, page: 1 }));
  };

  const filtersActive = !!params.search || params.category !== 'all';
  const clearFilters = () => {
    setSearchInput('');
    setParams((prev) => ({ ...prev, search: '', category: 'all', page: 1 }));
  };

  const handleOpenFormBuilder = (shopRecord) => {
    setSelectedShopForSchema(shopRecord);
    setIsSchemaModalOpen(true);
  };

  // Drop the shop's own form so its listings use the category form again
  const handleRemoveOverride = async (shop) => {
    setRemovingId(shop.id);
    try {
      const res = await netWorkCall(
        apiConfig.master_shops_schema,
        'PUT',
        JSON.stringify({ shop_id: shop.id, form_schema: [] }),
        true
      );
      if (!aliveRef.current) return;
      if (res?.success) {
        message.success(`${shop.shop_name || 'The store'} now uses the standard ${categoryName(shop)} form`);
        setShopsList((prev) => prev.map((s) => (s.id === shop.id ? { ...s, form_schema: [] } : s)));
        reload();
      } else {
        message.error(res?.error || 'Could not remove the custom form');
      }
    } catch (err) {
      console.error(err);
      message.error('Could not remove the custom form');
    } finally {
      if (aliveRef.current) setRemovingId(null);
    }
  };

  /* ---------------- shared action buttons ---------------- */

  const renderActions = (shop, { block = false } = {}) => {
    const hasCustom = customFieldCount(shop) > 0;
    const btnHeight = block ? 40 : 34;
    return (
      <Flex gap={8} wrap="wrap" style={block ? { width: '100%' } : undefined}>
        <Button
          type={hasCustom ? 'primary' : 'default'}
          icon={hasCustom ? <EditOutlined /> : <SettingOutlined />}
          onClick={() => handleOpenFormBuilder(shop)}
          style={{
            flex: block ? '1 1 150px' : undefined,
            height: btnHeight,
            borderRadius: radii.md,
            fontWeight: 600,
            ...(hasCustom ? {} : { borderColor: colors.border, color: colors.primary }),
          }}
        >
          {hasCustom ? 'Edit custom form' : 'Customise form'}
        </Button>
        {hasCustom && (
          <Popconfirm
            title={`Remove ${shop.shop_name || 'this store'}'s custom form?`}
            description={
              <div style={{ maxWidth: 260 }}>
                New and edited listings go back to the standard {categoryName(shop)} form. Details already saved on
                listings are kept.
              </div>
            }
            okText="Remove"
            cancelText="Keep"
            okButtonProps={{ danger: true, loading: removingId === shop.id }}
            onConfirm={() => handleRemoveOverride(shop)}
            placement={block ? 'top' : 'topRight'}
          >
            <Tooltip title={block ? undefined : 'Remove custom form'}>
              <Button
                danger
                aria-label={`Remove custom form for ${shop.shop_name || 'store'}`}
                icon={<DeleteOutlined />}
                loading={removingId === shop.id}
                style={{
                  flex: block ? '1 1 150px' : undefined,
                  height: btnHeight,
                  minWidth: btnHeight,
                  borderRadius: radii.md,
                  fontWeight: 600,
                }}
              >
                {block ? 'Remove custom form' : null}
              </Button>
            </Tooltip>
          </Popconfirm>
        )}
      </Flex>
    );
  };

  /* ---------------- table (tablet & desktop) ---------------- */

  const colTitle = (text) => (
    <span style={{ fontFamily: headFont, fontWeight: 700, color: colors.textMain, fontSize: 13 }}>{text}</span>
  );

  const columns = [
    {
      title: colTitle('Store'),
      key: 'shop_name',
      width: 280,
      fixed: 'left',
      render: (_, record) => (
        <Flex align="center" gap={10} style={{ minWidth: 0 }}>
          <ShopAvatar shop={record} size={40} />
          <div style={{ minWidth: 0 }}>
            <div
              title={record.shop_name}
              style={{ ...ellipsis, fontWeight: 700, color: colors.textMain, fontSize: 14, fontFamily: headFont }}
            >
              {record.shop_name || 'Unnamed store'}
            </div>
            <Tooltip title={record.address && record.address !== record.area ? record.address : undefined}>
              <div style={{ ...ellipsis, fontSize: 12, color: colors.textMuted }}>
                <EnvironmentOutlined style={{ marginRight: 4, color: colors.tertiary }} />
                {shopLocation(record) || 'Location not specified'}
              </div>
            </Tooltip>
          </div>
        </Flex>
      ),
    },
    {
      title: colTitle('Category'),
      key: 'category',
      width: 160,
      render: (_, record) => <CategoryTag shop={record} />,
    },
    {
      title: colTitle('Owner & contact'),
      key: 'owner',
      width: 180,
      render: (_, record) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ ...ellipsis, fontWeight: 600, fontSize: 13, color: colors.textMain }}>
            {record.owner?.username || 'Owner not linked'}
          </div>
          <div style={{ ...ellipsis, fontSize: 12, color: colors.textMuted }}>
            <PhoneOutlined style={{ marginRight: 4, color: colors.secondary }} />
            {shopPhone(record) || 'No phone'}
          </div>
        </div>
      ),
    },
    {
      title: colTitle('Registered'),
      key: 'createdAt',
      width: 120,
      render: (_, record) => (
        <span style={{ fontSize: 13, color: colors.textMuted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          {formatDate(record.createdAt)}
        </span>
      ),
    },
    {
      title: colTitle('Status'),
      key: 'status',
      width: 200,
      render: (_, record) => (
        <Flex vertical gap={6} align="flex-start">
          <PinStatusTag shop={record} />
          <FormStatusTag shop={record} />
        </Flex>
      ),
    },
    {
      title: colTitle('Action'),
      key: 'action',
      width: 200,
      render: (_, record) => renderActions(record),
    },
  ];

  /* ---------------- phone cards ---------------- */

  const renderShopCard = (shop) => (
    <div key={shop.id} className="admin-record-card" style={{ padding: 14 }}>
      <Flex gap={12} align="flex-start" style={{ minWidth: 0 }}>
        <ShopAvatar shop={shop} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              lineHeight: 1.3,
              color: colors.textMain,
              fontFamily: headFont,
              overflowWrap: 'anywhere',
            }}
          >
            {shop.shop_name || 'Unnamed store'}
          </div>
          <Flex gap={6} wrap="wrap" style={{ marginTop: 6 }}>
            <CategoryTag shop={shop} />
            <PinStatusTag shop={shop} />
            <FormStatusTag shop={shop} />
          </Flex>
        </div>
      </Flex>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 6,
          marginTop: 12,
          paddingTop: 12,
          borderTop: `1px dashed ${colors.border}`,
          fontSize: 13,
          color: colors.textMuted,
        }}
      >
        <div style={ellipsis}>
          <UserOutlined style={{ marginRight: 6, color: colors.textLight }} />
          <span style={{ color: colors.textMain, fontWeight: 600 }}>{shop.owner?.username || 'Owner not linked'}</span>
          {shopPhone(shop) && (
            <>
              <span style={{ margin: '0 6px', color: colors.borderDark }}>·</span>
              <PhoneOutlined style={{ marginRight: 4, color: colors.secondary }} />
              {shopPhone(shop)}
            </>
          )}
        </div>
        <div style={{ overflowWrap: 'anywhere' }}>
          <EnvironmentOutlined style={{ marginRight: 6, color: colors.tertiary }} />
          {[shop.area, shop.address && shop.address !== shop.area ? shop.address : null].filter(Boolean).join(' · ') ||
            'Location not specified'}
        </div>
        <div>
          <CalendarOutlined style={{ marginRight: 6, color: colors.textLight }} />
          Registered {formatDate(shop.createdAt)}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>{renderActions(shop, { block: true })}</div>
    </div>
  );

  /* ---------------- states ---------------- */

  const emptyState = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        filtersActive
          ? params.search
            ? `No stores match “${params.search}”`
            : 'No stores in this category'
          : 'No stores have registered yet'
      }
    >
      {filtersActive && (
        <Button onClick={clearFilters} style={{ borderRadius: radii.md }}>
          Clear filters
        </Button>
      )}
    </Empty>
  );

  const rangeStart = total ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, total);
  const initialLoading = loading && !hasLoaded;

  const categoryOptions = [
    { value: 'all', label: 'All categories' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div style={{ fontFamily: bodyFont, minWidth: 0 }}>
      {/* Toolbar: search, category filter, refresh */}
      <Flex wrap="wrap" gap={10} align="center" style={{ marginBottom: 12 }}>
        <Input.Search
          aria-label="Search stores"
          placeholder="Search by store name, area, type or phone"
          allowClear
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onSearch={(value) => applySearch(value)}
          style={{ flex: isPhone ? '1 1 100%' : '1 1 280px', minWidth: 0, maxWidth: isPhone ? 'none' : 420 }}
        />
        <Flex gap={8} style={{ flex: isPhone ? '1 1 100%' : '0 1 auto', minWidth: 0 }}>
          <Select
            aria-label="Filter by category"
            value={params.category}
            onChange={handleCategoryFilter}
            loading={categoriesLoading}
            showSearch
            optionFilterProp="label"
            options={categoryOptions}
            popupMatchSelectWidth={false}
            style={{ flex: isPhone ? 1 : '0 0 220px', width: isPhone ? undefined : 220, minWidth: 0, height: 40 }}
          />
          <Tooltip title="Reload stores">
            <Button
              aria-label="Refresh stores"
              icon={<ReloadOutlined />}
              onClick={reload}
              loading={loading && hasLoaded}
              style={{ height: 40, minWidth: 40, borderRadius: radii.md, fontWeight: 600 }}
            >
              {isPhone ? null : 'Refresh'}
            </Button>
          </Tooltip>
        </Flex>
      </Flex>

      {/* Result summary */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={8} style={{ marginBottom: 12, minHeight: 22 }}>
        <span style={{ fontSize: 13, color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          {initialLoading
            ? 'Loading stores…'
            : total
            ? `Showing ${rangeStart}–${rangeEnd} of ${total} store${total !== 1 ? 's' : ''}`
            : 'No stores to show'}
        </span>
        {filtersActive && (
          <Button type="link" onClick={clearFilters} style={{ padding: 0, height: 'auto', fontWeight: 600 }}>
            Clear filters
          </Button>
        )}
      </Flex>

      {loadError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12, borderRadius: radii.md }}
          message={hasLoaded ? 'Showing the last stores that loaded' : 'Stores could not be loaded'}
          description={loadError}
          action={
            <Button size="small" danger onClick={reload} loading={loading}>
              Retry
            </Button>
          }
        />
      )}

      {isPhone ? (
        <Spin spinning={loading && hasLoaded}>
          {initialLoading ? (
            <div className="admin-card-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="admin-record-card" style={{ padding: 14 }}>
                  <Skeleton active avatar={{ shape: 'square', size: 48 }} paragraph={{ rows: 2 }} />
                </div>
              ))}
            </div>
          ) : shopsList.length === 0 ? (
            <div className="admin-record-card" style={{ padding: '24px 12px' }}>
              {loadError && !hasLoaded ? <Empty description="Stores could not be loaded" /> : emptyState}
            </div>
          ) : (
            <div className="admin-card-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shopsList.map(renderShopCard)}
            </div>
          )}
          {total > pageSize && (
            <Flex justify="center" style={{ marginTop: 14 }}>
              <Pagination
                simple
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </Flex>
          )}
        </Spin>
      ) : (
        <div
          className="admin-table-wrap"
          style={{ border: `1px solid ${colors.border}`, borderRadius: radii.lg, overflow: 'hidden', background: colors.surface }}
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={shopsList}
            loading={loading}
            scroll={{ x: 1140 }}
            locale={{ emptyText: loading ? ' ' : loadError && !hasLoaded ? 'Stores could not be loaded' : emptyState }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showTotal: (t, range) => `${range[0]}–${range[1]} of ${t}`,
              onChange: (p, size) =>
                setParams((prev) =>
                  size !== prev.pageSize ? { ...prev, pageSize: size, page: 1 } : { ...prev, page: p }
                ),
            }}
          />
        </div>
      )}

      {/* Store-specific product form builder */}
      <FormSchemaBuilderModal
        open={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        shop={selectedShopForSchema}
        onSuccess={reload}
      />
    </div>
  );
};

export default ShopsManager;
