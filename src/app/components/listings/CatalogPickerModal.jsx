import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Modal, Input, InputNumber, Button, Typography, Flex, Tag, Alert, Empty, Spin, message } from 'antd';
import { SearchOutlined, AppstoreOutlined, CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../utils';
import { colors, radii, typography, shadows } from '../../styles/theme';

const { Text } = Typography;

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 20;

const CARD_STYLE = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
  padding: '12px 14px',
  boxShadow: shadows.card,
};

const Thumb = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  const box = {
    width: 56,
    height: 56,
    flexShrink: 0,
    borderRadius: radii.md,
    background: colors.surfaceContainerLow,
    border: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };
  if (!src || failed) {
    return (
      <div style={box}>
        <AppstoreOutlined style={{ fontSize: 22, color: colors.textMuted }} />
      </div>
    );
  }
  return (
    <div style={box}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
};

Thumb.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
};

const CatalogPickerModal = ({ open, shopId, onClose, onImported }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  // Per-item draft state keyed by catalog item id: { price, stock, status, error }
  const [rows, setRows] = useState({});
  const requestSeq = useRef(0);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Reset everything when the modal closes
  useEffect(() => {
    if (!open) {
      requestSeq.current += 1; // ignore any in-flight response
      setQuery('');
      setDebouncedQuery('');
      setResults([]);
      setLoading(false);
      setSearchError(null);
      setRows({});
    }
  }, [open]);

  // Run the search
  useEffect(() => {
    if (!open) return;
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      requestSeq.current += 1;
      setResults([]);
      setLoading(false);
      setSearchError(null);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    setSearchError(null);
    netWorkCall(
      `${apiConfig.catalog_search}?q=${encodeURIComponent(debouncedQuery)}&limit=${RESULT_LIMIT}`,
      'GET',
      null,
      true
    )
      .then((res) => {
        if (seq !== requestSeq.current) return;
        if (res?.success) {
          setResults(Array.isArray(res.data) ? res.data : []);
        } else {
          setResults([]);
          setSearchError(res?.error || res?.message || 'Catalog search is not available right now');
        }
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setSearchError('Could not reach the catalog. Check your connection and try again.');
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
  }, [open, debouncedQuery]);

  const patchRow = (id, patch) => {
    setRows((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const addItem = async (item) => {
    const row = rows[item.id] || {};
    const price = Number(row.price);
    if (!(price > 0)) {
      patchRow(item.id, { error: 'Enter a price greater than 0' });
      return;
    }
    patchRow(item.id, { status: 'saving', error: null });
    try {
      const res = await netWorkCall(
        apiConfig.catalog_import,
        'POST',
        JSON.stringify({
          shop_id: shopId,
          item_id: item.id,
          price,
          stock_quantity: row.stock ?? null,
        }),
        true
      );
      if (res?.success) {
        patchRow(item.id, { status: 'added', error: null });
        message.success(res.message || 'Added to your store');
        onImported?.(res.data);
      } else {
        const text = `${res?.error || ''} ${res?.message || ''}`;
        if (/already|409/i.test(text)) {
          patchRow(item.id, { status: 'exists', error: null });
        } else {
          patchRow(item.id, { status: 'idle', error: res?.error || res?.message || 'Could not add this item' });
        }
      }
    } catch (err) {
      patchRow(item.id, { status: 'idle', error: 'Network error. Please try again.' });
    }
  };

  const renderHelper = () => (
    <div style={{ textAlign: 'center', padding: '28px 12px', color: colors.textMuted }}>
      <AppstoreOutlined style={{ fontSize: 32, color: colors.primary, marginBottom: 8 }} />
      <div style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain, marginBottom: 4 }}>
        Find products in the master catalog
      </div>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>
        Type at least {MIN_QUERY_LENGTH} characters. You only set your price and stock; name, brand and image come from the catalog.
      </Text>
    </div>
  );

  const renderRow = (item) => {
    const row = rows[item.id] || {};
    const added = row.status === 'added';
    const exists = row.status === 'exists';
    const saving = row.status === 'saving';
    const locked = added || exists;
    const subtitle = [item.brand, item.quantity_label].filter(Boolean).join(' · ');

    return (
      <div key={item.id} style={CARD_STYLE}>
        <Flex wrap="wrap" gap={12} align="flex-start">
          <Flex gap={12} align="center" style={{ flex: '1 1 200px', minWidth: 0 }}>
            <Thumb src={item.image_url} alt={item.name} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: typography.fontFamily.headline,
                  fontWeight: 700,
                  fontSize: 14,
                  color: colors.textMain,
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                }}
              >
                {item.name}
              </div>
              {subtitle && (
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{subtitle}</div>
              )}
              {item.category && (
                <Tag style={{ marginTop: 4, marginInlineEnd: 0, fontSize: 11, borderRadius: radii.xs }}>
                  {item.category}
                </Tag>
              )}
            </div>
          </Flex>

          <Flex wrap="wrap" gap={8} align="flex-end" style={{ flex: '1 1 260px' }}>
            {locked ? (
              <Tag
                icon={<CheckCircleOutlined />}
                color="success"
                style={{ height: 40, lineHeight: '38px', padding: '0 12px', margin: 0, fontWeight: 600 }}
              >
                {added ? 'Added' : 'Already in your store'}
              </Tag>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Price (₹) *</div>
                  <InputNumber
                    size="large"
                    min={0}
                    precision={2}
                    prefix="₹"
                    placeholder="0.00"
                    value={row.price ?? null}
                    disabled={saving}
                    onChange={(v) => patchRow(item.id, { price: v, error: null })}
                    style={{ width: 130 }}
                    aria-label={`Price for ${item.name}`}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Stock</div>
                  <InputNumber
                    size="large"
                    min={0}
                    precision={0}
                    placeholder="Optional"
                    value={row.stock ?? null}
                    disabled={saving}
                    onChange={(v) => patchRow(item.id, { stock: v })}
                    style={{ width: 110 }}
                    aria-label={`Stock for ${item.name}`}
                  />
                </div>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  loading={saving}
                  onClick={() => addItem(item)}
                  style={{
                    background: colors.primary,
                    borderColor: colors.primary,
                    borderRadius: radii.md,
                    fontWeight: 700,
                    minHeight: 40,
                  }}
                >
                  Add to store
                </Button>
              </>
            )}
          </Flex>
        </Flex>
        {row.error && (
          <Text type="danger" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
            {row.error}
          </Text>
        )}
      </div>
    );
  };

  const renderBody = () => {
    if (!shopId) {
      return <Alert type="warning" showIcon message="Choose a store before adding catalog items." />;
    }
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      return renderHelper();
    }
    if (loading && results.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin />
        </div>
      );
    }
    if (searchError) {
      return <Alert type="warning" showIcon message={searchError} />;
    }
    if (results.length === 0) {
      return <Empty description={`No catalog items match "${debouncedQuery}"`} />;
    }
    return <Flex vertical gap={10}>{results.map(renderRow)}</Flex>;
  };

  return (
    <Modal
      title={
        <span
          style={{
            fontFamily: typography.fontFamily.headline,
            fontWeight: 700,
            color: colors.textMain,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AppstoreOutlined style={{ color: colors.primary }} />
          Add from master catalog
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(720px, calc(100vw - 32px))"
      style={{ top: 20, maxWidth: 'calc(100vw - 32px)' }}
      styles={{ body: { maxHeight: 'max(280px, calc(100vh - 220px))', overflowY: 'auto', paddingRight: 4 } }}
      destroyOnHidden
    >
      <Input
        size="large"
        allowClear
        autoFocus
        prefix={<SearchOutlined style={{ color: colors.textMuted }} />}
        placeholder="Search e.g. butter 500g, tshirt, paracetamol"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 14, borderRadius: radii.md }}
        aria-label="Search master catalog"
      />
      {renderBody()}
    </Modal>
  );
};

CatalogPickerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  shopId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClose: PropTypes.func.isRequired,
  onImported: PropTypes.func,
};

export { CatalogPickerModal };
export default CatalogPickerModal;
