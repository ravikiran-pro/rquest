import React from 'react';
import PropTypes from 'prop-types';
import { Button, InputNumber, Segmented, Switch } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { availabilityLabels, stockModeOptions, DEFAULT_LOW_STOCK } from '../../utils/stock';
import './listings.css';

/** −  qty  + : a whole-number stepper with typed entry, at least `min`. */
export const QtyStepper = ({ value, onChange, onStep, onBlur, min = 0, max, ariaLabel, size = 'middle', disabled, status, id }) => {
  const n = Number.isFinite(Number(value)) && value !== null && value !== '' ? Number(value) : null;
  // +/- taps go to onStep when given (so a caller can treat them as a change, not a typed value)
  const step = (delta) => {
    const next = Math.max(min, (n ?? 0) + delta);
    const capped = max !== undefined && max !== null ? Math.min(next, max) : next;
    (onStep || onChange)?.(capped);
  };
  return (
    <div className={`lc-stepper lc-stepper--${size}`} role="group" aria-label={ariaLabel}>
      <Button
        icon={<MinusOutlined />}
        onClick={() => step(-1)}
        onBlur={onBlur}
        disabled={disabled || n === null || n <= min}
        aria-label={`Decrease ${ariaLabel || 'quantity'}`}
        size={size}
      />
      <InputNumber
        id={id}
        className="lc-stepper-input"
        value={n}
        min={min}
        max={max}
        precision={0}
        controls={false}
        inputMode="numeric"
        size={size}
        disabled={disabled}
        status={status}
        onChange={(v) => onChange?.(v === null ? null : Math.max(min, Math.trunc(Number(v))))}
        onBlur={onBlur}
        aria-label={ariaLabel}
      />
      <Button
        icon={<PlusOutlined />}
        onClick={() => step(1)}
        onBlur={onBlur}
        disabled={disabled || (max !== undefined && max !== null && n !== null && n >= max)}
        aria-label={`Increase ${ariaLabel || 'quantity'}`}
        size={size}
      />
    </div>
  );
};

QtyStepper.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onChange: PropTypes.func,
  onStep: PropTypes.func,
  onBlur: PropTypes.func,
  min: PropTypes.number,
  max: PropTypes.number,
  ariaLabel: PropTypes.string,
  size: PropTypes.oneOf(['small', 'middle', 'large']),
  disabled: PropTypes.bool,
  status: PropTypes.oneOf(['error', 'warning', '']),
  id: PropTypes.string,
};

/**
 * The stock block of a product form: mode (Count stock | On/Off | Always available),
 * then a quantity and low-stock alert for counted items, or a switch for on/off items.
 * value: { stock_mode, stock_qty, low_stock_threshold, is_available }
 */
export const StockBlock = ({
  value,
  onChange,
  listingType,
  modes,
  error,
  showThreshold = true,
  compact,
  idPrefix = 'stock',
  perVariant = false,
}) => {
  const v = value || {};
  const labels = availabilityLabels(listingType);
  const options = stockModeOptions(listingType).filter((o) => !modes || modes.includes(o.value));
  const set = (patch) => onChange?.({ ...v, ...patch });
  const setMode = (mode) => {
    const patch = { stock_mode: mode };
    if (mode === 'tracked' && (v.low_stock_threshold === null || v.low_stock_threshold === undefined)) {
      patch.low_stock_threshold = DEFAULT_LOW_STOCK;
    }
    if (mode === 'toggle' && typeof v.is_available !== 'boolean') patch.is_available = true;
    set(patch);
  };

  return (
    <div className={`lc-stock ${compact ? 'is-compact' : ''}`}>
      {options.length > 1 ? (
        <Segmented
          block
          size={compact ? 'small' : 'middle'}
          value={v.stock_mode}
          onChange={setMode}
          options={options}
          aria-label="How you track stock"
          className="lc-stock-modes"
        />
      ) : (
        <div className="lc-stock-fixed">{options[0]?.label || 'Always available'}</div>
      )}

      {/* With variants the quantity / switch is set per option in the variant table */}
      {perVariant && v.stock_mode !== 'always' && (
        <div className="lc-stock-hint">
          {v.stock_mode === 'tracked' ? 'Enter the quantity of each option below.' : 'Switch each option on or off below.'}
        </div>
      )}

      {v.stock_mode === 'tracked' && perVariant && showThreshold && (
        <div className="lc-stock-row">
          <label className="lc-stock-field" htmlFor={`${idPrefix}-low`}>
            <span className="lc-stock-label">Low-stock alert at</span>
            <InputNumber
              id={`${idPrefix}-low`}
              min={0}
              precision={0}
              inputMode="numeric"
              size={compact ? 'small' : 'middle'}
              value={v.low_stock_threshold ?? null}
              onChange={(t) => set({ low_stock_threshold: t })}
              aria-label="Low-stock alert at"
              style={{ width: 96 }}
            />
          </label>
        </div>
      )}

      {v.stock_mode === 'tracked' && !perVariant && (
        <div className="lc-stock-row">
          <label className="lc-stock-field" htmlFor={`${idPrefix}-qty`}>
            <span className="lc-stock-label">Quantity in stock</span>
            <QtyStepper
              id={`${idPrefix}-qty`}
              value={v.stock_qty}
              onChange={(qty) => set({ stock_qty: qty })}
              ariaLabel="Quantity in stock"
              size={compact ? 'small' : 'middle'}
              status={error ? 'error' : ''}
            />
          </label>
          {showThreshold && (
            <label className="lc-stock-field" htmlFor={`${idPrefix}-low`}>
              <span className="lc-stock-label">Low-stock alert at</span>
              <InputNumber
                id={`${idPrefix}-low`}
                min={0}
                precision={0}
                inputMode="numeric"
                size={compact ? 'small' : 'middle'}
                value={v.low_stock_threshold ?? null}
                onChange={(t) => set({ low_stock_threshold: t })}
                aria-label="Low-stock alert at"
                style={{ width: 96 }}
              />
            </label>
          )}
        </div>
      )}

      {v.stock_mode === 'toggle' && !perVariant && (
        <label className="lc-stock-switch">
          <Switch checked={v.is_available !== false} onChange={(checked) => set({ is_available: checked })} />
          <span>{v.is_available !== false ? labels.on : labels.off}</span>
        </label>
      )}

      {v.stock_mode === 'always' && (
        <div className="lc-stock-hint">Customers can always order this.</div>
      )}

      {error && (
        <div className="lc-field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

StockBlock.propTypes = {
  value: PropTypes.shape({
    stock_mode: PropTypes.string,
    stock_qty: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    low_stock_threshold: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    is_available: PropTypes.bool,
  }),
  onChange: PropTypes.func,
  listingType: PropTypes.string,
  modes: PropTypes.arrayOf(PropTypes.string),
  error: PropTypes.string,
  showThreshold: PropTypes.bool,
  compact: PropTypes.bool,
  idPrefix: PropTypes.string,
  perVariant: PropTypes.bool,
};
