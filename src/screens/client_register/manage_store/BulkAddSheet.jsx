import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, InputNumber, Segmented, Select } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { QtyStepper } from '../../../app/components/listings/StockControl';
import { SchemaFieldControl, CatalogueFacts } from '../../../app/components/listings/SchemaField';
import { fieldSource } from '../../../app/utils/form_schema';
import { fallbackStockMode, DEFAULT_LOW_STOCK } from '../../../app/utils/stock';
import { codeText } from '../../../app/utils/catalogue_api';
import { ListingThumb } from './ListingBits';
import './manage_store_catalog.css';

const MODE_OPTIONS = [
  { value: 'tracked', label: 'Count' },
  { value: 'toggle', label: 'On/Off' },
  { value: 'always', label: 'Always' },
];

const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** The sub-category an item lands in: the API's pick, else the shop's primary. */
export const itemSubId = (item, subIds) => {
  const id = Number(item?.sub_category_id);
  return Number.isInteger(id) && subIds.includes(id) ? id : subIds[0] ?? null;
};

const STATUTORY_NEEDED = {
  prescription_required: 'Rx status needed for this medicine',
  schedule_drug: 'Schedule H / controlled status needed for this medicine',
};

/** Yes / No / Not known for a statutory answer (true, false, or null / missing). */
/** Statutory fields the catalogue owns in a sub-category's form (Rx, Schedule H). */
export const statutoryFieldsOf = (forms, subId) =>
  ((forms[subId] && forms[subId].fields) || []).filter((f) => f.statutory === true && fieldSource(f) === 'catalog');

/** Row defaults (spec §F3 step 2): price = MRP hint, stock mode from the API, auto section. */
export const initialRow = (item, { subIds, sections }) => {
  const subId = itemSubId(item, subIds);
  const mrpHint = num(item.mrp_hint);
  const priceHint = num(item.price_hint);
  const mode = item.kind === 'service' ? 'always' : item.default_stock_mode || fallbackStockMode(item.kind === 'service' ? 'service' : 'product');
  const auto = (sections || []).find((s) => s.is_auto && Number(s.sub_category_id) === Number(subId));
  return {
    price: mrpHint ?? priceHint,
    mrp: mrpHint,
    stock_mode: mode,
    stock_qty: null,
    low_stock_threshold: mode === 'tracked' ? DEFAULT_LOW_STOCK : null,
    section_id: auto ? auto.id : null,
    sub_category_id: subId,
    metadata: {},
    // Owner answers to statutory fields; the catalogue's known values are pre-filled
    statutory: Object.fromEntries(Object.entries(item.statutory || {}).filter(([, v]) => v !== null && v !== undefined && v !== '')),
  };
};

/** Required store fields of a row's form (catalogue fields are filled from the catalogue). */
export const requiredStoreFields = (forms, subId) =>
  ((forms[subId] && forms[subId].fields) || []).filter((f) => f.required && fieldSource(f) === 'store' && f.type !== 'boolean');

/** Problems with one row: { price?, stock?, fields: { key: message } }. Empty object = ready. */
export const rowProblems = (row, forms) => {
  const p = {};
  const price = num(row.price);
  const mrp = num(row.mrp);
  if (price === null) p.price = 'Enter a price';
  else if (price < 0) p.price = 'Price must be 0 or more';
  else if (mrp !== null && price > mrp) p.price = 'Price is above MRP';
  if (row.stock_mode === 'tracked' && (num(row.stock_qty) === null || num(row.stock_qty) < 0)) p.stock = 'Enter stock';
  const fields = {};
  requiredStoreFields(forms, row.sub_category_id).forEach((f) => {
    const v = row.metadata?.[f.key];
    if (v === undefined || v === null || v === '') fields[f.key] = `${f.label || f.key} is required`;
  });
  if (Object.keys(fields).length) p.fields = fields;
  // Rx / Schedule H: the catalogue may not know them, so the owner must answer before Review
  const statutory = {};
  statutoryFieldsOf(forms, row.sub_category_id).forEach((f) => {
    const v = row.statutory?.[f.key];
    if (v === undefined || v === null || v === '') statutory[f.key] = STATUTORY_NEEDED[f.key] || `${f.label || f.key} needed for this medicine`;
  });
  if (Object.keys(statutory).length) p.statutory = statutory;
  return p;
};

export const hasProblems = (p) => Boolean(p.price || p.stock || p.fields || p.statutory);

/**
 * Step 2 of the picker: one row per ticked item with only the store's own fields
 * (price, MRP, stock, section, sub-category, required store fields). Catalogue facts are read-only.
 */
