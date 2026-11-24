import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Drawer, Grid, Input, Modal, Select, Skeleton, Switch, Tag, Tooltip, message } from 'antd';
import { LockOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined, UndoOutlined, SaveOutlined } from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../../app/utils';
import { fieldSource } from '../../../app/utils/form_schema';
import { apiErrorText, invalidateResolvedForm } from '../../../app/utils/catalogue_api';
import { SchemaFieldControl } from '../../../app/components/listings/SchemaField';
import FormPreviewCard from './FormPreviewCard';
import './manage_store_catalog.css';

const MAX_CUSTOM = 10;
const CUSTOM_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'select', label: 'Choice' },
  { value: 'date', label: 'Date' },
];
const TYPE_LABEL = { text: 'Text', number: 'Number', boolean: 'Yes/No', select: 'Choice', radio: 'Choice', date: 'Date', textarea: 'Long text' };

const emptyOverride = () => ({ fields: {}, custom_fields: [] });

// What a store may change on a base field (spec §C5), from the server's flags or the field itself
const fieldFlags = (field, resolvedByKey) => {
  const r = resolvedByKey.get(field.key);
  const locked = r?.locked ?? (fieldSource(field) === 'catalog' || Boolean(field.statutory));
  return {
    locked,
    hiddenAllowed: r?.hidden_allowed ?? (!locked && !field.required),
    requiredLocked: r?.required_locked ?? (locked || Boolean(field.required)),
    lockReason: field.statutory ? 'Required by law' : fieldSource(field) === 'catalog' ? 'Set by catalogue' : 'Locked',
  };
};

const slugKey = (label, taken) => {
  const base = `c_${String(label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 26) || 'field'}`;
  let key = base;
  let n = 2;
  while (taken.has(key)) key = `${base.slice(0, 29)}${n++}`.slice(0, 32);
  return key;
};

/** Base fields with the draft applied (hidden removed), then custom fields: the preview's form. */
const layerDraft = (base, draft) => {
  const out = [];
  base.forEach((f) => {
    const o = draft.fields[f.key] || {};
    if (o.hidden) return;
    out.push({
      ...f,
      origin: 'base',
      label: o.label || f.label,
      required: Boolean(f.required || o.required),
      ...(o.defaultValue !== undefined ? { defaultValue: o.defaultValue } : {}),
    });
  });
  draft.custom_fields.forEach(({ _id, ...c }) => out.push({ ...c, origin: 'custom', source: 'store' })); // eslint-disable-line no-unused-vars
  return out;
};

/** Only the props that differ from the base, as the API expects. */
const cleanDraft = (base, draft) => {
  const fields = {};
  base.forEach((f) => {
    const o = draft.fields[f.key];
    if (!o) return;
    const next = {};
    if (o.hidden) next.hidden = true;
    if (o.label && o.label.trim() && o.label.trim() !== f.label) next.label = o.label.trim();
    if (o.required && !f.required) next.required = true;
    if (o.defaultValue !== undefined && o.defaultValue !== null && o.defaultValue !== '' && o.defaultValue !== f.defaultValue) {
      next.defaultValue = o.defaultValue;
    }
    if (Object.keys(next).length) fields[f.key] = next;
  });
  const custom_fields = draft.custom_fields.map((c) => {
    const field = { key: c.key, label: (c.label || '').trim(), type: c.type };
    if (c.required) field.required = true;
    if (c.type === 'select') field.options = (c.options || []).filter(Boolean);
    if (c.defaultValue !== undefined && c.defaultValue !== null && c.defaultValue !== '') field.defaultValue = c.defaultValue;
    return field;
  });
  return { fields, custom_fields };
};

const localIssues = (draft) => {
  const issues = {};
  draft.custom_fields.forEach((c) => {
    if (!c.label || !c.label.trim()) issues[c.key] = 'Give this field a name';
    else if (c.label.trim().length > 60) issues[c.key] = 'Keep the name under 60 characters';
    else if (c.type === 'select' && (c.options || []).filter(Boolean).length < 2) issues[c.key] = 'Add at least 2 choices';
  });
  Object.entries(draft.fields).forEach(([key, o]) => {
    if (o.label !== undefined && o.label.trim().length > 60) issues[key] = 'Keep the name under 60 characters';
  });
  return issues;
};

/**
 * Product form settings (spec §F8): per sub-category, hide / rename / require / set defaults
 * on store fields and add up to 10 custom fields, with a live preview.
 */
