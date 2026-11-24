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
  Grid,
  AutoComplete,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SettingOutlined,
  SaveOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import {
  netWorkCall,
  apiConfig,
  getSchemaIssues,
  FILTERABLE_FIELD_TYPES,
  CATALOG_PATH_SUGGESTIONS,
} from '../../app/utils';
import { colors, radii, typography } from '../../app/styles/theme';

const { Text, Paragraph } = Typography;

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text Input' },
  { value: 'number', label: 'Numeric' },
  { value: 'select', label: 'Select Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'boolean', label: 'Toggle / Switch' },
  { value: 'date', label: 'Date Picker' },
  { value: 'textarea', label: 'Text Area' },
];

// Who owns a field's value (docs/catalogue/03-spec.md §C2)
const SOURCE_OPTIONS = [
  { value: 'store', label: 'Store' },
  { value: 'catalog', label: 'Catalogue' },
];
const PATH_OPTIONS = CATALOG_PATH_SUGGESTIONS.map((p) => ({ value: p }));
const OWNER_HELP =
  'Catalogue: the value comes from the master catalogue item and stores cannot change it. Store: each store fills it in; a catalogue path is then only a prefill.';
const PATH_HELP = 'Where to read the value in a catalogue item, e.g. brand, quantity_text or attributes.dosage_form';
const STATUTORY_HELP = 'Required by law: stores cannot hide or rename this field';

