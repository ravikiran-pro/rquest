import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Button, Input, InputNumber, Select, Switch } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { axisLabel, variantLabel } from '../../utils/variants';
import { QtyStepper } from './StockControl';
import './listings.css';

/**
 * Variant section of the product editor (catalog/attributes/DESIGN.md §4): pick the options a
 * product varies by (from the sub-category's variant_axes when the API sends them, else free
 * names), enter their values, and fill one row per combination with price / MRP / stock / SKU.
 *
 * value: { axes: [{ key, label, values: [string] }], rows: [{ id?, option_values, price, mrp,
 *          sku, stock_qty, is_available, qty_edited }] }
 */

export const MAX_AXES = 3;
export const MAX_VARIANT_ROWS = 100;

/** "Pack size" → "pack_size" (the server's ^[a-z][a-z0-9_]{0,39}$). */
export const axisKeyFromName = (name) => {
  let key = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (key && !/^[a-z]/.test(key)) key = `opt_${key}`;
  return key.slice(0, 40);
};

const comboKey = (axes, optionValues) => axes.map((a) => String(optionValues?.[a.key] ?? '').toLowerCase()).join('\u0001');

/** Every combination of the axes' values, keeping what was typed for combinations that stay. */
export const regenerateRows = (axes, rows = []) => {
  const usable = axes.filter((a) => a.key && a.values.length);
  if (!usable.length || usable.length !== axes.length) return [];
  const previous = new Map(rows.map((r) => [comboKey(usable, r.option_values), r]));
  let combos = [{}];
  usable.forEach((axis) => {
    const next = [];
    combos.forEach((c) => axis.values.forEach((value) => next.push({ ...c, [axis.key]: value })));
    combos = next;
  });
  return combos.slice(0, MAX_VARIANT_ROWS).map((option_values) => {
    const old = previous.get(comboKey(usable, option_values));
    return old
      ? { ...old, option_values }
      : { option_values, price: null, mrp: null, sku: '', stock_qty: null, is_available: true, qty_edited: true };
  });
};

/** Editor state for a stored listing (variant_axes + variants), or an empty one. */
export const variantStateFromListing = (listing, axisDefs = []) => {
  const keys = Array.isArray(listing?.variant_axes) ? listing.variant_axes : [];
  if (!keys.length) return { axes: [], rows: [] };
  const variants = Array.isArray(listing.variants) ? listing.variants : [];
  const axes = keys.map((key) => {
    const values = [];
    variants.forEach((v) => {
      const value = v.option_values?.[key];
      if (value !== undefined && value !== null && !values.includes(value)) values.push(value);
    });
    const def = axisDefs.find((d) => d.key === key);
    return { key, label: def?.label || axisLabel(key), values };
  });
  const rows = variants.map((v) => ({
    id: v.id,
    option_values: v.option_values || {},
    price: v.price ?? null,
    mrp: v.mrp ?? null,
    sku: v.sku || '',
    stock_qty: v.stock_qty ?? null,
    is_available: v.is_available !== false,
    qty_edited: false,
  }));
  return { axes, rows };
};

/** The first problem with the variant section, or null. */
export const variantStateError = (state, stockMode) => {
  const axes = state?.axes || [];
  if (!axes.length) return 'Add at least one option, such as size or colour';
  if (axes.some((a) => !a.key)) return 'Name every option';
  if (new Set(axes.map((a) => a.key)).size !== axes.length) return 'Each option can be added once';
  if (axes.some((a) => !a.values.length)) return 'Enter at least one value for every option';
  const rows = state.rows || [];
  if (!rows.length) return 'Add at least one variant';
  for (const row of rows) {
    const name = variantLabel(axes.map((a) => a.key), row.option_values);
    if (!(Number(row.price) > 0)) return `Enter a price for ${name}`;
    if (row.mrp !== null && row.mrp !== undefined && row.mrp !== '' && Number(row.mrp) > 0 && Number(row.price) > Number(row.mrp)) {
      return `Price of ${name} is above its MRP`;
    }
    if (stockMode === 'tracked' && (row.stock_qty === null || row.stock_qty === undefined || row.stock_qty === '')) {
      return `Enter the stock of ${name}`;
    }
  }
  return null;
};

/**
 * { variant_axes, variants } for the API. Counted stock is sent only for new rows and rows
 * whose quantity the owner changed, so an edit never writes back a stale count.
 */
export const variantPayload = (state, stockMode) => ({
  variant_axes: state.axes.map((a) => a.key),
  variants: state.rows.map((row) => {
    const out = {
      ...(row.id ? { id: row.id } : {}),
      option_values: row.option_values,
      price: Number(row.price),
      mrp: row.mrp === null || row.mrp === undefined || row.mrp === '' ? null : Number(row.mrp),
      sku: (row.sku || '').trim() || null,
    };
    if (stockMode === 'tracked' && (!row.id || row.qty_edited)) out.stock_qty = Number(row.stock_qty) || 0;
    if (stockMode === 'toggle') out.is_available = row.is_available !== false;
    return out;
  }),
});

