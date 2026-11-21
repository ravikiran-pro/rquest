import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  Input,
  Select,
  Button,
  Tag,
  Avatar,
  Space,
  Modal,
  Form,
  InputNumber,
  AutoComplete,
  Popconfirm,
  Tooltip,
  Typography,
  Flex,
  Upload,
  Descriptions,
  Empty,
  Alert,
  Pagination,
  Skeleton,
  Grid,
  message,
} from 'antd';
import {
  PlusOutlined,
  PictureOutlined,
  EditOutlined,
  DeleteOutlined,
  UndoOutlined,
  ReloadOutlined,
  UploadOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { apiConfig, config, storageKeys } from '../../app/utils';
import { colors, typography, radii } from '../../app/styles/theme';

const { Text } = Typography;

const STATUS_HELP = {
  verified: 'Checked by a person. Pipeline re-runs never change it.',
  ready: 'Complete enough for merchants. Pipeline re-runs may update it.',
  incomplete: 'Missing brand, category or quantity. Not offered to merchants.',
  rejected: 'Removed or marked as a duplicate.',
  removed: 'Hidden from merchants. Restore it to offer it again.',
};

const STATUS_META = {
  verified: {
    label: 'Verified',
    icon: <SafetyCertificateOutlined />,
    color: colors.semantic.successHover,
    bg: colors.semantic.successLight,
    border: colors.semantic.successBorder,
  },
  ready: {
    label: 'Ready',
    icon: <CheckCircleOutlined />,
    color: colors.semantic.info,
    bg: colors.semantic.infoLight,
    border: colors.semantic.infoBorder,
  },
  incomplete: {
    label: 'Incomplete',
    icon: <ExclamationCircleOutlined />,
    color: colors.tertiary,
    bg: colors.semantic.warningLight,
    border: colors.semantic.warningBorder,
  },
  rejected: {
    label: 'Rejected',
    icon: <StopOutlined />,
    color: colors.semantic.error,
    bg: colors.semantic.errorLight,
    border: colors.semantic.errorBorder,
  },
  removed: {
    label: 'Removed',
    icon: <MinusCircleOutlined />,
    color: colors.textMuted,
    bg: colors.surfaceContainer,
    border: colors.border,
  },
};

const SOURCE_LABELS = {
  'jan-aushadhi': 'Jan Aushadhi',
  'off-india': 'Open Food Facts',
  'curated-items': 'Curated',
  admin: 'Admin',
};

const KIND_LABELS = { product: 'Product', service: 'Service' };

const PAGE_SIZE = 20;
const DEFAULT_FILTERS = { search: '', source: '', status: '', kind: '', active: 'true' };
const MIGRATE_COMMAND = 'npm run catalog:migrate';

const qs = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

/**
 * Same request as netWorkCall (same URL, headers and body), but it keeps the HTTP status
 * and survives a body that is not JSON, so the screen can tell "catalog not set up" (503)
 * and proxy errors apart from an ordinary failure.
 */
const callApi = async (endpoint, method = 'GET', payload) => {
  const headers = { 'Content-Type': 'application/json' };
  const token =
    sessionStorage.getItem(storageKeys.auth_token) || localStorage.getItem(storageKeys.auth_token);
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${config.api_url}/api/v1/${endpoint}`, { method, headers, body: payload });
  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }
  if (!data || typeof data !== 'object') {
    data = {
      success: false,
      error: `The server answered ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
    };
  }
  if (!response.ok && data.success === undefined) data.success = false;
  return { ...data, httpStatus: response.status };
};

const getJson = (endpoint, params = {}) => {
  const query = qs(params);
  return callApi(query ? `${endpoint}?${query}` : endpoint, 'GET');
};

const itemPath = (id) => `${apiConfig.catalog_items}/${encodeURIComponent(id)}`;

const isNotSetUp = (res) =>
  res?.httpStatus === 503 || /not (been )?set up|catalog:migrate/i.test(res?.error || '');

const formatQty = (r) => {
  if (r.net_quantity === null || r.net_quantity === undefined) return r.quantity_text || '—';
  const n = Number(r.net_quantity);
  if (r.unit === 'g' && n >= 1000) return `${n / 1000} kg`;
  if (r.unit === 'ml' && n >= 1000) return `${n / 1000} l`;
  return `${n} ${r.unit}`;
};

