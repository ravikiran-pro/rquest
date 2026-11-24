import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Switch } from 'antd';
import { QtyStepper } from '../../../app/components/listings/StockControl';
import { availabilityLabels } from '../../../app/utils/stock';

const SAVE_DELAY_MS = 600;

/**
 * Stock of each variant of a listing (Inventory tab). Counted variants get a stepper that
 * saves 600ms after the last change (or on blur); on/off variants a switch.
 *   save(update, rollback)  sends { variant_id, stock_qty | is_available } for this listing
 *                           (InventoryTab.saveRow); resolves to the server's listing or null
 */
const VariantStockRows = ({ item, save, isPhone }) => {
  const [drafts, setDrafts] = useState({});
  const timers = useRef({});
  const labels = availabilityLabels(item.listing_type);
  const mode = item.stock_mode;

  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
    },
    []
  );

  const clearDraft = (id) =>
    setDrafts((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });

  const commit = async (variant, qty) => {
    clearTimeout(timers.current[variant.id]);
    delete timers.current[variant.id];
    if (qty === null || qty === undefined || Number(qty) === Number(variant.stock_qty)) {
      clearDraft(variant.id);
      return;
    }
    await save({ variant_id: variant.id, stock_qty: qty }, () => {});
    clearDraft(variant.id);
  };

  const change = (variant, qty) => {
    setDrafts((d) => ({ ...d, [variant.id]: qty }));
    clearTimeout(timers.current[variant.id]);
    timers.current[variant.id] = setTimeout(() => commit(variant, qty), SAVE_DELAY_MS);
  };

  if (mode === 'always') return null;
  return (
    <div className="mc-inv-variants" role="list" aria-label={`Options of ${item.name}`}>
      {(item.variants || []).map((variant) => (
        <div key={variant.id} className="mc-inv-variant" role="listitem">
          <span className="mc-inv-variant-label">
            {variant.label}
            {variant.sku ? <span className="ms-muted"> · {variant.sku}</span> : null}
          </span>
          {mode === 'tracked' ? (
            <QtyStepper
              value={drafts[variant.id] !== undefined ? drafts[variant.id] : variant.stock_qty}
              onChange={(v) => change(variant, v)}
              onStep={(v) => change(variant, v)}
              onBlur={() => drafts[variant.id] !== undefined && commit(variant, drafts[variant.id])}
              ariaLabel={`Stock for ${item.name} ${variant.label}`}
              size={isPhone ? 'middle' : 'small'}
            />
          ) : (
            <label className="mc-inv-switch">
              <Switch
                size="small"
                checked={variant.is_available !== false}
                onChange={(checked) => save({ variant_id: variant.id, is_available: checked }, () => {})}
                aria-label={`${item.name} ${variant.label}: ${variant.is_available !== false ? labels.on : labels.off}`}
              />
              <span>{variant.is_available !== false ? labels.on : labels.off}</span>
            </label>
          )}
        </div>
      ))}
    </div>
  );
};

VariantStockRows.propTypes = {
  item: PropTypes.object.isRequired,
  save: PropTypes.func.isRequired,
  isPhone: PropTypes.bool,
};

export default VariantStockRows;
