import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, InputNumber, Row, Skeleton, Switch, Typography, message } from 'antd';
import { apiConfig, netWorkCall } from '../../app/utils';
import { colors, radii } from '../../app/styles/theme';
import './platform_settings.css';

const { Text, Paragraph } = Typography;

// Field metadata for the form. Server rules live in src/api/services/platformSettings.js;
// the min/max here only give instant feedback, the API stays the source of truth.
const GROUPS = [
  {
    key: 'fees',
    title: 'Fees & orders',
    fields: [
      {
        name: 'platform_fee',
        label: 'Platform fee per order',
        kind: 'money',
        min: 0,
        max: 500,
        help: 'Added to every order. The server sets it; the cart shows this amount.',
      },
      {
        name: 'delivery_fee_base',
        label: 'Delivery fee',
        kind: 'money',
        min: 0,
        max: 1000,
        help: 'Charged on home-delivery orders.',
      },
      {
        name: 'free_delivery_threshold',
        label: 'Free delivery above',
        kind: 'money',
        min: 0,
        max: 100000,
        help: 'Items subtotal at which delivery is free. 0 turns this off.',
      },
      {
        name: 'min_order_value',
        label: 'Minimum order value',
        kind: 'money',
        min: 0,
        max: 100000,
        help: 'Orders with a smaller items subtotal are rejected. 0 turns this off.',
      },
    ],
  },
  {
    key: 'marketplace',
    title: 'Marketplace',
    fields: [
      {
        name: 'allow_new_shop_registrations',
        label: 'Accept new shop registrations',
        kind: 'boolean',
        help: 'When off, new shops cannot sign up. Existing shops are not affected.',
      },
      {
        name: 'default_search_radius_km',
        label: 'Default search radius',
        kind: 'number',
        suffix: 'km',
        min: 1,
        max: 100,
        help: 'Starting distance for nearby search in the app.',
      },
      {
        name: 'max_delivery_radius_km',
        label: 'Maximum delivery distance',
        kind: 'number',
        suffix: 'km',
        min: 0,
        max: 200,
        help: 'Delivery orders to addresses farther than this are refused. 0 means no limit.',
      },
    ],
  },
  {
    key: 'features',
    title: 'Features',
    fields: [
      {
        name: 'enable_delivery',
        label: 'Home delivery',
        kind: 'boolean',
        help: 'When off, customers can only choose self-pickup.',
      },
      {
        name: 'enable_quotes',
        label: 'Quote requests',
        kind: 'boolean',
        help: 'Lets customers ask stores for a quote.',
      },
      {
        name: 'enable_chat',
        label: 'Customer chat with stores',
        kind: 'boolean',
        help: 'Turns the chat entry points in the app on or off.',
      },
      {
        name: 'enable_ai_search',
        label: 'AI search',
        kind: 'boolean',
        help: 'Voice, photo and smart search.',
      },
    ],
  },
  {
    key: 'support',
    title: 'Support & notices',
    fields: [
      {
        name: 'support_email',
        label: 'Support email',
        kind: 'email',
        maxLength: 254,
        placeholder: 'support@example.com',
        help: 'Shown to customers at checkout. Leave empty to hide.',
      },
      {
        name: 'support_phone',
        label: 'Support phone',
        kind: 'phone',
        maxLength: 20,
        placeholder: '+91 00000 00000',
        help: 'Shown to customers at checkout. Leave empty to hide.',
      },
      {
        name: 'announcement_banner',
        label: 'Announcement banner',
        kind: 'text',
        maxLength: 280,
        help: 'Shown at the top of the cart page. Leave empty to hide.',
      },
      {
        name: 'maintenance_mode',
        label: 'Maintenance mode',
        kind: 'boolean',
        help: 'Pauses new orders, quote requests and shop sign-ups.',
      },
      {
        name: 'maintenance_message',
        label: 'Maintenance message',
        kind: 'text',
        maxLength: 500,
        help: 'Shown to customers while maintenance mode is on.',
      },
    ],
  },
];

const FIELDS = GROUPS.flatMap((g) => g.fields);
const FIELD_NAMES = FIELDS.map((f) => f.name);
const FIELD_BY_NAME = FIELDS.reduce((acc, f) => {
  acc[f.name] = f;
  return acc;
}, {});