const itemSubtitle = (r) =>
  [r.brand_name, r.gtin ? `GTIN ${r.gtin.replace(/^0+(?=\d{8,})/, '')}` : null].filter(Boolean).join(' · ') || r.id;

/** Status pill: "Removed" wins over the pipeline status for inactive items. */
const StatusTag = ({ status, active }) => {
  const key = active === false ? 'removed' : status;
  const meta = STATUS_META[key] || { label: key || 'Unknown', color: colors.textMuted, bg: colors.surfaceContainer, border: colors.border };
  return (
    <Tooltip title={STATUS_HELP[key]}>
      <Tag
        className="admin-status-tag"
        icon={meta.icon}
        style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
      >
        {meta.label}
      </Tag>
    </Tooltip>
  );
};

StatusTag.propTypes = {
  status: PropTypes.string,
  active: PropTypes.bool,
};

const QUALITY_HELP =
  'Completeness out of 100: name 25, brand 15, quantity 15, category 15, barcode 15, image 10, diet tag 5. Items need 70+ with a name, brand and category to be ready for merchants.';

/** 0–100 completeness score as a number plus a short bar. */
const QualityMeter = ({ score }) => {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return <Text type="secondary">—</Text>;
  }
  const value = Math.max(0, Math.min(100, Math.round(Number(score))));
  const tone =
    value >= 70 ? colors.semantic.success : value >= 40 ? colors.semantic.warning : colors.semantic.error;
  return (
    <Tooltip title={QUALITY_HELP}>
      <span className="admin-quality" aria-label={`Quality ${value} out of 100`}>
        <span className="admin-quality__value">{value}</span>
        <span className="admin-quality__track" aria-hidden="true">
          <span className="admin-quality__fill" style={{ width: `${value}%`, background: tone }} />
        </span>
      </span>
    </Tooltip>
  );
};

QualityMeter.propTypes = {
  score: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

const TaxCell = ({ record: r }) =>
  r.effective_hsn ? (
    <Tooltip
      title={`${r.hsn_basis === 'item' ? 'Set on this item' : 'Category default'}${
        r.gst_rate_verified ? ' · rate verified' : ' · rate unverified'
      }`}
    >
      <span style={{ whiteSpace: 'nowrap' }}>
        HSN {r.effective_hsn}
        {r.gst_rate !== null && r.gst_rate !== undefined && (
          <Tag style={{ marginLeft: 6, marginRight: 0 }} color={r.gst_rate_verified ? 'green' : 'default'}>
            {Number(r.gst_rate)}% GST
          </Tag>
        )}
      </span>
    </Tooltip>
  ) : (
    <Text type="secondary">No HSN</Text>
  );

TaxCell.propTypes = {
  record: PropTypes.object.isRequired,
};

/** Select backed by a search endpoint (debounced). */
const RemoteSelect = ({ endpoint, mapOption, initialOption, value, onChange, placeholder }) => {
  const [options, setOptions] = useState(initialOption ? [initialOption] : []);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  const search = (term) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getJson(endpoint, { search: term });
        setOptions((res?.data || []).map(mapOption));
      } catch (error) {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (initialOption) setOptions([initialOption]);
  }, [initialOption && initialOption.value]);

  return (
    <Select
      showSearch
      allowClear
      value={value || undefined}
      onChange={(v) => onChange(v || null)}
      onSearch={search}
      onFocus={() => options.length <= 1 && search('')}
      filterOption={false}
      loading={loading}
      options={options}
      placeholder={placeholder}
      notFoundContent={loading ? 'Searching…' : 'Type to search'}
      optionLabelProp="label"
      popupMatchSelectWidth
    />
  );
};

RemoteSelect.propTypes = {
  endpoint: PropTypes.string.isRequired,
  mapOption: PropTypes.func.isRequired,
  initialOption: PropTypes.shape({ value: PropTypes.string, label: PropTypes.string }),
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
};