const FormSettings = ({ open, onClose, shop }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const shopId = shop?.id;
  const [modal, modalHolder] = Modal.useModal();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subId, setSubId] = useState(null);
  const [draft, setDraft] = useState(emptyOverride);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState({});

  const load = async () => {
    if (!shopId) return;
    setLoading(true);
    setError('');
    try {
      const res = await netWorkCall(`${apiConfig.forms_shop}/${shopId}`, 'GET', null, true);
      if (res?.success && Array.isArray(res.data)) {
        setEntries(res.data);
        setSubId((prev) => (res.data.some((e) => e.sub_category?.id === prev) ? prev : res.data[0]?.sub_category?.id ?? null));
      } else {
        setError(apiErrorText(res, 'Could not load your product forms.'));
      }
    } catch (err) {
      setError('Could not load your product forms. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shopId]);

  const entry = useMemo(() => entries.find((e) => e.sub_category?.id === subId) || null, [entries, subId]);
  const base = useMemo(() => (Array.isArray(entry?.base) ? entry.base : []), [entry]);
  const resolvedByKey = useMemo(() => new Map((entry?.resolved || []).map((f) => [f.key, f])), [entry]);

  // A new sub-category (or a fresh load) starts from its saved override
  useEffect(() => {
    const o = entry?.override;
    setDraft({
      fields: { ...(o?.fields || {}) },
      custom_fields: Array.isArray(o?.custom_fields) ? o.custom_fields.map((c) => ({ ...c, _id: c.key })) : [],
    });
    setDirty(false);
    setServerErrors({});
  }, [entry]);

  const issues = useMemo(() => ({ ...localIssues(draft), ...serverErrors }), [draft, serverErrors]);
  const previewFields = useMemo(() => layerDraft(base, draft), [base, draft]);

  const setFieldProp = (key, prop, value) => {
    setDirty(true);
    setServerErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
    setDraft((d) => {
      const current = { ...(d.fields[key] || {}) };
      if (value === undefined || value === false || value === '') delete current[prop];
      else current[prop] = value;
      const fields = { ...d.fields };
      if (Object.keys(current).length) fields[key] = current;
      else delete fields[key];
      return { ...d, fields };
    });
  };

  // Custom rows are matched by _id: their key follows the name until saved
  const setCustom = (rowId, patch) => {
    setDirty(true);
    setDraft((d) => ({ ...d, custom_fields: d.custom_fields.map((c) => (c._id === rowId ? { ...c, ...patch } : c)) }));
  };

  const addCustom = () => {
    if (draft.custom_fields.length >= MAX_CUSTOM) return;
    const taken = new Set([...base.map((f) => f.key), ...draft.custom_fields.map((c) => c.key)]);
    const key = slugKey(`field ${draft.custom_fields.length + 1}`, taken);
    setDirty(true);
    setDraft((d) => ({ ...d, custom_fields: [...d.custom_fields, { _id: `new-${Date.now()}`, key, label: '', type: 'text' }] }));
  };

  const removeCustom = (rowId) => {
    setDirty(true);
    setDraft((d) => ({ ...d, custom_fields: d.custom_fields.filter((c) => c._id !== rowId) }));
  };

  // A custom field's key follows its first name, then stays fixed once saved
  const renameCustom = (field, label) => {
    const saved = (entry?.override?.custom_fields || []).some((c) => c.key === field.key);
    if (saved) {
      setCustom(field._id, { label });
      return;
    }
    const taken = new Set([...base.map((f) => f.key), ...draft.custom_fields.filter((c) => c._id !== field._id).map((c) => c.key)]);
    setCustom(field._id, { label, key: slugKey(label || 'field', taken) });
  };

  const save = async () => {
    if (Object.keys(localIssues(draft)).length) {
      message.error('Fix the highlighted fields first');
      return;
    }
    setSaving(true);
    try {
      const body = cleanDraft(base, draft);
      const res = await netWorkCall(`${apiConfig.forms_shop}/${shopId}/${subId}`, 'PUT', JSON.stringify(body), true);
      if (res?.success && res.data) {
        message.success(`Saved the ${entry?.sub_category?.name || ''} form`.replace(/\s+/g, ' '));
        invalidateResolvedForm(shopId, subId);
        setEntries((list) =>
          list.map((e) => (e.sub_category?.id === subId ? { ...e, override: res.data.override, resolved: res.data.resolved || e.resolved } : e))
        );
        setDirty(false);
      } else {
        const errs = {};
        (res?.errors || []).forEach((e) => {
          if (e?.key) errs[e.key] = e.message;
        });
        setServerErrors(errs);
        message.error(apiErrorText(res, 'Could not save the form'));
      }
    } catch (err) {
      message.error('Could not save the form. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    modal.confirm({
      title: `Reset the ${entry?.sub_category?.name || ''} form?`.replace(/\s+/g, ' '),
      content: 'Your hidden, renamed and custom fields for this category are removed. Values already saved on items are kept.',
      okText: 'Reset to default',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      centered: true,
      onOk: async () => {
        try {
          const res = await netWorkCall(`${apiConfig.forms_shop}/${shopId}/${subId}`, 'DELETE', null, true);
          if (res?.success) {
            invalidateResolvedForm(shopId, subId);
            setEntries((list) =>
              list.map((e) => (e.sub_category?.id === subId ? { ...e, override: null, resolved: res.data?.resolved || e.base } : e))
            );
            message.success('Form reset to default');
          } else {
            message.error(apiErrorText(res, 'Could not reset the form'));
          }
        } catch (err) {
          message.error('Could not reset the form. Check your connection.');
        }
      },
    });
  };

  const confirmClose = () => {
    if (!dirty) {
      onClose();
      return;
    }
    modal.confirm({
      title: 'Discard your changes?',
      okText: 'Discard',
      cancelText: 'Keep editing',
      centered: true,
      onOk: onClose,
    });
  };

  const switchSub = (id) => {
    if (!dirty) {
      setSubId(id);
      return;
    }
    modal.confirm({
      title: 'Discard your changes to this form?',
      okText: 'Discard',
      cancelText: 'Keep editing',
      centered: true,
      onOk: () => setSubId(id),
    });
  };

  /* ---------- Render ---------- */

  const renderBaseRow = (field) => {
    const flags = fieldFlags(field, resolvedByKey);
    const o = draft.fields[field.key] || {};
    const hidden = Boolean(o.hidden);
    const required = Boolean(field.required || o.required);
    const err = issues[field.key];
    return (
      <div key={field.key} className={`mc-form-row ${hidden ? 'is-hidden' : ''} ${err ? 'has-error' : ''}`}>
        <div className="mc-form-row-main">
          {flags.locked ? (
            <div className="mc-form-label">
              <Tooltip title={flags.lockReason}>
                <button type="button" className="mc-lock-btn" aria-label={flags.lockReason}>
                  <LockOutlined />
                </button>
              </Tooltip>{' '}
              {field.label}
            </div>
          ) : (
            <Input
              size="small"
              value={o.label !== undefined ? o.label : field.label}
              maxLength={60}
              onChange={(e) => setFieldProp(field.key, 'label', e.target.value === field.label ? undefined : e.target.value)}
              aria-label={`Name of ${field.label}`}
              status={err ? 'error' : undefined}
            />
          )}
          <div className="mc-form-meta">
            <Tag style={{ margin: 0 }}>{TYPE_LABEL[field.type] || field.type || 'Text'}</Tag>
            {flags.locked && <span className="ms-muted">{flags.lockReason}</span>}
          </div>
          {!flags.locked && !hidden && field.type !== 'textarea' && (
            <div className="mc-form-default">
              <span className="ms-muted">Default</span>
              <SchemaFieldControl
                field={{ ...field, required: false }}
                size="small"
                value={o.defaultValue !== undefined ? o.defaultValue : field.defaultValue}
                onChange={(v) => setFieldProp(field.key, 'defaultValue', v === field.defaultValue ? undefined : v)}
                ariaLabel={`Default for ${field.label}`}
              />
            </div>
          )}
          {err && <div className="ms-field-error">{err}</div>}
        </div>
        <div className="mc-form-switches">
          <label className="mc-form-switch">
            <Switch
              size="small"
              checked={required}
              disabled={flags.requiredLocked || hidden}
              onChange={(checked) => setFieldProp(field.key, 'required', checked || undefined)}
            />
            <span>Required</span>
          </label>
          <label className="mc-form-switch">
            <Switch
              size="small"
              checked={!hidden}
              disabled={!flags.hiddenAllowed}
              onChange={(checked) => setFieldProp(field.key, 'hidden', checked ? undefined : true)}
            />
            <span>Show</span>
          </label>
        </div>
      </div>
    );
  };

  const renderCustomRow = (field) => {
    const err = issues[field.key];
    return (
      <div key={field._id || field.key} className={`mc-form-row ${err ? 'has-error' : ''}`}>
        <div className="mc-form-row-main">
          <Input
            size="small"
            value={field.label}
            placeholder="Field name, e.g. Includes hair wash"
            maxLength={60}
            onChange={(e) => renameCustom(field, e.target.value)}
            aria-label="Custom field name"
            status={err ? 'error' : undefined}
          />
          <div className="mc-form-meta">
            <Select
              size="small"
              value={field.type}
              options={CUSTOM_TYPES}
              onChange={(type) => setCustom(field._id, { type, options: type === 'select' ? field.options || [] : undefined, defaultValue: undefined })}
              aria-label="Custom field type"
              style={{ width: 110 }}
            />
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeCustom(field._id)} aria-label={`Delete ${field.label || 'custom field'}`} />
          </div>
          {field.type === 'select' && (
            <Input
              size="small"
              placeholder="Choices, separated by commas"
              value={(field.options || []).join(', ')}
              onChange={(e) => setCustom(field._id, { options: e.target.value.split(',').map((s) => s.trim()) })}
              aria-label="Choices"
            />
          )}
          {err && <div className="ms-field-error">{err}</div>}
        </div>
        <div className="mc-form-switches">
          <label className="mc-form-switch">
            <Switch size="small" checked={Boolean(field.required)} onChange={(checked) => setCustom(field._id, { required: checked || undefined })} />
            <span>Required</span>
          </label>
        </div>
      </div>
    );
  };

  const subName = entry?.sub_category?.name || '';

  const body = () => {
    if (loading && entries.length === 0) return <Skeleton active paragraph={{ rows: 6 }} />;
    if (error && entries.length === 0) {
      return (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={load}>
              Retry
            </Button>
          }
        />
      );
    }
    if (!entry) return <Alert type="info" showIcon message="Your store has no categories yet. Add one in store details." />;
    return (
      <>
        {entries.length > 1 && (
          <div className="mc-chips" role="radiogroup" aria-label="Category form" style={{ marginBottom: 12 }}>
            {entries.map((e) => {
              const on = e.sub_category?.id === subId;
              return (
                <button key={e.sub_category?.id} type="button" role="radio" aria-checked={on} className={`lc-chip ${on ? 'is-active' : ''}`} onClick={() => switchSub(e.sub_category?.id)}>
                  {e.sub_category?.name}
                  {e.override ? ' · edited' : ''}
                </button>
              );
            })}
          </div>
        )}
        {entry.legacy_shop_form && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={`An admin set a custom form for your store. Saving here applies to ${subName} only.`}
          />
        )}
        <div className="mc-form-layout">
          <div className="mc-form-col">
            <div className="ms-label">Fields</div>
            {base.length === 0 && <div className="ms-muted">This category has no extra fields.</div>}
            {base.map(renderBaseRow)}

            <div className="mc-form-custom-head">
              <div className="ms-label">
                Custom fields ({draft.custom_fields.length}/{MAX_CUSTOM})
              </div>
              <Button size="small" icon={<PlusOutlined />} onClick={addCustom} disabled={draft.custom_fields.length >= MAX_CUSTOM}>
                Add field
              </Button>
            </div>
            {draft.custom_fields.length === 0 && <div className="ms-muted">Add fields only your store needs, like &quot;Includes hair wash&quot;.</div>}
            {draft.custom_fields.map(renderCustomRow)}
          </div>
          <div className="mc-form-col mc-form-col--preview">
            <FormPreviewCard fields={previewFields} listingType={entry.sub_category?.listing_type} subName={subName} />
          </div>
        </div>
      </>
    );
  };

  return (
    <Drawer
      open={open}
      onClose={confirmClose}
      title="Product forms"
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '100%' : undefined}
      width={isMobile ? undefined : 960}
      destroyOnClose
      footer={
        entry ? (
          <div className="mc-tray">
            <Button icon={<UndoOutlined />} onClick={reset} disabled={!entry.override || saving}>
              Reset to default
            </Button>
            <Button type="primary" className="ms-btn-primary" icon={<SaveOutlined />} loading={saving} disabled={!dirty} onClick={save}>
              Save
            </Button>
          </div>
        ) : null
      }
    >
      {modalHolder}
      {body()}
    </Drawer>
  );
};

FormSettings.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  shop: PropTypes.object,
};

export default FormSettings;
