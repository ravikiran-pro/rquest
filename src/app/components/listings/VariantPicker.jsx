import React from 'react';
import PropTypes from 'prop-types';
import { Radio } from 'antd';
import { axisLabel, axisValues, findVariant, selectOption } from '../../utils/variants';
import './listings.css';

/**
 * Option pickers for a listing with variants: one Radio.Group of buttons per axis.
 * Values whose combination with the other choices is sold out are shown struck through.
 *   selection  { axis: value } (controlled)
 *   onChange   (nextSelection, variant | null)
 */
const VariantPicker = ({ listing, selection, onChange, size = 'small', axisLabels = null, className = '' }) => {
  const axes = listing?.variant_axes || [];
  if (!axes.length) return null;
  return (
    <div
      className={`lc-variant-picker ${className}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      {axes.map((axis) => {
        const label = axisLabels?.[axis] || axisLabel(axis);
        return (
          <div key={axis} className="lc-variant-axis">
            <span className="lc-variant-axis-label" id={`vp-${listing.id}-${axis}`}>
              {label}
            </span>
            <Radio.Group
              size={size}
              optionType="button"
              buttonStyle="solid"
              value={selection?.[axis]}
              aria-labelledby={`vp-${listing.id}-${axis}`}
              onChange={(e) => {
                const next = selectOption(listing, selection, axis, e.target.value);
                onChange?.(next, findVariant(listing, next));
              }}
            >
              {axisValues(listing, axis).map((value) => {
                const combo = findVariant(listing, { ...(selection || {}), [axis]: value });
                const soldOut = combo ? combo.is_available === false || combo.stock_state === 'out' : false;
                return (
                  <Radio.Button
                    key={value}
                    value={value}
                    className={soldOut ? 'is-sold-out' : ''}
                    title={soldOut ? `${value}: sold out` : value}
                  >
                    {value}
                  </Radio.Button>
                );
              })}
            </Radio.Group>
          </div>
        );
      })}
    </div>
  );
};

VariantPicker.propTypes = {
  listing: PropTypes.object.isRequired,
  selection: PropTypes.object,
  onChange: PropTypes.func,
  size: PropTypes.oneOf(['small', 'middle', 'large']),
  axisLabels: PropTypes.object,
  className: PropTypes.string,
};

export default VariantPicker;
