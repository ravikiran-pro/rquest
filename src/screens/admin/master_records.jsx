import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Avatar,
  Button,
  Empty,
  Form,
  Grid,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Result,
  Skeleton,
  Space,
  Switch,
  Table,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { apiConfig, config } from '../../app/utils';
import { colors, radii } from '../../app/styles/theme';

const { Text } = Typography;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Uploads an image to the shared upload endpoint and returns its URL. */
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('fileData', file);
  const response = await fetch(`${config.api_url}/api/v1/${apiConfig.upload}`, {
    method: 'POST',
    body: formData,
  });
  const resJson = await response.json();
  return resJson?.data?.Location || null;
};

const RecordAvatar = ({ record, size }) => (
  <Avatar
    shape="square"
    size={size}
    src={record.img_url || undefined}
    icon={!record.img_url ? <PictureOutlined /> : undefined}
    alt=""
    style={{ background: colors.primaryLight, color: colors.primary, flexShrink: 0, borderRadius: radii.md }}
  />
);

RecordAvatar.propTypes = {
  record: PropTypes.object.isRequired,
  size: PropTypes.number,
};

/** Add / edit form: name, optional description and image. */
const RecordModal = ({ open, record, noun, withDescription, onClose, onSave, isPhone }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imgUrl = Form.useWatch('img_url', form);
  const isEdit = Boolean(record && record.id !== undefined && record.id !== null);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      name: record?.name || '',
      description: record?.description || '',
      img_url: record?.img_url || '',
    });
  }, [open, record]);

  const beforeUpload = async (file) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      if (url) form.setFieldsValue({ img_url: url });
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
      return;
    }
    setSaving(true);
    try {
      const ok = await onSave({
        ...(record || {}),
        name: values.name.trim(),
        img_url: values.img_url || '',
        ...(withDescription ? { description: values.description || '' } : {}),
      });
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      className="admin-modal"
      title={isEdit ? `Edit ${noun}` : `Add ${noun}`}
      okText={isEdit ? 'Save changes' : `Add ${noun}`}
      onOk={submit}
      onCancel={onClose}
      confirmLoading={saving}
      okButtonProps={{ disabled: uploading }}
      maskClosable={!saving}
      width="min(520px, calc(100vw - 24px))"
      style={{ top: isPhone ? 12 : 72, maxWidth: 'calc(100vw - 24px)' }}
      forceRender
    >
      <Form form={form} layout="vertical" requiredMark="optional" onFinish={submit}>
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, whitespace: true, message: `Give the ${noun} a name` }]}
        >
          <Input placeholder={`e.g. ${noun === 'category' ? 'Grocery' : noun === 'subcategory' ? 'Dairy' : 'Full cream milk'}`} maxLength={120} />
        </Form.Item>
        {withDescription && (
          <Form.Item name="description" label="Description">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} maxLength={500} showCount />
          </Form.Item>
        )}
        <Form.Item label="Image" style={{ marginBottom: 0 }}>
          <div className="admin-image-field">
            <Avatar
              shape="square"
              size={64}
              src={imgUrl || undefined}
              icon={!imgUrl ? <PictureOutlined /> : undefined}
              style={{ background: colors.primaryLight, color: colors.primary, flexShrink: 0, borderRadius: radii.md }}
            />
            <Space wrap size={8}>
              <Upload beforeUpload={beforeUpload} showUploadList={false} accept="image/*">
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {imgUrl ? 'Replace image' : 'Upload image'}
                </Button>
              </Upload>
              {imgUrl && (
                <Button type="text" danger onClick={() => form.setFieldsValue({ img_url: '' })}>
                  Remove
                </Button>
              )}
            </Space>
          </div>
          <Form.Item name="img_url" hidden>
            <Input />
          </Form.Item>
        </Form.Item>
      </Form>
    </Modal>
  );
};

RecordModal.propTypes = {
  open: PropTypes.bool.isRequired,
  record: PropTypes.object,
  noun: PropTypes.string.isRequired,
  withDescription: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isPhone: PropTypes.bool,
};

/**
 * List screen shared by master categories, subcategories and products:
 * toolbar (filter + reload + add), table on desktop, stacked cards on phones,
 * add/edit in a modal, status switch and a confirmed delete.
 */
