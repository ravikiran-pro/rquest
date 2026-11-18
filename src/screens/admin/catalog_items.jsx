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
} from '@ant-design/icons';
import { apiConfig, config, netWorkCall } from '../../app/utils';
import { colors, typography, radii } from '../../app/styles/theme';

const { Text } = Typography;

const STATUS_COLORS = {
  verified: 'green',
  ready: 'blue',
  incomplete: 'orange',
  rejected: 'red',
};

const STATUS_HELP = {
  verified: 'Checked by a person. Pipeline re-runs never change it.',
  ready: 'Complete enough for merchants. Pipeline re-runs may update it.',
  incomplete: 'Missing brand, category or quantity. Not offered to merchants.',
  rejected: 'Removed or marked as a duplicate.',
};

const SOURCE_LABELS = {
  'jan-aushadhi': 'Jan Aushadhi',
  'off-india': 'Open Food Facts',
  'curated-items': 'Curated',
  admin: 'Admin',
};

const PAGE_SIZE = 20;

const qs = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

const getJson = (endpoint, params = {}) => {
  const query = qs(params);
  return netWorkCall(query ? `${endpoint}?${query}` : endpoint, 'GET', undefined, true);
};

const itemPath = (id) => `${apiConfig.catalog_items}/${encodeURIComponent(id)}`;

