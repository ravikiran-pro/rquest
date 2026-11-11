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
import { netWorkCall, apiConfig } from '../../app/utils';
import { colors, radii, typography } from '../../app/styles/theme';

const { Text, Paragraph } = Typography;
const { Option } = Select;

// Quick Domain Presets for 1-click schema generation
const SCHEMA_PRESETS = {
  pharmacy: {
    label: '💊 Pharmacy & Medical Store',
    fields: [
      { key: 'dosage_form', label: 'Dosage Form', type: 'select', required: true, options: ['Strip / Tablets', 'Syrup / Liquid', 'Capsules', 'Injection', 'Cream / Ointment', 'Drops', 'Powder', 'Medical Equipment'] },
      { key: 'expiry_date', label: 'Expiry Date', type: 'date', required: true },
      { key: 'batch_no', label: 'Batch / Lot Number', type: 'text', placeholder: 'e.g. B-2024-X9', required: false },
      { key: 'prescription_required', label: 'Prescription Required (Rx)', type: 'boolean', defaultValue: false },
      { key: 'composition', label: 'Salt / Active Chemical Composition', type: 'text', placeholder: 'e.g. Paracetamol 500mg, Phenylephrine 5mg' },
      { key: 'schedule_drug', label: 'Schedule H / Controlled Substance', type: 'boolean', defaultValue: false },
    ],
  },
  food: {
    label: '🍽️ Restaurant & Food Menu',
    fields: [
      { key: 'food_type', label: 'Dietary Tag', type: 'radio', options: ['veg', 'non-veg', 'vegan', 'egg'], defaultValue: 'veg', required: true },
      { key: 'prep_time_mins', label: 'Prep Time (Minutes)', type: 'number', defaultValue: 15, placeholder: '15' },
      { key: 'spice_level', label: 'Spice Level', type: 'select', options: ['Mild', 'Medium', 'Spicy', 'Extra Hot'], defaultValue: 'Medium' },
      { key: 'portion_info', label: 'Portion / Serves', type: 'text', placeholder: 'e.g. Serves 1-2 persons' },
    ],
  },
  automotive: {
    label: '🚗 Automotive & Spare Parts',
    fields: [
      { key: 'vehicle_type', label: 'Vehicle Class', type: 'select', options: ['2-Wheeler (Bike/Scooter)', '4-Wheeler (Car/SUV)', 'Commercial / Truck', 'Universal'], defaultValue: '4-Wheeler (Car/SUV)' },
      { key: 'compatibility', label: 'Compatible Models & Make', type: 'text', placeholder: 'e.g. Honda City 2018-2023, Hyundai Creta' },
      { key: 'part_number', label: 'OEM / Part Number', type: 'text', placeholder: 'e.g. 12345-ABC-01' },
      { key: 'warranty_months', label: 'Warranty (Months)', type: 'number', placeholder: '12' },
      { key: 'condition', label: 'Condition', type: 'select', options: ['Brand New OEM', 'Aftermarket New', 'Refurbished', 'Pre-Owned Tested'], defaultValue: 'Brand New OEM' },
    ],
  },
  electronics: {
    label: '💻 Electronics & Appliances',
    fields: [
      { key: 'brand', label: 'Brand / Manufacturer', type: 'text', placeholder: 'e.g. Sony, Dell, Samsung, Apple' },
      { key: 'model_number', label: 'Model Number / Specs', type: 'text', placeholder: 'e.g. WH-1000XM5, 16GB RAM / 512GB SSD' },
      { key: 'warranty_period', label: 'Warranty (Months)', type: 'number', placeholder: '12' },
      { key: 'condition', label: 'Condition', type: 'select', options: ['Brand New Sealed', 'Open Box', 'Refurbished Certified', 'Pre-Owned'], defaultValue: 'Brand New Sealed' },
    ],
  },
  services: {
    label: '🔧 Technicians & Home Repairs',
    fields: [
      { key: 'service_mode', label: 'Service Mode', type: 'select', options: ['Doorstep / Home Visit', 'Workshop / Site Visit', 'Both Available'], defaultValue: 'Doorstep / Home Visit' },
      { key: 'visiting_charge', label: 'Visiting / Inspection Fee (₹)', type: 'number', placeholder: '199' },
      { key: 'duration_mins', label: 'Estimated Duration (Minutes)', type: 'number', defaultValue: 60 },
      { key: 'warranty_days', label: 'Service Warranty (Days)', type: 'number', placeholder: '30' },
    ],
  },
  rentals: {
    label: '🏍️ Rentals & Fleet Assets',
    fields: [
      { key: 'security_deposit', label: 'Refundable Security Deposit (₹)', type: 'number', placeholder: '2000' },
      { key: 'min_rental_days', label: 'Minimum Rental Period (Days)', type: 'number', defaultValue: 1 },
      { key: 'id_proof_required', label: 'Government ID Proof Required', type: 'boolean', defaultValue: true },
      { key: 'fuel_policy', label: 'Fuel / Usage Policy', type: 'select', options: ['Full-to-Full', 'Same-as-Received', 'Unlimited', 'Capped km/day'], defaultValue: 'Full-to-Full' },
    ],
  },
  medieval: {
    label: '⚔️ Medieval Armoury & Blacksmith',
    fields: [
      { key: 'item_class', label: 'Weapon / Armor Class', type: 'select', options: ['Longsword', 'Battleaxe', 'Plate Armor', 'Chainmail', 'Shield', 'Bow & Arrows', 'Potion / Elixir'], defaultValue: 'Longsword' },
      { key: 'material', label: 'Forged Material', type: 'select', options: ['Damascus Steel', 'Iron', 'Bronze', 'Mithril', 'Dragon Scale', 'Hardened Leather'], defaultValue: 'Damascus Steel' },
      { key: 'durability', label: 'Durability / Condition (%)', type: 'number', defaultValue: 100 },
      { key: 'weight_kg', label: 'Weight (kg)', type: 'number', defaultValue: 2.5 },
      { key: 'enchantment', label: 'Magical Runes / Enchantment', type: 'text', placeholder: 'e.g. +15 Fire Damage, Frost Resistance' },
    ],
  },
};

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
    updated[index][prop] = value;

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
    updated[index].options = opts;
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

  const handleApplyPreset = (presetKey) => {
    const preset = SCHEMA_PRESETS[presetKey];
    if (preset) {
      setFields(JSON.parse(JSON.stringify(preset.fields)));
      message.info(`Applied ${preset.label} template`);
    }
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

  const handleSave = async () => {
    if (isShopTarget && !shop?.id) return;
    if (!isShopTarget && !category?.id) return;

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
          {Object.entries(SCHEMA_PRESETS).map(([key, item]) => (
            <Button
              key={key}
              size="small"
              onClick={() => handleApplyPreset(key)}
              style={{
                borderRadius: radii.md,
                fontSize: 12,
                borderColor: colors.border,
                background: colors.surface,
                color: colors.textMain,
                fontFamily: typography.fontFamily.body,
                fontWeight: 500,
              }}
            >
              {item.label}
            </Button>
          ))}
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
          rowKey={(record, idx) => record.key || idx}
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