const VariantEditor = ({ value, onChange, axisDefs = [], stockMode, error, listingType }) => {
  const state = value || { axes: [], rows: [] };
  const hinted = axisDefs.length > 0;
  const defByKey = useMemo(() => new Map(axisDefs.map((d) => [d.key, d])), [axisDefs]);

  const setAxes = (axes) => onChange?.({ axes, rows: regenerateRows(axes, state.rows) });
  const setAxis = (index, patch) => setAxes(state.axes.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  const addAxis = () => {
    const unused = axisDefs.find((d) => !state.axes.some((a) => a.key === d.key));
    setAxes([...state.axes, unused ? { key: unused.key, label: unused.label, values: [] } : { key: '', label: '', values: [] }]);
  };
  const removeAxis = (index) => setAxes(state.axes.filter((_, i) => i !== index));
  const setRow = (index, patch) => onChange?.({ ...state, rows: state.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)) });

  const keys = state.axes.map((a) => a.key);
  const offLabel = listingType === 'food' ? 'Sold out' : 'Off';

  return (
    <div className="lc-variants">
      <div className="lc-variant-axes">
        {state.axes.map((axis, index) => {
          const def = defByKey.get(axis.key);
          const valueOptions = (def?.values || []).map((v) => ({ value: v.value, label: v.label }));
          return (
            <div className="lc-variant-axis-row" key={`axis-${index}`}>
              {hinted ? (
                <Select
                  value={axis.key || undefined}
                  placeholder="Option"
                  aria-label={`Option ${index + 1}`}
                  onChange={(key) => setAxis(index, { key, label: defByKey.get(key)?.label || axisLabel(key), values: [] })}
                  options={axisDefs.map((d) => ({
                    value: d.key,
                    label: d.label,
                    disabled: d.key !== axis.key && keys.includes(d.key),
                  }))}
                />
              ) : (
                <Input
                  value={axis.label}
                  placeholder="Option, e.g. Size"
                  maxLength={40}
                  aria-label={`Option ${index + 1} name`}
                  onChange={(e) => setAxis(index, { label: e.target.value, key: axisKeyFromName(e.target.value) })}
                />
              )}
              <Select
                mode="tags"
                value={axis.values}
                placeholder={def?.values?.length ? 'Pick values' : 'Type a value and press Enter'}
                aria-label={`${axis.label || 'Option'} values`}
                options={valueOptions}
                tokenSeparators={[',']}
                onChange={(values) =>
                  setAxis(index, {
                    values: [...new Set(values.map((v) => String(v).trim()).filter(Boolean))].map((v) => v.slice(0, 60)),
                  })
                }
              />
              <Button icon={<DeleteOutlined />} aria-label={`Remove option ${axis.label || index + 1}`} onClick={() => removeAxis(index)} />
            </div>
          );
        })}
        {state.axes.length < MAX_AXES && (
          <Button icon={<PlusOutlined />} onClick={addAxis} style={{ alignSelf: 'flex-start' }}>
            {state.axes.length ? 'Add another option' : 'Add an option (size, colour…)'}
          </Button>
        )}
      </div>

      {state.rows.length > 0 && (
        <div className="lc-variant-table">
          <table>
            <thead>
              <tr>
                <th>Variant</th>
                <th>Price (₹)</th>
                <th>MRP (₹)</th>
                {stockMode === 'tracked' && <th>Stock</th>}
                {stockMode === 'toggle' && <th>Available</th>}
                <th>SKU</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((row, index) => {
                const name = variantLabel(keys, row.option_values);
                return (
                  <tr key={name || index}>
                    <td className="lc-variant-name">{name}</td>
                    <td>
                      <InputNumber
                        min={0}
                        precision={2}
                        size="small"
                        inputMode="decimal"
                        value={row.price}
                        aria-label={`Price of ${name}`}
                        onChange={(v) => setRow(index, { price: v })}
                        style={{ width: 96 }}
                      />
                    </td>
                    <td>
                      <InputNumber
                        min={0}
                        precision={2}
                        size="small"
                        inputMode="decimal"
                        value={row.mrp}
                        placeholder="Optional"
                        aria-label={`MRP of ${name}`}
                        onChange={(v) => setRow(index, { mrp: v })}
                        style={{ width: 96 }}
                      />
                    </td>
                    {stockMode === 'tracked' && (
                      <td>
                        <QtyStepper
                          size="small"
                          value={row.stock_qty}
                          ariaLabel={`Stock of ${name}`}
                          onChange={(qty) => setRow(index, { stock_qty: qty, qty_edited: true })}
                        />
                      </td>
                    )}
                    {stockMode === 'toggle' && (
                      <td>
                        <Switch
                          size="small"
                          checked={row.is_available !== false}
                          checkedChildren="On"
                          unCheckedChildren={offLabel}
                          aria-label={`${name} available`}
                          onChange={(checked) => setRow(index, { is_available: checked })}
                        />
                      </td>
                    )}
                    <td>
                      <Input
                        size="small"
                        value={row.sku}
                        maxLength={64}
                        placeholder="Optional"
                        aria-label={`SKU of ${name}`}
                        onChange={(e) => setRow(index, { sku: e.target.value })}
                        style={{ width: 110 }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="lc-field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

VariantEditor.propTypes = {
  value: PropTypes.shape({ axes: PropTypes.array, rows: PropTypes.array }),
  onChange: PropTypes.func,
  axisDefs: PropTypes.array,
  stockMode: PropTypes.string,
  error: PropTypes.string,
  listingType: PropTypes.string,
};

export default VariantEditor;