const BulkAddSheet = ({ items, rows, onRowChange, onRemove, sections, subCategories, forms, serverErrors, showErrors, isMobile }) => {
  const [stockForAll, setStockForAll] = useState(null);
  const [sectionForAll, setSectionForAll] = useState(undefined);
  const multiSub = subCategories.length > 1;
  const sectionOptions = sections.map((s) => ({ value: s.id, label: s.is_auto ? `${s.name} (auto)` : s.name }));

  const applyToAll = (patchFor) => items.forEach((it) => {
    const patch = patchFor(rows[it.id], it);
    if (patch) onRowChange(it.id, patch);
  });

  const priceEqualsMrp = () => applyToAll((row) => (num(row.mrp) !== null ? { price: num(row.mrp) } : null));
  const applyStock = () => {
    if (stockForAll === null) return;
    applyToAll((row) => (row.stock_mode === 'tracked' ? { stock_qty: stockForAll } : null));
  };
  const applySection = (value) => {
    setSectionForAll(value);
    applyToAll(() => ({ section_id: value ?? null }));
  };

  const renderRow = (item) => {
    const row = rows[item.id];
    if (!row) return null;
    // Price above MRP shows as soon as it is typed; missing values only after "Review"
    const allProblems = rowProblems(row, forms);
    const problems = showErrors ? allProblems : allProblems.price === 'Price is above MRP' ? { price: allProblems.price } : {};
    const server = serverErrors[item.id];
    const serverFieldErrors = {};
    (server?.errors || []).forEach((e) => {
      if (e?.key) serverFieldErrors[e.key] = e.message;
    });
    const priceError = problems.price || serverFieldErrors.price || (server?.reason === 'price_above_mrp' ? codeText('price_above_mrp') : '');
    const stockError = problems.stock || serverFieldErrors.stock_qty || (server?.reason === 'stock_qty_required' ? codeText('stock_qty_required') : '');
    const fields = requiredStoreFields(forms, row.sub_category_id);
    const statutoryFields = statutoryFieldsOf(forms, row.sub_category_id);
    const isService = item.kind === 'service';
    const idBase = `bulk-${String(item.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const facts = Array.isArray(item.facts) && item.facts.length ? item.facts : [item.brand && { label: 'Brand', value: item.brand }, item.size && { label: 'Size', value: item.size }].filter(Boolean);

    return (
      <div key={item.id} className={`mc-bulk-row ${hasProblems(problems) || server ? 'has-error' : ''}`}>
        <div className="mc-bulk-head">
          <ListingThumb src={item.image_url} alt="" className="mc-bulk-thumb" />
          <div className="mc-bulk-title">
            <div className="mc-bulk-name">{item.name}</div>
            <CatalogueFacts facts={facts} max={4} />
            {server && (
              <div className="ms-field-error" role="alert">
                {server.message || codeText(server.reason, 'Could not be added')}
              </div>
            )}
          </div>
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`} />
        </div>

        <div className="mc-bulk-fields">
          <label className="mc-bulk-field" htmlFor={`${idBase}-price`}>
            <span>Price (₹)</span>
            <InputNumber
              id={`${idBase}-price`}
              min={0}
              precision={2}
              inputMode="decimal"
              value={row.price}
              status={priceError ? 'error' : undefined}
              onChange={(v) => onRowChange(item.id, { price: v })}
              style={{ width: '100%' }}
            />
            {priceError && <em className="mc-err">{priceError}</em>}
          </label>
          <label className="mc-bulk-field" htmlFor={`${idBase}-mrp`}>
            <span>MRP (₹)</span>
            <InputNumber
              id={`${idBase}-mrp`}
              min={0}
              precision={2}
              inputMode="decimal"
              value={row.mrp}
              placeholder="Optional"
              onChange={(v) => onRowChange(item.id, { mrp: v })}
              style={{ width: '100%' }}
            />
          </label>
          <div className="mc-bulk-field mc-bulk-field--stock">
            <span id={`${idBase}-mode`}>Stock</span>
            {isService ? (
              <span className="ms-muted">Always available</span>
            ) : (
              <Segmented
                size="small"
                value={row.stock_mode}
                options={MODE_OPTIONS}
                aria-labelledby={`${idBase}-mode`}
                onChange={(mode) =>
                  onRowChange(item.id, {
                    stock_mode: mode,
                    low_stock_threshold: mode === 'tracked' ? row.low_stock_threshold ?? DEFAULT_LOW_STOCK : row.low_stock_threshold,
                  })
                }
              />
            )}
            {row.stock_mode === 'tracked' && (
              <QtyStepper
                value={row.stock_qty}
                onChange={(v) => onRowChange(item.id, { stock_qty: v })}
                ariaLabel={`Stock for ${item.name}`}
                size="small"
                status={stockError ? 'error' : ''}
              />
            )}
            {stockError && <em className="mc-err">{stockError}</em>}
          </div>
          {sections.length > 0 && (
            <label className="mc-bulk-field" htmlFor={`${idBase}-section`}>
              <span>Section</span>
              <Select
                id={`${idBase}-section`}
                size="small"
                allowClear
                placeholder="Automatic"
                value={row.section_id ?? undefined}
                options={sectionOptions}
                onChange={(v) => onRowChange(item.id, { section_id: v ?? null })}
                style={{ width: '100%' }}
              />
            </label>
          )}
          {multiSub && (
            <label className="mc-bulk-field" htmlFor={`${idBase}-sub`}>
              <span>Category</span>
              <Select
                id={`${idBase}-sub`}
                size="small"
                value={row.sub_category_id ?? undefined}
                options={subCategories.map((s) => ({ value: Number(s.id), label: s.name }))}
                onChange={(v) => {
                  const auto = sections.find((s) => s.is_auto && Number(s.sub_category_id) === Number(v));
                  const wasAuto = sections.find((s) => s.id === row.section_id)?.is_auto;
                  onRowChange(item.id, {
                    sub_category_id: v,
                    metadata: {},
                    ...(wasAuto || row.section_id === null ? { section_id: auto ? auto.id : null } : {}),
                  });
                }}
                style={{ width: '100%' }}
              />
            </label>
          )}
          {statutoryFields.map((f) => {
            // Pre-filled from the catalogue when it knows; otherwise the owner answers (required)
            const options =
              f.type === 'boolean'
                ? [{ value: true, label: 'Yes' }, { value: false, label: 'No' }]
                : (Array.isArray(f.options) ? f.options : []).map((o) => ({ value: o, label: o }));
            const err = allProblems.statutory?.[f.key];
            return (
              <label key={f.key} className="mc-bulk-field" htmlFor={`${idBase}-${f.key}`}>
                <span>{f.label || f.key}{row.statutory?.[f.key] === undefined ? ' (required)' : ''}</span>
                <Select
                  id={`${idBase}-${f.key}`}
                  className="mc-statutory-select"
                  placeholder="Not known"
                  status={err ? 'error' : undefined}
                  value={row.statutory?.[f.key]}
                  options={options}
                  onChange={(v) => onRowChange(item.id, { statutory: { ...(row.statutory || {}), [f.key]: v } })}
                  style={{ width: '100%' }}
                />
                {err && <em className="mc-err">{err}</em>}
              </label>
            );
          })}
          {fields.map((f) => {
            const err = problems.fields?.[f.key] || serverFieldErrors[f.key];
            return (
              <label key={f.key} className="mc-bulk-field" htmlFor={`${idBase}-${f.key}`}>
                <span>{f.label}</span>
                <SchemaFieldControl
                  field={f}
                  id={`${idBase}-${f.key}`}
                  size="small"
                  value={row.metadata?.[f.key]}
                  onChange={(v) => onRowChange(item.id, { metadata: { ...(row.metadata || {}), [f.key]: v } })}
                />
                {err && <em className="mc-err">{err}</em>}
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`mc-bulk ${isMobile ? 'is-mobile' : ''}`}>
      <div className="mc-bulk-helpers" aria-label="Apply to all rows">
        <Button size="small" onClick={priceEqualsMrp}>
          Price = MRP
        </Button>
        <span className="mc-bulk-helper">
          <span className="ms-muted">Stock for all</span>
          <InputNumber
            size="small"
            min={0}
            precision={0}
            inputMode="numeric"
            value={stockForAll}
            onChange={setStockForAll}
            aria-label="Stock for all counted items"
            style={{ width: 80 }}
          />
          <Button size="small" onClick={applyStock} disabled={stockForAll === null}>
            Apply
          </Button>
        </span>
        {sections.length > 0 && (
          <span className="mc-bulk-helper">
            <span className="ms-muted">Section for all</span>
            <Select
              size="small"
              allowClear
              placeholder="Automatic"
              value={sectionForAll}
              options={sectionOptions}
              onChange={applySection}
              aria-label="Section for all"
              style={{ minWidth: 140 }}
              popupMatchSelectWidth={false}
            />
          </span>
        )}
      </div>
      <div className="mc-bulk-list">{items.map(renderRow)}</div>
    </div>
  );
};

BulkAddSheet.propTypes = {
  items: PropTypes.array.isRequired,
  rows: PropTypes.object.isRequired,
  onRowChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  sections: PropTypes.array.isRequired,
  subCategories: PropTypes.array.isRequired,
  forms: PropTypes.object.isRequired,
  serverErrors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool,
  isMobile: PropTypes.bool,
};

export default BulkAddSheet;