const BrandInput = ({ value, onChange }) => {
  const [options, setOptions] = useState([]);
  const timer = useRef(null);
  const search = (term) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await getJson(apiConfig.catalog_brands, { search: term });
        setOptions((res?.data || []).map((b) => ({ value: b.name })));
      } catch (error) {
        setOptions([]);
      }
    }, 300);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <AutoComplete
      value={value}
      onChange={onChange}
      onSearch={search}
      options={options}
      placeholder="e.g. Amul (new brands are created automatically)"
      allowClear
    />
  );
};

BrandInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
};

const ItemModal = ({ open, item, onClose, onSaved, isPhone }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [details, setDetails] = useState(null);
  const isEdit = Boolean(item && item.id);
  const imageUrl = Form.useWatch('image_url', form);
  const [subOptions, setSubOptions] = useState([]);

  // The app's sub-categories (8 categories, 118 sub-categories) for the picker
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    getJson(apiConfig.catalog_sub_category_options)
      .then((res) => {
        if (!cancelled) setSubOptions(res?.data || []);
      })
      .catch(() => {
        if (!cancelled) setSubOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setDetails(null);
    form.resetFields();
    if (isEdit) {
      form.setFieldsValue({
        name: item.name,
        kind: item.kind,
        brand: item.brand_name || '',
        net_quantity: item.net_quantity !== null && item.net_quantity !== undefined ? Number(item.net_quantity) : null,
        unit: item.unit,
        quantity_text: item.quantity_text,
        taxonomy_node_id: item.taxonomy_node_id,
        sub_category_ids: (item.sub_categories || []).map((s) => s.id),
        hsn_code: item.hsn_code,
        country_of_origin: item.country_of_origin,
        manufacturer: item.manufacturer,
        image_url: item.image_url,
        status: item.status === 'incomplete' || item.status === 'ready' ? 'verified' : item.status,
      });
      getJson(itemPath(item.id))
        .then((res) => {
          if (!cancelled && res?.success) setDetails(res.data);
        })
        .catch(() => {});
    } else {
      form.setFieldsValue({ kind: 'product', status: 'verified' });
    }
    return () => {
      cancelled = true;
    };
  }, [open, item]);

  const onImageUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('fileData', file);
      const token =
        sessionStorage.getItem(storageKeys.auth_token) || localStorage.getItem(storageKeys.auth_token);
      const response = await fetch(`${config.api_url}/api/v1/${apiConfig.upload}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const resJson = await response.json();
      const url = resJson?.data?.Location;
      if (url) form.setFieldsValue({ image_url: url });
      else message.error('Image upload failed');
    } catch (error) {
      message.error('Image upload failed');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const submit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch (error) {
      return; // the form shows what to fix
    }
    const payload = {
      ...values,
      net_quantity: values.net_quantity ?? null,
      unit: values.net_quantity ? values.unit : null,
    };
    if (isEdit) delete payload.gtin;
    setSaving(true);
    try {
      const res = await callApi(
        isEdit ? itemPath(item.id) : apiConfig.catalog_items,
        isEdit ? 'PUT' : 'POST',
        JSON.stringify(payload)
      );
      if (!res?.success) {
        message.error(res?.error || 'Could not save the item');
        return;
      }
      message.success(res.message || 'Saved');
      onSaved(res.data);
    } catch (error) {
      message.error('Could not save the item');
    } finally {
      setSaving(false);
    }
  };

  const categoryOption =
    isEdit && item.taxonomy_node_id
      ? { value: item.taxonomy_node_id, label: item.category_path || item.taxonomy_node_id }
      : null;
  const hsnOption = isEdit && item.hsn_code ? { value: item.hsn_code, label: item.hsn_code } : null;

  return (
    <Modal
      open={open}
      className="admin-modal"
      title={isEdit ? 'Edit catalog item' : 'Add catalog item'}
      onCancel={onClose}
      onOk={submit}
      okText={isEdit ? 'Save changes' : 'Create item'}
      confirmLoading={saving}
      okButtonProps={{ disabled: uploading }}
      width="min(720px, calc(100vw - 24px))"
      style={{ top: isPhone ? 12 : 48, maxWidth: 'calc(100vw - 24px)', paddingBottom: 12 }}
      maskClosable={!saving}
      forceRender
    >
      {isEdit && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12, overflowWrap: 'anywhere' }}>
          {item.id} · from {SOURCE_LABELS[item.primary_source] || item.primary_source}. Saving marks the item as
          checked by a person, so pipeline re-runs will not overwrite your edits.
        </Text>
      )}
      <Form form={form} layout="vertical" requiredMark="optional">
        <Flex gap={12} wrap="wrap">
          <Form.Item
            name="name"
            label="Name"
            style={{ flex: '2 1 260px', minWidth: 0 }}
            rules={[{ required: true, whitespace: true, message: 'Name is required' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="kind" label="Type" style={{ flex: '1 1 140px', minWidth: 0 }}>
            <Select options={[{ value: 'product', label: 'Product' }, { value: 'service', label: 'Service' }]} />
          </Form.Item>
        </Flex>
        <Flex gap={12} wrap="wrap">
          <Form.Item name="brand" label="Brand" style={{ flex: '1 1 220px', minWidth: 0 }}>
            <BrandInput />
          </Form.Item>
          <Form.Item
            name="gtin"
            label="Barcode (GTIN / EAN)"
            style={{ flex: '1 1 200px', minWidth: 0 }}
            tooltip="Set when the item is created; it becomes the item's identity."
          >
            {isEdit ? (
              <Input disabled placeholder={item.gtin || 'No barcode'} />
            ) : (
              <Input inputMode="numeric" placeholder="8, 12, 13 or 14 digits" />
            )}
          </Form.Item>
        </Flex>
        <Flex gap={12} wrap="wrap">
          <Form.Item name="net_quantity" label="Net quantity" style={{ flex: '1 1 120px', minWidth: 0 }}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g. 500" />
          </Form.Item>
          <Form.Item
            name="unit"
            label="Unit"
            style={{ flex: '1 1 120px', minWidth: 0 }}
            dependencies={['net_quantity']}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, v) =>
                  getFieldValue('net_quantity') && !v ? Promise.reject(new Error('Pick a unit')) : Promise.resolve(),
              }),
            ]}
          >
            <Select
              allowClear
              options={[
                { value: 'g', label: 'grams (g)' },
                { value: 'ml', label: 'millilitres (ml)' },
                { value: 'pc', label: 'pieces (pc)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="quantity_text" label="Pack label" style={{ flex: '1 1 160px', minWidth: 0 }}>
            <Input placeholder="e.g. 2 x 200 ml" />
          </Form.Item>
        </Flex>
        <Form.Item
          name="sub_category_ids"
          label="Shop sub-categories"
          tooltip="Shops in these sub-categories can offer this item. Pick one or more."
        >
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Choose the sub-categories this item belongs to"
            maxTagCount="responsive"
            options={subOptions.map((s) => ({ value: s.id, label: `${s.category_name} › ${s.name}` }))}
          />
        </Form.Item>
        <Form.Item name="taxonomy_node_id" label="Category">
          <RemoteSelect
            endpoint={apiConfig.catalog_taxonomy}
            initialOption={categoryOption}
            placeholder="Search categories, e.g. rice, dairy, plumbing"
            mapOption={(n) => ({ value: n.id, label: n.full_path, title: n.id })}
          />
        </Form.Item>
        <Flex gap={12} wrap="wrap">
          <Form.Item
            name="hsn_code"
            label="HSN / SAC code"
            style={{ flex: '2 1 260px', minWidth: 0 }}
            tooltip="Leave empty to use the category's default HSN."
          >
            <RemoteSelect
              endpoint={apiConfig.catalog_hsn}
              initialOption={hsnOption}
              placeholder="Search by code or description"
              mapOption={(h) => ({
                value: h.code,
                label: `${h.code} — ${(h.description || '').slice(0, 70)}`,
                title: h.description,
              })}
            />
          </Form.Item>
          <Form.Item
            name="country_of_origin"
            label="Country (ISO)"
            style={{ flex: '1 1 110px', minWidth: 0 }}
            rules={[{ pattern: /^[A-Za-z]{2}$/, message: '2 letters, e.g. IN' }]}
          >
            <Input maxLength={2} placeholder="IN" />
          </Form.Item>
        </Flex>
        <Form.Item name="manufacturer" label="Manufacturer">
          <Input />
        </Form.Item>
        <Form.Item label="Image">
          <div className="admin-image-field">
            <Avatar
              shape="square"
              size={56}
              src={imageUrl || undefined}
              icon={!imageUrl ? <PictureOutlined /> : undefined}
              style={{ background: colors.primaryLight, color: colors.primary, flexShrink: 0 }}
            />
            <div className="admin-image-field__input">
              <Form.Item name="image_url" noStyle>
                <Input placeholder="https://…" aria-label="Image URL" />
              </Form.Item>
            </div>
            <Upload beforeUpload={onImageUpload} showUploadList={false} accept="image/*">
              <Button icon={<UploadOutlined />} loading={uploading}>
                Upload
              </Button>
            </Upload>
          </div>
        </Form.Item>
        <Form.Item name="status" label="Status" tooltip={STATUS_HELP.verified}>
          <Select
            options={[
              { value: 'verified', label: 'Verified — protect my edits from pipeline re-runs' },
              { value: 'ready', label: 'Ready — let pipeline re-runs update this item' },
              { value: 'rejected', label: 'Rejected — hide from merchants' },
            ]}
          />
        </Form.Item>
      </Form>

      {isEdit && details && (
        <Descriptions size="small" column={1} bordered style={{ marginTop: 8 }}>
          <Descriptions.Item label="Effective HSN">
            {details.effective_hsn || '—'}{' '}
            {details.hsn_basis ? <Text type="secondary">({details.hsn_basis.replace('_', ' ')})</Text> : null}
          </Descriptions.Item>
          <Descriptions.Item label="Suggested GST">
            {details.gst_rate !== null && details.gst_rate !== undefined ? `${Number(details.gst_rate)}%` : '—'}{' '}
            {details.gst_rate !== null && details.gst_rate !== undefined && (
              <Tag color={details.gst_rate_verified ? 'green' : 'default'}>
                {details.gst_rate_verified ? 'verified' : 'unverified'}
              </Tag>
            )}
          </Descriptions.Item>
          {details.quality_score !== undefined && details.quality_score !== null && (
            <Descriptions.Item label="Quality">
              <QualityMeter score={details.quality_score} />
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Sources">
            {(details.sources || []).length
              ? details.sources.map((s) => (
                  <div key={`${s.source}:${s.source_id}`}>
                    {SOURCE_LABELS[s.source] || s.source} · {s.license}
                    {s.source_url && (
                      <>
                        {' · '}
                        <a href={s.source_url} target="_blank" rel="noreferrer">
                          link
                        </a>
                      </>
                    )}
                  </div>
                ))
              : 'Created by an admin'}
          </Descriptions.Item>
          {(details.reviews || []).length > 0 && (
            <Descriptions.Item label="Open review">
              {details.reviews.map((r) => (
                <Tag key={r.id} color="orange">
                  {r.kind.replace(/_/g, ' ')}
                </Tag>
              ))}
            </Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Modal>
  );
};

ItemModal.propTypes = {
  open: PropTypes.bool.isRequired,
  item: PropTypes.shape({
    id: PropTypes.string,
    gtin: PropTypes.string,
    kind: PropTypes.string,
    name: PropTypes.string,
    brand_name: PropTypes.string,
    net_quantity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    unit: PropTypes.string,
    quantity_text: PropTypes.string,
    taxonomy_node_id: PropTypes.string,
    sub_categories: PropTypes.arrayOf(PropTypes.object),
    category_path: PropTypes.string,
    hsn_code: PropTypes.string,
    country_of_origin: PropTypes.string,
    manufacturer: PropTypes.string,
    image_url: PropTypes.string,
    status: PropTypes.string,
    primary_source: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  isPhone: PropTypes.bool,
};

const ItemAvatar = ({ record, size }) => (
  <Avatar
    shape="square"
    size={size}
    src={record.image_url || undefined}
    icon={!record.image_url ? <PictureOutlined /> : undefined}
    alt=""
    style={{ background: colors.primaryLight, color: colors.primary, flexShrink: 0, borderRadius: radii.md }}
  />
);

ItemAvatar.propTypes = {
  record: PropTypes.object.isRequired,
  size: PropTypes.number,
};

const CatalogItems = () => {
  const screens = Grid.useBreakpoint();
  const isPhone = screens.md === false;
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  const [modal, setModal] = useState({ open: false, item: null });
  const [busyId, setBusyId] = useState(null);
  const requestId = useRef(0);

  const loadMeta = () =>
    getJson(apiConfig.catalog_meta)
      .then((res) => res?.success && setMeta(res.data))
      .catch(() => {});

  const load = useCallback(
    async (nextPage = page) => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const res = await getJson(apiConfig.catalog_items, {
          ...filters,
          limit: PAGE_SIZE,
          offset: (nextPage - 1) * PAGE_SIZE,
        });
        if (id !== requestId.current) return; // a newer request owns the screen
        if (!res?.success) {
          setLoadError({
            notSetUp: isNotSetUp(res),
            fromApi: true,
            message: res?.error || res?.message || 'Could not load the catalog',
          });
          return;
        }
        const data = res.data || [];
        const count = res.count || 0;
        // The page emptied (e.g. its last item was removed): show the last page that has items
        if (data.length === 0 && nextPage > 1 && count > 0) {
          const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE));
          if (lastPage < nextPage) {
            load(lastPage);
            return;
          }
        }
        setLoadError(null);
        setRows(data);
        setTotal(count);
        setPage(nextPage);
      } catch (error) {
        if (id !== requestId.current) return;
        setLoadError({ notSetUp: false, fromApi: false, message: 'Could not reach the server. Check your connection and try again.' });
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoaded(true);
        }
      }
    },
    [filters, page]
  );

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    load(1);
  }, [filters]);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value || '' }));

  const hasFilters =
    Boolean(filters.search || filters.source || filters.status || filters.kind) || filters.active !== 'true';

  const clearFilters = () => {
    setSearchDraft('');
    setFilters(DEFAULT_FILTERS);
  };

  const reload = () => {
    load(page);
    loadMeta();
  };

  const mutate = async (record, request, fallbackError) => {
    setBusyId(record.id);
    try {
      const res = await request();
      if (!res?.success) {
        message.error(
          isNotSetUp(res) ? `${res?.error || fallbackError} Run ${MIGRATE_COMMAND}.` : res?.error || fallbackError
        );
        return;
      }
      message.success(res.message || 'Done');
      load(page);
      loadMeta();
    } catch (error) {
      message.error(fallbackError);
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = (record) =>
    mutate(record, () => callApi(itemPath(record.id), 'DELETE'), 'Could not remove the item');

  const restoreItem = (record) =>
    mutate(record, () => callApi(`${itemPath(record.id)}/restore`, 'POST'), 'Could not restore the item');

  const openEdit = (record) => setModal({ open: true, item: record });
  const openCreate = () => setModal({ open: true, item: null });

  const optionsFrom = (list, labels = {}) =>
    (list || []).map((o) => ({
      value: o.value,
      label: `${labels[o.value] || o.value} (${Number(o.count || 0).toLocaleString()})`,
    }));

  const renderActions = (r, block = false) => {
    const busy = busyId === r.id;
    const size = block ? 'middle' : 'small';
    const type = block ? 'default' : 'link';
    const edit = (
      <Button key="edit" type={type} size={size} icon={<EditOutlined />} onClick={() => openEdit(r)} disabled={busy}>
        Edit
      </Button>
    );
    const toggle = r.is_active ? (
      <Popconfirm
        key="remove"
        title="Remove this item?"
        description="It is hidden from merchants and can be restored later."
        onConfirm={() => removeItem(r)}
        okText="Remove"
        okButtonProps={{ danger: true }}
      >
        <Button type={type} size={size} danger icon={<DeleteOutlined />} loading={busy}>
          Remove
        </Button>
      </Popconfirm>
    ) : (
      <Button key="restore" type={type} size={size} icon={<UndoOutlined />} loading={busy} onClick={() => restoreItem(r)}>
        Restore
      </Button>
    );
    return block ? [edit, toggle] : (
      <Space size={0}>
        {edit}
        {toggle}
      </Space>
    );
  };

  const columns = [
    {
      title: 'Item',
      key: 'name',
      render: (_, r) => (
        <Flex gap={10} align="center" style={{ minWidth: 240, maxWidth: 340 }}>
          <ItemAvatar record={r} size={40} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: colors.textMain, overflowWrap: 'anywhere' }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {itemSubtitle(r)}
            </Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Shop sub-categories',
      dataIndex: 'sub_categories',
      render: (v) => {
        const subs = Array.isArray(v) ? v : [];
        if (!subs.length) return <Text type="secondary">Not linked</Text>;
        return (
          <Flex gap={4} wrap="wrap" style={{ maxWidth: 240 }}>
            {subs.slice(0, 2).map((s) => (
              <Tag key={s.id} style={{ margin: 0 }}>
                {s.name}
              </Tag>
            ))}
            {subs.length > 2 && <Tag style={{ margin: 0 }}>+{subs.length - 2}</Tag>}
          </Flex>
        );
      },
    },
    {
      title: 'Category',
      dataIndex: 'category_path',
      render: (v, r) => (
        <Flex gap={6} align="center" style={{ maxWidth: 240 }}>
          {r.kind === 'service' && (
            <Tag color="purple" style={{ margin: 0 }}>
              Service
            </Tag>
          )}
          {v ? (
            <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: v }}>
              {v}
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Uncategorised
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Qty',
      key: 'qty',
      render: (_, r) => <span style={{ whiteSpace: 'nowrap' }}>{formatQty(r)}</span>,
    },
    { title: 'HSN · GST', key: 'tax', render: (_, r) => <TaxCell record={r} /> },
    {
      title: (
        <Tooltip title={QUALITY_HELP}>
          <span>Quality</span>
        </Tooltip>
      ),
      key: 'quality',
      dataIndex: 'quality_score',
      render: (v) => <QualityMeter score={v} />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v, r) => <StatusTag status={v} active={r.is_active} />,
    },
    {
      title: 'Source',
      dataIndex: 'primary_source',
      render: (v) => (
        <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{SOURCE_LABELS[v] || v}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'action',
      fixed: 'right',
      render: (_, r) => renderActions(r),
    },
  ];

  const emptyState = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={hasFilters ? 'No items match these filters.' : 'The catalog has no items yet.'}
    >
      {hasFilters ? (
        <Button onClick={clearFilters}>Clear filters</Button>
      ) : (
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add the first item
        </Button>
      )}
    </Empty>
  );

  // The API answered with an error (503 "not set up" or success:false): show its text and the fix
  const renderError = () => {
    const notSetUp = Boolean(loadError.notSetUp);
    const hintShown = loadError.fromApi || notSetUp;
    const alertText = notSetUp ? 'The master catalog is not set up yet' : 'Could not load the catalog';
    return (
      <Alert
        role={notSetUp ? 'status' : 'alert'}
        type={notSetUp ? 'warning' : 'error'}
        showIcon
        message={alertText}
        description={
          <div className="admin-catalog-error">
            <div style={{ overflowWrap: 'anywhere' }}>{loadError.message}</div>
            {hintShown && !/catalog:migrate/.test(loadError.message) && (
              <div>
                Run <code>{MIGRATE_COMMAND}</code> on the server, then reload.
              </div>
            )}
            <Button size="small" icon={<ReloadOutlined />} onClick={reload} loading={loading}>
              {notSetUp ? 'Check again' : 'Try again'}
            </Button>
          </div>
        }
        style={{ borderRadius: radii.md }}
      />
    );
  };

  const renderCards = () => {
    if (!loaded && loading) {
      return (
        <div className="admin-card-list" aria-busy="true">
          {[0, 1, 2].map((k) => (
            <div key={k} className="admin-record-card">
              <Skeleton avatar={{ shape: 'square' }} active paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      );
    }
    if (rows.length === 0) return <div className="admin-state">{emptyState}</div>;
    return (
      <>
        <div className="admin-card-list" aria-busy={loading}>
          {rows.map((r) => (
            <article key={r.id} className="admin-record-card" style={{ opacity: loading ? 0.6 : 1 }}>
              <div className="admin-record-card__head">
                <ItemAvatar record={r} size={48} />
                <div className="admin-record-card__body">
                  <div className="admin-record-card__title">{r.name}</div>
                  <div className="admin-record-card__meta">{itemSubtitle(r)}</div>
                </div>
              </div>
              <div className="admin-record-card__chips">
                <StatusTag status={r.status} active={r.is_active} />
                {r.kind === 'service' && <Tag color="purple">Service</Tag>}
                <Tag>{formatQty(r)}</Tag>
                <TaxCell record={r} />
              </div>
              <div className="admin-record-card__row">
                <Text type="secondary" style={{ fontSize: 12, minWidth: 0 }} ellipsis={{ tooltip: r.category_path }}>
                  {r.category_path || 'Uncategorised'}
                </Text>
                <QualityMeter score={r.quality_score} />
              </div>
              <div className="admin-record-card__row" style={{ marginTop: 4 }}>
                <span>{SOURCE_LABELS[r.primary_source] || r.primary_source}</span>
              </div>
              <div className="admin-record-card__actions">{renderActions(r, true)}</div>
            </article>
          ))}
        </div>
        {total > PAGE_SIZE && (
          <div className="admin-card-pagination">
            <Pagination
              simple
              current={page}
              pageSize={PAGE_SIZE}
              total={total}
              showSizeChanger={false}
              onChange={(p) => load(p)}
            />
          </div>
        )}
      </>
    );
  };

  const notSetUp = Boolean(loadError?.notSetUp);

  return (
    <>
      <div className="admin-toolbar">
        <Input.Search
          className="admin-toolbar__search"
          allowClear
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Search name, brand, barcode or item id"
          aria-label="Search the catalog"
          onSearch={(v) => setFilter('search', v.trim())}
          disabled={notSetUp}
        />
        <div className="admin-toolbar__actions">
          <Tooltip title="Reload">
            <Button icon={<ReloadOutlined />} onClick={reload} aria-label="Reload" loading={loading && loaded} />
          </Tooltip>
          <Button
            type="primary"
            className="admin-toolbar__primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            disabled={notSetUp}
          >
            Add item
          </Button>
        </div>
      </div>

      {!notSetUp && (
        <div className="admin-filterbar">
          <Select
            allowClear
            placeholder="Source"
            aria-label="Filter by source"
            value={filters.source || undefined}
            onChange={(v) => setFilter('source', v)}
            options={optionsFrom(meta?.sources, SOURCE_LABELS)}
            popupMatchSelectWidth={false}
          />
          <Select
            allowClear
            placeholder="Status"
            aria-label="Filter by status"
            value={filters.status || undefined}
            onChange={(v) => setFilter('status', v)}
            options={optionsFrom(meta?.statuses, Object.fromEntries(Object.entries(STATUS_META).map(([k, m]) => [k, m.label])))}
            popupMatchSelectWidth={false}
          />
          <Select
            allowClear
            placeholder="Type"
            aria-label="Filter by type"
            value={filters.kind || undefined}
            onChange={(v) => setFilter('kind', v)}
            options={optionsFrom(meta?.kinds, KIND_LABELS)}
            popupMatchSelectWidth={false}
          />
          <Select
            aria-label="Show active or removed items"
            value={filters.active}
            onChange={(v) => setFilter('active', v)}
            options={[
              { value: 'true', label: 'Active items' },
              { value: 'false', label: 'Removed items' },
              { value: 'all', label: 'All items' },
            ]}
          />
          <div className="admin-filterbar__summary">
            {loaded && !loadError && (
              <span>
                {total.toLocaleString()} {total === 1 ? 'item' : 'items'}
              </span>
            )}
            {hasFilters && (
              <Button type="link" size="small" onClick={clearFilters} style={{ padding: 0 }}>
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}

      {loadError ? (
        renderError()
      ) : isPhone ? (
        renderCards()
      ) : (
        <div className="admin-table-wrap">
          <Table
            rowKey="id"
            size="middle"
            loading={loading}
            columns={columns}
            dataSource={rows}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: loading || !loaded ? ' ' : emptyState }}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              showSizeChanger: false,
              hideOnSinglePage: true,
              showTotal: (t, range) => (
                <span style={{ fontFamily: typography.fontFamily.body }}>
                  {range[0]}–{range[1]} of {t.toLocaleString()}
                </span>
              ),
            }}
            onChange={(pag) => load(pag.current)}
          />
        </div>
      )}

      <ItemModal
        open={modal.open}
        item={modal.item}
        isPhone={isPhone}
        onClose={() => setModal({ open: false, item: null })}
        onSaved={() => {
          setModal({ open: false, item: null });
          load(modal.item ? page : 1);
          loadMeta();
        }}
      />
    </>
  );
};

export default CatalogItems;