const formatQty = (r) => {
  if (r.net_quantity === null || r.net_quantity === undefined) return r.quantity_text || '—';
  const n = Number(r.net_quantity);
  if (r.unit === 'g' && n >= 1000) return `${n / 1000} kg`;
  if (r.unit === 'ml' && n >= 1000) return `${n / 1000} l`;
  return `${n} ${r.unit}`;
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
      const res = await getJson(apiConfig.catalog_brands, { search: term });
      setOptions((res?.data || []).map((b) => ({ value: b.name })));
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

const ItemModal = ({ open, item, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);
  const isEdit = Boolean(item && item.id);
  const imageUrl = Form.useWatch('image_url', form);

  useEffect(() => {
    if (!open) return;
    setDetails(null);
    form.resetFields();
    if (isEdit) {
      form.setFieldsValue({
        name: item.name,
        kind: item.kind,
        brand: item.brand_name || '',
        net_quantity: item.net_quantity !== null ? Number(item.net_quantity) : null,
        unit: item.unit,
        quantity_text: item.quantity_text,
        taxonomy_node_id: item.taxonomy_node_id,
        hsn_code: item.hsn_code,
        country_of_origin: item.country_of_origin,
        manufacturer: item.manufacturer,
        image_url: item.image_url,
        status: item.status === 'incomplete' || item.status === 'ready' ? 'verified' : item.status,
      });
      getJson(itemPath(item.id)).then((res) => res?.success && setDetails(res.data));
    } else {
      form.setFieldsValue({ kind: 'product', status: 'verified' });
    }
  }, [open, item]);

  const onImageUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('fileData', file);
      const response = await fetch(`${config.api_url}/api/v1/${apiConfig.upload}`, {
        method: 'POST',
        body: formData,
      });
      const resJson = await response.json();
      const url = resJson?.data?.Location;
      if (url) form.setFieldsValue({ image_url: url });
      else message.error('Image upload failed');
    } catch (error) {
      message.error('Image upload failed');
    }
    return false;
  };

  const submit = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      net_quantity: values.net_quantity ?? null,
      unit: values.net_quantity ? values.unit : null,
    };
    if (isEdit) delete payload.gtin;
    setSaving(true);
    try {
      const res = await netWorkCall(
        isEdit ? itemPath(item.id) : apiConfig.catalog_items,
        isEdit ? 'PUT' : 'POST',
        JSON.stringify(payload),
        true
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
  const hsnOption =
    isEdit && item.hsn_code ? { value: item.hsn_code, label: item.hsn_code } : null;

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit catalog item' : 'Add catalog item'}
      onCancel={onClose}
      onOk={submit}
      okText={isEdit ? 'Save changes' : 'Create item'}
      confirmLoading={saving}
      width={720}
      forceRender
    >
      {isEdit && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          {item.id} · from {SOURCE_LABELS[item.primary_source] || item.primary_source}. Saving
          marks the item as checked by a person, so pipeline re-runs will not overwrite your edits.
        </Text>
      )}
      <Form form={form} layout="vertical" requiredMark="optional">
        <Flex gap={12} wrap="wrap">
          <Form.Item name="name" label="Name" style={{ flex: '2 1 280px' }} rules={[{ required: true, whitespace: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="kind" label="Type" style={{ flex: '1 1 140px' }}>
            <Select options={[{ value: 'product', label: 'Product' }, { value: 'service', label: 'Service' }]} />
          </Form.Item>
        </Flex>
        <Flex gap={12} wrap="wrap">
          <Form.Item name="brand" label="Brand" style={{ flex: '1 1 240px' }}>
            <BrandInput />
          </Form.Item>
          <Form.Item
            name="gtin"
            label="Barcode (GTIN / EAN)"
            style={{ flex: '1 1 200px' }}
            tooltip="Set when the item is created; it becomes the item's identity."
          >
            {isEdit ? <Input disabled placeholder={item.gtin || 'No barcode'} /> : <Input placeholder="8, 12, 13 or 14 digits" />}
          </Form.Item>
        </Flex>
        <Flex gap={12} wrap="wrap">
          <Form.Item name="net_quantity" label="Net quantity" style={{ flex: '1 1 140px' }}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g. 500" />
          </Form.Item>
          <Form.Item
            name="unit"
            label="Unit"
            style={{ flex: '1 1 120px' }}
            dependencies={['net_quantity']}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, v) =>
                  getFieldValue('net_quantity') && !v ? Promise.reject(new Error('Pick a unit')) : Promise.resolve(),
              }),
            ]}
          >
            <Select allowClear options={[{ value: 'g', label: 'grams (g)' }, { value: 'ml', label: 'millilitres (ml)' }, { value: 'pc', label: 'pieces (pc)' }]} />
          </Form.Item>
          <Form.Item name="quantity_text" label="Pack label" style={{ flex: '1 1 160px' }}>
            <Input placeholder="e.g. 2 x 200 ml" />
          </Form.Item>
        </Flex>
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
            style={{ flex: '2 1 280px' }}
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
          <Form.Item name="country_of_origin" label="Country (ISO)" style={{ flex: '1 1 110px' }} rules={[{ pattern: /^[A-Za-z]{2}$/, message: '2 letters, e.g. IN' }]}>
            <Input maxLength={2} placeholder="IN" />
          </Form.Item>
        </Flex>
        <Form.Item name="manufacturer" label="Manufacturer">
          <Input />
        </Form.Item>
        <Form.Item label="Image">
          <Flex gap={12} align="center">
            <Avatar shape="square" size={56} src={imageUrl || undefined} icon={!imageUrl ? <PictureOutlined /> : undefined} />
            <Form.Item name="image_url" noStyle>
              <Input placeholder="https://…" />
            </Form.Item>
            <Upload beforeUpload={onImageUpload} showUploadList={false} accept="image/*">
              <Button icon={<UploadOutlined />}>Upload</Button>
            </Upload>
          </Flex>
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
            {details.effective_hsn || '—'} {details.hsn_basis ? <Text type="secondary">({details.hsn_basis.replace('_', ' ')})</Text> : null}
          </Descriptions.Item>
          <Descriptions.Item label="Suggested GST">
            {details.gst_rate !== null && details.gst_rate !== undefined ? `${Number(details.gst_rate)}%` : '—'}{' '}
            {details.gst_rate !== null && details.gst_rate !== undefined && (
              <Tag color={details.gst_rate_verified ? 'green' : 'default'}>{details.gst_rate_verified ? 'verified' : 'unverified'}</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Sources">
            {(details.sources || []).length
              ? details.sources.map((s) => (
                  <div key={`${s.source}:${s.source_id}`}>
                    {SOURCE_LABELS[s.source] || s.source} · {s.license}
                    {s.source_url && (
                      <>
                        {' · '}
                        <a href={s.source_url} target="_blank" rel="noreferrer">link</a>
                      </>
                    )}
                  </div>
                ))
              : 'Created by an admin'}
          </Descriptions.Item>
          {(details.reviews || []).length > 0 && (
            <Descriptions.Item label="Open review">
              {details.reviews.map((r) => (
                <Tag key={r.id} color="orange">{r.kind.replace(/_/g, ' ')}</Tag>
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
};

const CatalogItems = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState({ search: '', source: '', status: '', kind: '', active: 'true' });
  const [modal, setModal] = useState({ open: false, item: null });

  const loadMeta = () =>
    getJson(apiConfig.catalog_meta).then((res) => res?.success && setMeta(res.data));

  const load = useCallback(
    async (nextPage = page) => {
      setLoading(true);
      try {
        const res = await getJson(apiConfig.catalog_items, {
          ...filters,
          limit: PAGE_SIZE,
          offset: (nextPage - 1) * PAGE_SIZE,
        });
        if (!res?.success) {
          message.error(res?.error || 'Could not load the catalog');
          return;
        }
        setRows(res.data || []);
        setTotal(res.count || 0);
        setPage(nextPage);
      } catch (error) {
        message.error('Could not load the catalog');
      } finally {
        setLoading(false);
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

  const removeItem = async (record) => {
    const res = await netWorkCall(itemPath(record.id), 'DELETE', undefined, true);
    if (!res?.success) return message.error(res?.error || 'Could not remove the item');
    message.success(res.message);
    load(page);
    loadMeta();
  };

  const restoreItem = async (record) => {
    const res = await netWorkCall(`${itemPath(record.id)}/restore`, 'POST', undefined, true);
    if (!res?.success) return message.error(res?.error || 'Could not restore the item');
    message.success(res.message);
    load(page);
    loadMeta();
  };

  const optionsFrom = (list, labels = {}) =>
    (list || []).map((o) => ({ value: o.value, label: `${labels[o.value] || o.value} (${o.count.toLocaleString()})` }));

  const columns = [
    {
      title: 'Item',
      key: 'name',
      render: (_, r) => (
        <Flex gap={10} align="center" style={{ minWidth: 260 }}>
          <Avatar shape="square" size={40} src={r.image_url || undefined} icon={!r.image_url ? <PictureOutlined /> : undefined} style={{ background: colors.primaryLight, color: colors.primary, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: colors.textMain }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {[r.brand_name, r.gtin ? `GTIN ${r.gtin.replace(/^0+(?=\d{8,})/, '')}` : null].filter(Boolean).join(' · ') || r.id}
            </Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category_path',
      render: (v, r) => (
        <Text style={{ fontSize: 12, maxWidth: 240, display: 'inline-block' }} ellipsis={{ tooltip: v }}>
          {r.kind === 'service' && <Tag color="purple">service</Tag>}
          {v || <Text type="secondary">Uncategorised</Text>}
        </Text>
      ),
    },
    { title: 'Qty', key: 'qty', render: (_, r) => formatQty(r) },
    {
      title: 'HSN · GST',
      key: 'tax',
      render: (_, r) =>
        r.effective_hsn ? (
          <Tooltip title={`${r.hsn_basis === 'item' ? 'Set on this item' : 'Category default'}${r.gst_rate_verified ? ' · rate verified' : ' · rate unverified'}`}>
            <span style={{ whiteSpace: 'nowrap' }}>
              {r.effective_hsn}
              {r.gst_rate !== null && r.gst_rate !== undefined && (
                <Tag style={{ marginLeft: 6 }} color={r.gst_rate_verified ? 'green' : 'default'}>{Number(r.gst_rate)}%</Tag>
              )}
            </span>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v, r) => (
        <Tooltip title={STATUS_HELP[v]}>
          <Tag color={r.is_active ? STATUS_COLORS[v] : 'default'} icon={v === 'verified' ? <SafetyCertificateOutlined /> : undefined}>
            {r.is_active ? v : 'removed'}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'primary_source',
      render: (v) => <Text style={{ fontSize: 12 }}>{SOURCE_LABELS[v] || v}</Text>,
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => setModal({ open: true, item: r })}>
            Edit
          </Button>
          {r.is_active ? (
            <Popconfirm title="Remove this item?" description="It is hidden from merchants and can be restored later." onConfirm={() => removeItem(r)} okText="Remove" okButtonProps={{ danger: true }}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                Remove
              </Button>
            </Popconfirm>
          ) : (
            <Button type="link" size="small" icon={<UndoOutlined />} onClick={() => restoreItem(r)}>
              Restore
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Flex gap={10} wrap="wrap" align="center" style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="Search name, brand, barcode or item id"
          onSearch={(v) => setFilter('search', v.trim())}
          style={{ flex: '1 1 260px', maxWidth: 360 }}
        />
        <Select allowClear placeholder="Source" style={{ minWidth: 190 }} value={filters.source || undefined} onChange={(v) => setFilter('source', v)} options={optionsFrom(meta?.sources, SOURCE_LABELS)} />
        <Select allowClear placeholder="Status" style={{ minWidth: 160 }} value={filters.status || undefined} onChange={(v) => setFilter('status', v)} options={optionsFrom(meta?.statuses)} />
        <Select allowClear placeholder="Type" style={{ minWidth: 150 }} value={filters.kind || undefined} onChange={(v) => setFilter('kind', v)} options={optionsFrom(meta?.kinds)} />
        <Select
          style={{ minWidth: 130 }}
          value={filters.active}
          onChange={(v) => setFilter('active', v)}
          options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Removed' }, { value: 'all', label: 'All' }]}
        />
        <Tooltip title="Reload">
          <Button icon={<ReloadOutlined />} onClick={() => { load(page); loadMeta(); }} />
        </Tooltip>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ marginLeft: 'auto', background: colors.primary, borderColor: colors.primary, borderRadius: radii.md, fontWeight: 600 }}
          onClick={() => setModal({ open: true, item: null })}
        >
          Add item
        </Button>
      </Flex>

      <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.lg, overflow: 'hidden', background: colors.surface }}>
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (t) => <span style={{ fontFamily: typography.fontFamily.body }}>{t.toLocaleString()} items</span>,
          }}
          onChange={(pag) => load(pag.current)}
        />
      </div>

      <ItemModal
        open={modal.open}
        item={modal.item}
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