const FormSchemaBuilderModal = ({
  open,
  onClose,
  category,
  subCategory,
  shop,
  onSuccess,
}) => {
  const isShopTarget = !!shop;
  // A sub-category's form (the form its shops' listings follow), edited like a category's
  const isSubTarget = !isShopTarget && !!subCategory;
  const target = isSubTarget ? subCategory : category;
  // The standard form a shop falls back to: its sub-category's, else its category's
  const shopStandardSchema =
    Array.isArray(shop?.shopSubCategory?.form_schema) && shop.shopSubCategory.form_schema.length > 0
      ? shop.shopSubCategory.form_schema
      : Array.isArray(shop?.shopCategory?.form_schema)
      ? shop.shopCategory.form_schema
      : [];
  const shopStandardName = shop?.shopSubCategory?.name || shop?.shopCategory?.name || shop?.shop_type || 'Category';
  const screens = Grid.useBreakpoint();
  // Under 576px the field table becomes a stacked card list; useBreakpoint is empty on the first render (desktop)
  const isPhone = screens.sm === false;
  const controlSize = isPhone ? 'large' : 'middle';
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [suggestedTemplate, setSuggestedTemplate] = useState(null);
  const [serverErrors, setServerErrors] = useState([]);

  // The name the server matches a template against
  const targetName = isShopTarget
    ? shop?.shopSubCategory?.name || shop?.shopCategory?.name || shop?.shop_type || ''
    : target?.name || '';

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
          : shopStandardSchema;
        setFields(JSON.parse(JSON.stringify(existing)));
      } else if (target) {
        const existing = Array.isArray(target.form_schema) ? target.form_schema : [];
        setFields(JSON.parse(JSON.stringify(existing)));
      }
    }
    // shopStandardSchema is derived from shop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target, shop, isShopTarget]);

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

    // Unset optional props instead of saving empty values; every other prop is kept as is
    if (prop === 'catalog_path' && !String(value || '').trim()) delete updated[index].catalog_path;
    if (prop === 'statutory' && !value) delete updated[index].statutory;

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
    if (isSubTarget) {
      Modal.confirm({
        title: `Reset ${subCategory.name} to its standard form?`,
        content: 'The standard fields for this kind of business replace the current ones and are saved right away.',
        okText: 'Reset form',
        onOk: async () => {
          const res = await netWorkCall(
            apiConfig.master_sub_categories_schema,
            'PUT',
            JSON.stringify({ subcategory_id: subCategory.id, reset: true }),
            true
          );
          if (res?.success) {
            message.success(res.message || 'Form reset');
            onSuccess?.();
            onClose();
          } else {
            message.error(res?.error || 'Could not reset the form');
          }
        },
      });
      return;
    }
    if (isShopTarget && shopStandardSchema.length > 0) {
      setFields(JSON.parse(JSON.stringify(shopStandardSchema)));
      message.info(`Reverted to the standard ${shopStandardName} form`);
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
    if (!isShopTarget && (target?.id === undefined || target?.id === null)) return;

    if (issues.length > 0) {
      message.error(issues[0].message);
      return;
    }

    setSaving(true);
    try {
      const endpoint = isShopTarget
        ? apiConfig.master_shops_schema
        : isSubTarget
        ? apiConfig.master_sub_categories_schema
        : apiConfig.master_categories_schema;

      const payload = isShopTarget
        ? { shop_id: shop.id, form_schema: fields }
        : isSubTarget
        ? { subcategory_id: subCategory.id, form_schema: fields }
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
            : `Form configuration saved for ${target.name}`
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
          options={FIELD_TYPE_OPTIONS}
        />
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
      title: <Tooltip title={OWNER_HELP}>Owned by</Tooltip>,
      dataIndex: 'source',
      width: 120,
      render: (val, _, idx) => (
        <Select
          value={val === 'catalog' ? 'catalog' : 'store'}
          style={{ width: '100%' }}
          options={SOURCE_OPTIONS}
          onChange={(v) => handleFieldChange(idx, 'source', v)}
          aria-label={`Owner of field ${idx + 1}`}
        />
      ),
    },
    {
      title: <Tooltip title={PATH_HELP}>Catalogue path</Tooltip>,
      dataIndex: 'catalog_path',
      width: 190,
      render: (val, _, idx) => (
        <AutoComplete
          value={val || ''}
          options={PATH_OPTIONS}
          style={{ width: '100%' }}
          placeholder="e.g. brand"
          filterOption={(input, option) => option.value.includes(input.trim().toLowerCase())}
          onChange={(v) => handleFieldChange(idx, 'catalog_path', v)}
          aria-label={`Catalogue path of field ${idx + 1}`}
        />
      ),
    },
    {
      title: <Tooltip title={STATUTORY_HELP}>Law</Tooltip>,
      dataIndex: 'statutory',
      width: 60,
      render: (val, _, idx) => (
        <Checkbox
          checked={Boolean(val)}
          onChange={(e) => handleFieldChange(idx, 'statutory', e.target.checked)}
          aria-label={`Field ${idx + 1} is required by law`}
        />
      ),
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
            aria-label={`Move field ${idx + 1} up`}
            icon={<ArrowUpOutlined />}
            disabled={idx === 0}
            style={{ borderRadius: radii.xs, borderColor: colors.border }}
            onClick={() => handleMove(idx, -1)}
          />
          <Button
            size="small"
            aria-label={`Move field ${idx + 1} down`}
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
            <Button
              size="small"
              danger
              aria-label={`Remove field ${idx + 1}`}
              icon={<DeleteOutlined />}
              style={{ borderRadius: radii.xs }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const emptyFields = (
    <div style={{ padding: '24px 0', textAlign: 'center' }}>
      <Paragraph style={{ color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
        No custom fields configured for this category yet. It will use standard product fields.
      </Paragraph>
      <Button
        type="dashed"
        size={controlSize}
        icon={<PlusOutlined />}
        onClick={handleAddField}
        style={{ borderRadius: radii.md, borderColor: colors.border, color: colors.primary }}
      >
        Add First Custom Field or pick a template above
      </Button>
    </div>
  );

  // Phones: one card per field, controls in a 40px row, inputs full width
  const renderFieldCard = (field, idx) => {
    const fieldIssues = issues.filter((issue) => issue.index === idx);
    const hasOptions = field.type === 'select' || field.type === 'radio';
    const filterable = FILTERABLE_FIELD_TYPES.includes(field.type || 'text');
    return (
      <article
        key={idx}
        className={`schema-field-card${fieldIssues.length > 0 ? ' schema-field-card--error' : ''}`}
      >
        <div className="schema-field-card__head">
          <span className="schema-field-card__index">{idx + 1}</span>
          <div className="schema-field-card__controls">
            <Button
              aria-label={`Move field ${idx + 1} up`}
              icon={<ArrowUpOutlined />}
              disabled={idx === 0}
              onClick={() => handleMove(idx, -1)}
            />
            <Button
              aria-label={`Move field ${idx + 1} down`}
              icon={<ArrowDownOutlined />}
              disabled={idx === fields.length - 1}
              onClick={() => handleMove(idx, 1)}
            />
            <Popconfirm
              title="Remove this field from form?"
              onConfirm={() => handleRemoveField(idx)}
              okText="Yes"
              cancelText="No"
            >
              <Button danger aria-label={`Remove field ${idx + 1}`} icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        </div>

        <div className="schema-field-card__grid">
          <label>
            <span className="schema-field-card__label">Field label</span>
            <Input
              size={controlSize}
              value={field.label}
              placeholder="e.g. Expiry Date"
              onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
            />
          </label>
          <label>
            <span className="schema-field-card__label">Field key (DB attribute)</span>
            <Input
              size={controlSize}
              value={field.key}
              placeholder="e.g. expiry_date"
              style={{ fontFamily: typography.fontFamily.mono, fontSize: 13 }}
              onChange={(e) => handleFieldChange(idx, 'key', e.target.value)}
            />
          </label>
          <label>
            <span className="schema-field-card__label">Type</span>
            <Select
              size={controlSize}
              value={field.type}
              style={{ width: '100%' }}
              onChange={(newType) => handleFieldChange(idx, 'type', newType)}
              options={FIELD_TYPE_OPTIONS}
            />
          </label>
          <label>
            <span className="schema-field-card__label">
              {hasOptions ? 'Options (comma-separated)' : 'Placeholder or helper text'}
            </span>
            {hasOptions ? (
              <Input
                size={controlSize}
                value={Array.isArray(field.options) ? field.options.join(', ') : ''}
                placeholder="Tablet, Syrup, Strip"
                onChange={(e) => handleOptionsChange(idx, e.target.value)}
              />
            ) : (
              <Input
                size={controlSize}
                value={field.placeholder || ''}
                placeholder="Placeholder or helper text"
                onChange={(e) => handleFieldChange(idx, 'placeholder', e.target.value)}
              />
            )}
          </label>
        </div>

        <div className="schema-field-card__grid" style={{ marginTop: 10 }}>
          <label>
            <span className="schema-field-card__label">Owned by</span>
            <Select
              size={controlSize}
              value={field.source === 'catalog' ? 'catalog' : 'store'}
              style={{ width: '100%' }}
              options={SOURCE_OPTIONS}
              onChange={(v) => handleFieldChange(idx, 'source', v)}
            />
          </label>
          <label>
            <span className="schema-field-card__label">Catalogue path</span>
            <AutoComplete
              size={controlSize}
              value={field.catalog_path || ''}
              options={PATH_OPTIONS}
              style={{ width: '100%' }}
              placeholder="e.g. attributes.dosage_form"
              filterOption={(input, option) => option.value.includes(input.trim().toLowerCase())}
              onChange={(v) => handleFieldChange(idx, 'catalog_path', v)}
            />
          </label>
        </div>

        <div className="schema-field-card__checks" style={{ marginTop: 10 }}>
          <Checkbox
            checked={Boolean(field.required)}
            onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)}
          >
            Required
          </Checkbox>
          <Tooltip title={STATUTORY_HELP}>
            <Checkbox checked={Boolean(field.statutory)} onChange={(e) => handleFieldChange(idx, 'statutory', e.target.checked)}>
              Required by law
            </Checkbox>
          </Tooltip>
          <Tooltip title="Show this field as a search filter for shoppers. Available for dropdown, radio and toggle fields.">
            <Checkbox
              checked={Boolean(field.filterable)}
              disabled={!filterable}
              onChange={(e) => handleFieldChange(idx, 'filterable', e.target.checked)}
            >
              Filter
            </Checkbox>
          </Tooltip>
        </div>

        {fieldIssues.length > 0 && (
          <Text type="danger" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
            {fieldIssues[0].message}
          </Text>
        )}
      </article>
    );
  };

  return (
    <Modal
      className="admin-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SettingOutlined style={{ color: colors.primary, fontSize: 18 }} />
          <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain, fontSize: 16 }}>
            {isShopTarget
              ? `Custom Product Form — Store: ${shop?.shop_name || 'Shop'}`
              : isSubTarget
              ? `Listing Form — Sub-category: ${subCategory?.name || 'Sub-category'}`
              : `Fallback Form — Category: ${category?.name || 'Category'}`}
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width="min(1000px, calc(100vw - 32px))"
      style={{ top: isPhone ? 16 : 48, maxWidth: 'calc(100vw - 32px)' }}
      footer={[
        <Button
          key="cancel"
          onClick={onClose}
          style={{ borderRadius: radii.md, borderColor: colors.border, color: colors.textMain, fontFamily: typography.fontFamily.body }}
        >
          Cancel
        </Button>,
        ...(isShopTarget || isSubTarget
          ? [
              <Button
                key="reset"
                onClick={handleResetToCategoryDefault}
                style={{ borderRadius: radii.md, borderColor: colors.border, color: colors.textMuted, fontFamily: typography.fontFamily.body }}
              >
                {isSubTarget ? 'Reset to Standard Form' : `Reset to ${shopStandardName} Form`}
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
        message={
          isShopTarget ? 'Store-Specific Form Override' : isSubTarget ? 'Sub-category Listing Form' : 'Category Fallback Form'
        }
        description={
          <div style={{ fontFamily: typography.fontFamily.body }}>
            {isShopTarget ? (
              <>
                Fields defined here will apply <strong>only to {shop?.shop_name}</strong>. If empty or cleared, this store will use the standard <strong>{shopStandardName}</strong> fields.
              </>
            ) : isSubTarget ? (
              <>
                These fields appear on the <strong>Add/Edit Item form</strong> for every <strong>{subCategory?.name}</strong> shop. Values are stored in each listing&apos;s <code>metadata</code>. Once saved, this form is marked as customised and a taxonomy sync will not overwrite it; use <em>Reset to Standard Form</em> to go back.
              </>
            ) : (
              <>
                Used only for <strong>{category?.name}</strong> shops that have no sub-category yet. Each sub-category has its own form; edit those from the Sub-categories screen.
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
          <AppstoreOutlined style={{ color: colors.tertiary }} /> Load Ready-Made Industry Template:
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
                  size={isPhone ? 'large' : 'small'}
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

      <div className="schema-builder-bar">
        <Text strong style={{ fontSize: 14, color: colors.textMain, fontFamily: typography.fontFamily.headline }}>
          Configured Fields ({fields.length}):
        </Text>
        <Button
          type="primary"
          size={controlSize}
          icon={<PlusOutlined />}
          onClick={handleAddField}
          style={{
            borderRadius: radii.md,
            fontWeight: 600,
            background: colors.primary,
            borderColor: colors.primary,
            fontFamily: typography.fontFamily.body,
          }}
        >
          Add Custom Field
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

      {isPhone ? (
        fields.length === 0 ? (
          <div className="admin-state">{emptyFields}</div>
        ) : (
          <div className="schema-field-list">{fields.map((field, idx) => renderFieldCard(field, idx))}</div>
        )
      ) : (
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
            locale={{ emptyText: emptyFields }}
          />
        </div>
      )}
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
  subCategory: PropTypes.shape({
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
    shopSubCategory: PropTypes.shape({
      name: PropTypes.string,
      form_schema: PropTypes.array,
    }),
  }),
  onSuccess: PropTypes.func,
};

export default FormSchemaBuilderModal;
