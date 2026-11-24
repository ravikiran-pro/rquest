import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { PictureOutlined } from '@ant-design/icons';
import { stockPill } from '../../../app/utils/stock';

export const formatINR = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export const ListingThumb = ({ src, alt, className }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className={`ms-thumb ${className || ''}`}>
      {src && !failed ? (
        <img src={src} alt={alt || ''} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="ms-thumb-fallback" aria-hidden="true">
          <PictureOutlined />
        </span>
      )}
    </div>
  );
};

ListingThumb.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  className: PropTypes.string,
};

export const ListingPrice = ({ item }) => {
  const price = Number(item.price) || 0;
  const mrp = Number(item.mrp) || 0;
  const discount = mrp > price && price > 0 ? Math.round((1 - price / mrp) * 100) : 0;
  return (
    <div className="ms-item-price-row">
      <span className="ms-price">{formatINR(price)}</span>
      {item.unit && <span className="ms-unit">/ {item.unit}</span>}
      {mrp > price && <span className="ms-mrp">{formatINR(mrp)}</span>}
      {discount > 0 && <span className="ms-discount">{discount}% off</span>}
    </div>
  );
};

ListingPrice.propTypes = { item: PropTypes.object.isRequired };

/** Count, "On", "Always", "Out", "Low · 3" */
export const StockPill = ({ item }) => {
  const pill = stockPill(item);
  return <span className={`mc-pill mc-pill--${pill.tone}`}>{pill.text}</span>;
};

StockPill.propTypes = { item: PropTypes.object.isRequired };

/** Orange dot for listings the server flags as missing details. */
export const NeedsDetailsDot = ({ show }) =>
  show ? (
    <span className="mc-needs-dot" title="Needs details" role="img" aria-label="Needs details" />
  ) : null;

NeedsDetailsDot.propTypes = { show: PropTypes.bool };

export const sectionName = (sections, id) => {
  if (id === null || id === undefined) return '';
  const hit = (sections || []).find((s) => String(s.id) === String(id));
  return hit ? hit.name : '';
};
