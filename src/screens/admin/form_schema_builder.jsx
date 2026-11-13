import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  Table,
  Space,
  Input,
  Select,
  Checkbox,
  Typography,
  Popconfirm,
  message,
  Alert,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SettingOutlined,
  BulbOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  netWorkCall,
  apiConfig,
  getSchemaIssues,
  FILTERABLE_FIELD_TYPES,
} from '../../app/utils';
import { colors, radii, typography } from '../../app/styles/theme';

const { Text, Paragraph } = Typography;
const { Option } = Select;

const FormSchemaBuilderModal = ({
  open,
  onClose,
  category,
  shop,
  onSuccess,
}) => {
  const isShopTarget = !!shop;
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [suggestedTemplate, setSuggestedTemplate] = useState(null);
  const [serverErrors, setServerErrors] = useState([]);

  // The name the server matches a template against
  const targetName = isShopTarget
    ? shop?.shopCategory?.name || shop?.shop_type || ''
    : category?.name || '';

  // Load the ready-made templates and the one suggested for this category
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setServerErrors([]);
    netWorkCall(
      `${apiConfig.master_form_templates}?category_name=${encodeURIComponent(targetName)}`,
      'GET',
      null,
      true
    )
      .then((res) => {
        if (cancelled) return;
        setTemplates(Array.isArray(res?.data) ? res.data : []);
        setSuggestedTemplate(res?.suggested || null);
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, targetName]);

  useEffect(() => {
    if (open) {
      if (isShopTarget && shop) {
        const existing = Array.isArray(shop.form_schema) && shop.form_schema.length > 0
          ? shop.form_schema
          : Array.isArray(shop.shopCategory?.form_schema)
          ? shop.shopCategory.form_schema
          : [];
        setFields(JSON.parse(JSON.stringify(existing)));
      } else if (category) {
        const existing = Array.isArray(category.form_schema) ? category.form_schema : [];
        setFields(JSON.parse(JSON.stringify(existing)));
      }
    }
  }, [open, category, shop, isShopTarget]);

  const handleAddField = () => {
    const newField = {
      key: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: '',
      options: [],
    };
    setFields([...fields, newField]);
  };

  const handleFieldChange = (index, prop, value) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [prop]: value };
    setServerErrors([]);

    // Only fields with a fixed set of values can be search filters
    if (prop === 'type' && !FILTERABLE_FIELD_TYPES.includes(value)) {
      updated[index].filterable = false;
    }

    // Auto-generate key from label if editing label on newly added field
    if (prop === 'label' && (!updated[index].key || updated[index].key.startsWith('field_'))) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (slug) {
        updated[index].key = slug;
      }
    }

    setFields(updated);
  };

  const handleOptionsChange = (index, rawString) => {
    const opts = rawString
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const updated = [...fields];
    updated[index] = { ...updated[index], options: opts };
    setServerErrors([]);
    setFields(updated);
  };

  const handleRemoveField = (index) => {
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
  };

  const handleMove = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setFields(updated);
  };

  const applyTemplate = (template) => {
    setFields(JSON.parse(JSON.stringify(template.fields)));
    setServerErrors([]);
    message.info(`Loaded the ${template.label} template. Review the fields, then save.`);
  };

  const handleApplyTemplate = (template) => {
    if (fields.length === 0) {
      applyTemplate(template);
      return;
    }
    Modal.confirm({
      title: `Replace the current ${fields.length} fields?`,
      content: `Loading the ${template.label} template replaces the fields in this form. Nothing is saved until you press Save.`,
      okText: 'Replace fields',
      cancelText: 'Keep current',
      onOk: () => applyTemplate(template),
    });
  };

  const handleResetToCategoryDefault = () => {
    if (isShopTarget && shop?.shopCategory?.form_schema) {
      setFields(JSON.parse(JSON.stringify(shop.shopCategory.form_schema)));
      message.info('Reverted to default category schema');
    } else {
      setFields([]);
      message.info('Cleared custom fields');
    }
  };

  // Problems to fix before saving: checked here as the admin types, and again
  // by the server on save
  const issues = [...getSchemaIssues(fields), ...serverErrors];

  const handleSave = async () => {
    if (isShopTarget && !shop?.id) return;
    if (!isShopTarget && !category?.id) return;

    if (issues.length > 0) {
      message.error(issues[0].message);
      return;
    }

    setSaving(true);
    try {
      const endpoint = isShopTarget
        ? apiConfig.master_shops_schema
        : apiConfig.master_categories_schema;

      const payload = isShopTarget
        ? { shop_id: shop.id, form_schema: fields }
        : { category_id: category.id, form_schema: fields };

      const res = await netWorkCall(
        endpoint,
        'PUT',
        JSON.stringify(payload),
        true
      );

      if (res?.success) {
        message.success(
          isShopTarget
            ? `Custom form saved for ${shop.shop_name}`
            : `Form configuration saved for ${category.name}`
        );
        onSuccess?.();
        onClose();
      } else {
        setServerErrors(Array.isArray(res?.errors) ? res.errors : []);
        message.error(res?.error || 'Failed to save form configuration');
      }
    } catch (err) {
      console.error(err);
      message.error('An error occurred while saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: '#',
      width: 50,
      render: (_, __, idx) => <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.body }}>{idx + 1}</Text>,
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Field Label
        </span>
      ),
      dataIndex: 'label',
      width: 180,
      render: (val, _, idx) => (
        <Input
          value={val}
          placeholder="e.g. Expiry Date"
          style={{ borderRadius: radii.sm, borderColor: colors.border }}
          onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
        />
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Field Key (DB Attribute)
        </span>
      ),
      dataIndex: 'key',
      width: 170,
      render: (val, _, idx) => (
        <Input
          value={val}
          placeholder="e.g. expiry_date"
          style={{ fontFamily: typography.fontFamily.mono, fontSize: 12, borderRadius: radii.sm, borderColor: colors.border }}
          onChange={(e) => handleFieldChange(idx, 'key', e.target.value)}
        />
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Type
        </span>
      ),
      dataIndex: 'type',
      width: 150,
      render: (val, _, idx) => (
        <Select
          value={val}
          style={{ width: '100%', borderRadius: radii.sm }}
          onChange={(newType) => handleFieldChange(idx, 'type', newType)}
        >
          <Option value="text">Text Input</Option>
          <Option value="number">Numeric</Option>
          <Option value="select">Select Dropdown</Option>
          <Option value="radio">Radio Buttons</Option>
          <Option value="boolean">Toggle / Switch</Option>
          <Option value="date">Date Picker</Option>
          <Option value="textarea">Text Area</Option>
        </Select>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Options / Details
        </span>
      ),
      dataIndex: 'options',
      render: (val, record, idx) => {
        if (record.type === 'select' || record.type === 'radio') {
          return (
            <Input
              value={Array.isArray(val) ? val.join(', ') : ''}
              placeholder="Comma-separated: Tablet, Syrup, Strip"
              style={{ borderRadius: radii.sm, borderColor: colors.border }}
              onChange={(e) => handleOptionsChange(idx, e.target.value)}
            />
          );
        }
        return (
          <Input
            value={record.placeholder || ''}
            placeholder="Placeholder or helper text"
            style={{ borderRadius: radii.sm, borderColor: colors.border }}
            onChange={(e) => handleFieldChange(idx, 'placeholder', e.target.value)}
          />
        );
      },
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Req.
        </span>
      ),
      dataIndex: 'required',
      width: 70,
      render: (val, _, idx) => (
        <Checkbox
          checked={Boolean(val)}
          onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)}
        />
      ),
    },
    {
      title: (
        <Tooltip title="Show this field as a search filter for shoppers. Available for dropdown, radio and toggle fields.">
          Filter
        </Tooltip>
      ),
      dataIndex: 'filterable',
      width: 70,
      render: (val, record, idx) => (
        <Checkbox
          checked={Boolean(val)}
          disabled={!FILTERABLE_FIELD_TYPES.includes(record.type || 'text')}
          onChange={(e) => handleFieldChange(idx, 'filterable', e.target.checked)}
        />
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Order / Action
        </span>
      ),
      width: 130,
      render: (_, __, idx) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={idx === 0}
            style={{ borderRadius: radii.xs, borderColor: colors.border }}
            onClick={() => handleMove(idx, -1)}
          />
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={idx === fields.length - 1}
            style={{ borderRadius: radii.xs, borderColor: colors.border }}
            onClick={() => handleMove(idx, 1)}
          />
          <Popconfirm
            title="Remove this field from form?"
            onConfirm={() => handleRemoveField(idx)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: radii.xs }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SettingOutlined style={{ color: colors.primary, fontSize: 18 }} />
          <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain, fontSize: 16 }}>
            {isShopTarget
              ? `Custom Product Form — Store: ${shop?.shop_name || 'Shop'}`
              : `Product Form Configuration — Category: ${category?.name || 'Category'}`}
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button
          key="cancel"
          onClick={onClose}
          style={{ borderRadius: radii.md, borderColor: colors.border, color: colors.textMain, fontFamily: typography.fontFamily.body }}
        >
          Cancel
        </Button>,
        ...(isShopTarget
          ? [
              <Button
                key="reset"
                onClick={handleResetToCategoryDefault}
                style={{ borderRadius: radii.md, borderColor: colors.border, color: colors.textMuted, fontFamily: typography.fontFamily.body }}
              >
                Reset to Standard Category Default
              </Button>,
            ]
          : []),
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
          style={{
            background: colors.primary,
            borderColor: colors.primary,
            borderRadius: radii.md,
            fontWeight: 600,
            fontFamily: typography.fontFamily.body,
            boxShadow: '0 2px 8px rgba(11, 45, 107, 0.18)',
          }}
        >
          {isShopTarget
            ? `Save Shop Override (${fields.length} Fields)`
            : `Save Form Schema (${fields.length} Fields)`}
        </Button>,
      ]}
      destroyOnClose
    >
      <Alert
        message={isShopTarget ? 'Store-Specific Form Override' : 'Standard Category Schema'}
        description={
          <div style={{ fontFamily: typography.fontFamily.body }}>
            {isShopTarget ? (
              <>
                Fields defined here will apply <strong>only to {shop?.shop_name}</strong>. If empty or cleared, this store will use standard <strong>{shop?.shopCategory?.name || shop?.shop_type || 'Category'}</strong> fields.
              </>
            ) : (
              <>
                Fields defined here will automatically appear on the <strong>Add/Edit Product Form</strong> for all shops belonging to <strong>{category?.name}</strong>. Values are automatically stored inside each listing&apos;s <code>metadata</code> JSON.
              </>
            )}
          </div>
        }
        type={isShopTarget ? 'warning' : 'info'}
        showIcon
        style={{ marginBottom: 16, borderRadius: radii.md }}
      />

      {/* Quick Template Presets */}
      <div style={{ marginBottom: 16, background: colors.surfaceContainerLow, padding: '12px 16px', borderRadius: radii.lg, border: `1px solid ${colors.border}` }}>
        <Text strong style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: colors.textMain, fontFamily: typography.fontFamily.headline }}>
          <BulbOutlined style={{ color: colors.tertiary }} /> Load Ready-Made Industry Template:
        </Text>
        <Space wrap>
          {templates.map((template) => {
            const isSuggested = template.key === suggestedTemplate;
            return (
              <Tooltip
                key={template.key}
                title={`${template.description} (${template.fields.length} fields)`}
              >
                <Button
                  size="small"
                  type={isSuggested ? 'primary' : 'default'}
                  ghost={isSuggested}
                  onClick={() => handleApplyTemplate(template)}
                  style={{ borderRadius: radii.md, fontSize: 12 }}
                >
                  {template.icon} {template.label}
                  {isSuggested ? ' · Suggested' : ''}
                </Button>
              </Tooltip>
            );
          })}
          {templates.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Templates could not be loaded. You can still add fields by hand.
            </Text>
          )}
        </Space>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text strong style={{ fontSize: 14, color: colors.textMain, fontFamily: typography.fontFamily.headline }}>
          Configured Fields ({fields.length}):
        </Text>
        <Button
          type="primary"
          onClick={handleAddField}
          style={{
            borderRadius: radii.md,
            fontWeight: 600,
            background: colors.primary,
            borderColor: colors.primary,
            fontFamily: typography.fontFamily.body,
          }}
        >
          + Add Custom Field
        </Button>
      </div>

      {issues.length > 0 && (
        <Alert
          type="error"
          showIcon
          message="Fix these before saving"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {issues.map((issue, i) => (
                <li key={`${issue.index}-${i}`}>{issue.message}</li>
              ))}
            </ul>
          }
          style={{ marginBottom: 12, borderRadius: 10 }}
        />
      )}

      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: radii.md,
          overflow: 'hidden',
          background: colors.surface,
        }}
      >
        <Table
          dataSource={fields}
          columns={columns}
          rowKey={(record) => fields.indexOf(record)}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Paragraph style={{ color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
                  No custom fields configured for this category yet. It will use standard product fields.
                </Paragraph>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={handleAddField}
                  style={{ borderRadius: radii.md, borderColor: colors.border, color: colors.primary }}
                >
                  Add First Custom Field or pick a template above
                </Button>
              </div>
            ),
          }}
        />
      </div>
    </Modal>
  );
};

FormSchemaBuilderModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  category: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    form_schema: PropTypes.array,
  }),
  shop: PropTypes.shape({
    id: PropTypes.string,
    shop_name: PropTypes.string,
    shop_type: PropTypes.string,
    form_schema: PropTypes.array,
    shopCategory: PropTypes.shape({
      name: PropTypes.string,
      form_schema: PropTypes.array,
    }),
  }),
  onSuccess: PropTypes.func,
};

export default FormSchemaBuilderModal;
