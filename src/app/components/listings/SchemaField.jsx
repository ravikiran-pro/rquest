import React from 'react';
import PropTypes from 'prop-types';
import { Input, InputNumber, Select, Radio, Switch } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { formatFieldValue } from '../../utils/form_schema';
import './listings.css';

/**
 * One input for a form-schema field (text, number, select, radio, boolean, date, textarea).
 * Controlled: works inside antd Form.Item (value/onChange are injected) or on its own.
 */
export const SchemaFieldControl = ({ field, value, onChange, disabled, size, id, ariaLabel }) => {
  const label = ariaLabel || field?.label;
  const placeholder = field?.placeholder || (field?.label ? `Enter ${field.label.toLowerCase()}` : '');
  const options = Array.isArray(field?.options) ? field.options : [];
  switch (field?.type) {
    case 'number':
      return (
        <InputNumber
          id={id}
          size={size}
          value={value ?? null}
          onChange={(v) => onChange?.(v)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={label}
          inputMode="decimal"
          style={{ width: '100%' }}
        />
      );
    case 'select':
      return (
        <Select
          id={id}
          size={size}
          value={value ?? undefined}
          onChange={(v) => onChange?.(v)}
          disabled={disabled}
          allowClear={!field.required}
          placeholder={`Select ${(field.label || '').toLowerCase()}`}
          aria-label={label}
          options={options.map((o) => ({ value: o, label: o }))}
          style={{ width: '100%' }}
        />
      );
    case 'radio':
      return (
        <Radio.Group
          id={id}
          size={size}
          value={value ?? undefined}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          aria-label={label}
          optionType="button"
          options={options.map((o) => ({ value: o, label: o }))}
        />
      );
    case 'boolean':
      return (
        <Switch
          id={id}
          checked={Boolean(value)}
          onChange={(checked) => onChange?.(checked)}
          disabled={disabled}
          aria-label={label}
          checkedChildren="Yes"
          unCheckedChildren="No"
        />
      );
    case 'date':
      return (
        <Input
          id={id}
          size={size}
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          aria-label={label}
        />
      );
    case 'textarea':
      return (
        <Input.TextArea
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={label}
          autoSize={{ minRows: 2, maxRows: 5 }}
        />
      );
    default:
      return (
        <Input
          id={id}
          size={size}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={label}
        />
      );
  }
};

SchemaFieldControl.propTypes = {
  field: PropTypes.shape({
    key: PropTypes.string,
    label: PropTypes.string,
    type: PropTypes.string,
    required: PropTypes.bool,
    placeholder: PropTypes.string,
    options: PropTypes.array,
  }).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'middle', 'large']),
  id: PropTypes.string,
  ariaLabel: PropTypes.string,
};

/** Grey read-only chips for catalogue facts: [{ label, value }]. */
export const CatalogueFacts = ({ facts, max, tag }) => {
  const list = (Array.isArray(facts) ? facts : []).filter((f) => f && f.value !== '' && f.value !== undefined && f.value !== null);
  if (list.length === 0) return null;
  const shown = max ? list.slice(0, max) : list;
  return (
    <ul className="lc-facts" aria-label="Details from the catalogue">
      {shown.map((f) => (
        <li key={`${f.label}-${f.value}`} className="lc-fact">
          <span className="lc-fact-label">{f.label}</span>
          <span className="lc-fact-value">{typeof f.value === 'boolean' ? (f.value ? 'Yes' : 'No') : String(f.value)}</span>
        </li>
      ))}
      {tag && (
        <li className="lc-fact lc-fact--tag">
          <LockOutlined aria-hidden="true" /> From catalogue
        </li>
      )}
    </ul>
  );
};

CatalogueFacts.propTypes = {
  facts: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.any })),
  max: PropTypes.number,
  tag: PropTypes.bool,
};

/** Facts for locked fields of a resolved form, from listing metadata. */
export const lockedFacts = (fields, metadata) =>
  (Array.isArray(fields) ? fields : [])
    .map((f) => ({ label: f.label || f.key, value: formatFieldValue(f, metadata?.[f.key]) }))
    .filter((f) => f.value !== '');