const formatRupee = (n) => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return `₹${Number.isInteger(v) ? v : v.toFixed(2)}`;
};

// Equal for the purpose of "unsaved changes": empty text and missing values match
const sameValue = (a, b) => {
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
  return (a ?? '') === (b ?? '');
};

const pickSettings = (source) =>
  FIELD_NAMES.reduce((acc, name) => {
    acc[name] = source ? source[name] : undefined;
    return acc;
  }, {});

// Example order used by the preview: what a customer pays on a Rs 200 delivery
const PREVIEW_ITEMS = 200;
const previewTotals = (s) => {
  const platform = Number(s.platform_fee) || 0;
  const threshold = Number(s.free_delivery_threshold) || 0;
  const delivery =
    s.enable_delivery !== false && threshold > 0 && PREVIEW_ITEMS >= threshold
      ? 0
      : Number(s.delivery_fee_base) || 0;
  return { platform, delivery, total: PREVIEW_ITEMS + platform + delivery };
};

const PlatformSettings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saved, setSaved] = useState(null); // last settings the server confirmed
  const [draft, setDraft] = useState(null); // what the form shows right now
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState(null);
  const requestId = useRef(0);

  const applySettings = useCallback(
    (settings, nextMeta) => {
      const clean = pickSettings(settings);
      setSaved(clean);
      setDraft(clean);
      setMeta(nextMeta || null);
    },
    []
  );

  // The form mounts once settings exist; push the saved values into it after that
  useEffect(() => {
    if (saved) form.setFieldsValue(saved);
  }, [saved, form]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await netWorkCall(apiConfig.platform_settings_admin, 'GET', undefined, true);
      if (id !== requestId.current) return;
      if (!res?.success || !res?.data) {
        setLoadError(res?.error || res?.message || 'The server did not return the platform settings.');
        return;
      }
      applySettings(res.data, res.meta);
    } catch (err) {
      if (id !== requestId.current) return;
      console.error('Error loading platform settings:', err);
      setLoadError('Could not reach the server. Check your connection and try again.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    load();
  }, [load]);

  const changedKeys = useMemo(() => {
    if (!saved || !draft) return [];
    return FIELD_NAMES.filter((name) => !sameValue(draft[name], saved[name]));
  }, [saved, draft]);
  const dirty = changedKeys.length > 0;

  const handleValuesChange = (_changed, all) => {
    setDraft(pickSettings(all));
  };

  const handleReset = () => {
    if (!saved) return;
    form.setFieldsValue(saved);
    setDraft(saved);
    form.setFields(FIELD_NAMES.map((name) => ({ name, errors: [] })));
  };

  const handleSave = async () => {
    if (!dirty || saving) return;
    try {
      await form.validateFields();
    } catch (_) {
      message.error('Check the highlighted fields');
      return;
    }

    const payload = changedKeys.reduce((acc, name) => {
      acc[name] = draft[name] ?? '';
      return acc;
    }, {});

    setSaving(true);
    try {
      const res = await netWorkCall(apiConfig.platform_settings, 'PUT', JSON.stringify(payload), true);
      if (res?.success && res?.data) {
        applySettings(res.data, res.meta);
        message.success(res.message || 'Platform settings saved');
        return;
      }
      if (res?.errors && typeof res.errors === 'object') {
        form.setFields(
          Object.entries(res.errors)
            .filter(([name]) => FIELD_BY_NAME[name])
            .map(([name, msg]) => ({ name, errors: [msg] }))
        );
      }
      message.error(res?.message || res?.error || 'Could not save the platform settings');
    } catch (err) {
      console.error('Error saving platform settings:', err);
      message.error('Could not reach the server. Your changes are still here, try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    if (field.kind === 'boolean') {
      return (
        <div className="ps-switch-row" key={field.name}>
          <div className="ps-switch-text">
            <Text strong style={{ color: colors.textMain }}>
              {field.label}
            </Text>
            <Paragraph type="secondary" style={{ margin: '2px 0 0', fontSize: 12, lineHeight: 1.45 }}>
              {field.help}
            </Paragraph>
          </div>
          <Form.Item name={field.name} valuePropName="checked" noStyle>
            <Switch aria-label={field.label} />
          </Form.Item>
        </div>
      );
    }

    const rules = [];
    if (field.kind === 'money' || field.kind === 'number') {
      rules.push({ required: true, message: `${field.label} is required` });
      rules.push({
        type: 'number',
        min: field.min,
        max: field.max,
        message: `Enter a value between ${field.kind === 'money' ? formatRupee(field.min) : `${field.min} km`} and ${
          field.kind === 'money' ? formatRupee(field.max) : `${field.max} km`
        }`,
      });
    }

    let control;
    if (field.kind === 'money') {
      control = (
        <InputNumber
          prefix="₹"
          min={field.min}
          max={field.max}
          precision={2}
          step={1}
          inputMode="decimal"
          controls={false}
          aria-label={field.label}
          style={{ width: '100%', minHeight: 40 }}
        />
      );
    } else if (field.kind === 'number') {
      control = (
        <InputNumber
          suffix={field.suffix}
          min={field.min}
          max={field.max}
          precision={1}
          step={1}
          inputMode="decimal"
          aria-label={field.label}
          style={{ width: '100%', minHeight: 40 }}
        />
      );
    } else if (field.kind === 'text') {
      control = (
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 5 }}
          maxLength={field.maxLength}
          showCount
          aria-label={field.label}
        />
      );
    } else {
      control = (
        <Input
          type={field.kind === 'email' ? 'email' : 'tel'}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          aria-label={field.label}
          style={{ minHeight: 40 }}
        />
      );
    }

    return (
      <Form.Item key={field.name} name={field.name} label={field.label} rules={rules} extra={field.help}>
        {control}
      </Form.Item>
    );
  };

  const preview = draft ? previewTotals(draft) : null;

  if (loading && !saved) {
    return (
      <div className="ps-root" style={{ paddingBottom: 24 }}>
        <Skeleton active paragraph={{ rows: 1 }} title={{ width: 260 }} />
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <Col xs={24} md={12} key={i}>
              <Card className="ps-card">
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  if (loadError && !saved) {
    return (
      <div className="ps-root">
        <Alert
          type="error"
          showIcon
          message="Could not load platform configuration"
          description={loadError}
          action={
            <Button size="middle" onClick={load} style={{ minHeight: 40 }}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="ps-root" style={{ paddingBottom: 110 }}>
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Fees, marketplace rules, feature switches and customer notices. Changes apply to new requests right away.
          {meta?.updated_at ? ` Last saved ${new Date(meta.updated_at).toLocaleString('en-IN')}.` : ''}
        </Text>
      </div>

      {draft?.maintenance_mode && (
        <Alert
          type="warning"
          showIcon
          message="Maintenance mode is on"
          description="Customers cannot place orders, request quotes or sign up shops right now."
          style={{ marginBottom: 16, borderRadius: radii.md }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onValuesChange={handleValuesChange}
        disabled={saving}
      >
        <Row gutter={[16, 16]}>
          {GROUPS.map((group) => (
            <Col xs={24} md={12} key={group.key}>
              <Card className="ps-card" title={group.title} style={{ borderRadius: radii.lg }}>
                {group.key === 'fees' && preview && (
                  <div
                    className="ps-preview"
                    style={{ background: colors.surfaceContainerLow, color: colors.textMuted }}
                    aria-live="polite"
                  >
                    <span>Example: {formatRupee(PREVIEW_ITEMS)} delivery order</span>
                    <span style={{ textAlign: 'right' }}>Total {formatRupee(preview.total)}</span>
                    <span>Platform fee</span>
                    <span style={{ textAlign: 'right' }}>{formatRupee(preview.platform)}</span>
                    <span>Delivery fee</span>
                    <span style={{ textAlign: 'right' }}>{formatRupee(preview.delivery)}</span>
                  </div>
                )}
                {group.fields.map(renderField)}
              </Card>
            </Col>
          ))}
        </Row>
      </Form>

      {(dirty || saving) && (
        <div
          className="ps-actionbar"
          role="region"
          aria-label="Save platform settings"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div className="ps-actionbar-status">
            <Text strong style={{ color: colors.textMain }}>
              {changedKeys.length} unsaved {changedKeys.length === 1 ? 'change' : 'changes'}
            </Text>
          </div>
          <div className="ps-actionbar-buttons">
            <Button onClick={handleReset} disabled={saving} style={{ minHeight: 40 }}>
              Reset changes
            </Button>
            <Button type="primary" onClick={handleSave} loading={saving} style={{ minHeight: 40 }}>
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformSettings;