const MasterRecords = ({
  noun,
  nounPlural,
  rows,
  total,
  page,
  pageSize,
  loading = false,
  loaded = false,
  error = null,
  onPageChange,
  onReload,
  onSave,
  onToggleActive,
  onDelete,
  canAdd = true,
  addDisabledReason,
  deleteWarning = 'This cannot be undone.',
  withDescription = false,
  extraColumns = [],
}) => {
  const screens = Grid.useBreakpoint();
  const isPhone = screens.md === false;
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState({ open: false, record: null });
  const [busy, setBusy] = useState({}); // { [id]: 'status' | 'delete' }

  const q = query.trim().toLowerCase();
  const visibleRows = q
    ? rows.filter((r) =>
        [r.name, r.description].some((v) => String(v || '').toLowerCase().includes(q))
      )
    : rows;

  const runBusy = async (record, kind, task) => {
    setBusy((prev) => ({ ...prev, [record.id]: kind }));
    try {
      await task();
    } finally {
      setBusy((prev) => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });
    }
  };

  const openCreate = () => setModal({ open: true, record: null });
  const openEdit = (record) => setModal({ open: true, record });
  const closeModal = () => setModal({ open: false, record: null });

  const statusSwitch = (record) => (
    <Space size={8}>
      <Switch
        size="small"
        checked={Boolean(record.is_active)}
        loading={busy[record.id] === 'status'}
        onChange={(checked) => runBusy(record, 'status', () => onToggleActive(record, checked))}
        aria-label={`${record.is_active ? 'Deactivate' : 'Activate'} ${record.name || noun}`}
      />
      <Text style={{ fontSize: 12, color: record.is_active ? colors.semantic.successHover : colors.textMuted, fontWeight: 600 }}>
        {record.is_active ? 'Active' : 'Inactive'}
      </Text>
    </Space>
  );

  const deleteButton = (record, block) => (
    <Popconfirm
      key="delete"
      title={`Delete "${record.name || noun}"?`}
      description={deleteWarning}
      okText="Delete"
      okButtonProps={{ danger: true }}
      cancelText="Keep"
      onConfirm={() => runBusy(record, 'delete', () => onDelete(record))}
    >
      <Button
        type={block ? 'default' : 'link'}
        size={block ? 'middle' : 'small'}
        danger
        icon={<DeleteOutlined />}
        loading={busy[record.id] === 'delete'}
      >
        Delete
      </Button>
    </Popconfirm>
  );

  const editButton = (record, block) => (
    <Button
      key="edit"
      type={block ? 'default' : 'link'}
      size={block ? 'middle' : 'small'}
      icon={<EditOutlined />}
      onClick={() => openEdit(record)}
    >
      Edit
    </Button>
  );

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_, r) => (
        <Space size={12} align="center" style={{ minWidth: 220, maxWidth: 420 }}>
          <RecordAvatar record={r} size={40} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: colors.textMain, overflowWrap: 'anywhere' }}>{r.name || '—'}</div>
            {withDescription && r.description && (
              <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: r.description }}>
                {r.description}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    ...extraColumns.map((col) => ({
      title: col.title,
      key: col.key,
      render: (_, r) => col.render(r),
    })),
    { title: 'Status', key: 'status', render: (_, r) => statusSwitch(r) },
    {
      title: 'Updated',
      key: 'updatedAt',
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          {formatDate(r.updatedAt || r.createdAt)}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      render: (_, r) => (
        <Space size={0}>
          {editButton(r, false)}
          {deleteButton(r, false)}
        </Space>
      ),
    },
  ];

  const addButton = (
    <Tooltip title={!canAdd ? addDisabledReason : undefined}>
      <Button
        type="primary"
        className="admin-toolbar__primary"
        icon={<PlusOutlined />}
        onClick={openCreate}
        disabled={!canAdd}
      >
        Add {noun}
      </Button>
    </Tooltip>
  );

  const emptyState = q ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${nounPlural} on this page match "${query.trim()}".`}>
      <Button onClick={() => setQuery('')}>Clear filter</Button>
    </Empty>
  ) : (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${nounPlural} yet.`}>
      {canAdd && (
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add the first {noun}
        </Button>
      )}
    </Empty>
  );

  const pager = total > pageSize && (
    <div className="admin-card-pagination">
      <Pagination
        simple={isPhone}
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        onChange={onPageChange}
      />
    </div>
  );

  const renderCards = () => {
    if (!loaded && loading) {
      return (
        <div className="admin-card-list" aria-busy="true">
          {[0, 1, 2].map((k) => (
            <div key={k} className="admin-record-card">
              <Skeleton avatar={{ shape: 'square' }} active paragraph={{ rows: 1 }} />
            </div>
          ))}
        </div>
      );
    }
    if (visibleRows.length === 0) return <div className="admin-state">{emptyState}</div>;
    return (
      <>
        <div className="admin-card-list" aria-busy={loading}>
          {visibleRows.map((r) => (
            <article key={r.id} className="admin-record-card" style={{ opacity: loading ? 0.6 : 1 }}>
              <div className="admin-record-card__head">
                <RecordAvatar record={r} size={48} />
                <div className="admin-record-card__body">
                  <div className="admin-record-card__title">{r.name || '—'}</div>
                  {withDescription && r.description && (
                    <div className="admin-record-card__meta">{r.description}</div>
                  )}
                  <div className="admin-record-card__meta">Updated {formatDate(r.updatedAt || r.createdAt)}</div>
                </div>
              </div>
              <div className="admin-record-card__row">
                {statusSwitch(r)}
              </div>
              {extraColumns.length > 0 && (
                <div className="admin-record-card__chips">
                  {extraColumns.map((col) => (
                    <div key={col.key} style={{ width: '100%' }}>
                      {col.render(r, { block: true })}
                    </div>
                  ))}
                </div>
              )}
              <div className="admin-record-card__actions">
                {editButton(r, true)}
                {deleteButton(r, true)}
              </div>
            </article>
          ))}
        </div>
        {pager}
      </>
    );
  };

  return (
    <>
      <div className="admin-toolbar">
        <Input
          className="admin-toolbar__search"
          allowClear
          prefix={<SearchOutlined style={{ color: colors.textLight }} />}
          placeholder={`Filter ${nounPlural} on this page`}
          aria-label={`Filter ${nounPlural} on this page`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={Boolean(error)}
        />
        <div className="admin-toolbar__actions">
          <Tooltip title="Reload">
            <Button icon={<ReloadOutlined />} aria-label="Reload" onClick={onReload} loading={loading && loaded} />
          </Tooltip>
          {addButton}
        </div>
      </div>

      {loaded && !error && (
        <div className="admin-filterbar">
          <div className="admin-filterbar__summary">
            {total.toLocaleString()} {total === 1 ? noun : nounPlural}
            {q && ` · ${visibleRows.length} shown`}
          </div>
        </div>
      )}

      {error ? (
        <div className="admin-state" role="alert">
          <Result
            status="warning"
            title={`Could not load ${nounPlural}`}
            subTitle={error}
            extra={
              <Button type="primary" icon={<ReloadOutlined />} onClick={onReload} loading={loading}>
                Try again
              </Button>
            }
          />
        </div>
      ) : isPhone ? (
        renderCards()
      ) : (
        <div className="admin-table-wrap">
          <Table
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={visibleRows}
            loading={loading}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: loading || !loaded ? ' ' : emptyState }}
            pagination={false}
          />
          {pager && <div style={{ padding: '0 16px 14px' }}>{pager}</div>}
        </div>
      )}

      <RecordModal
        open={modal.open}
        record={modal.record}
        noun={noun}
        withDescription={withDescription}
        isPhone={isPhone}
        onClose={closeModal}
        onSave={onSave}
      />
    </>
  );
};

MasterRecords.propTypes = {
  noun: PropTypes.string.isRequired,
  nounPlural: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  total: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  loading: PropTypes.bool,
  loaded: PropTypes.bool,
  error: PropTypes.string,
  onPageChange: PropTypes.func.isRequired,
  onReload: PropTypes.func.isRequired,
  /** Resolves true when saved (the modal then closes). */
  onSave: PropTypes.func.isRequired,
  onToggleActive: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  canAdd: PropTypes.bool,
  addDisabledReason: PropTypes.string,
  deleteWarning: PropTypes.string,
  withDescription: PropTypes.bool,
  /** Extra columns: { key, title, render(record, { block }) } — also shown on phone cards. */
  extraColumns: PropTypes.arrayOf(
    PropTypes.shape({ key: PropTypes.string.isRequired, title: PropTypes.node, render: PropTypes.func.isRequired })
  ),
};


export default MasterRecords;
