import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { PictureOutlined } from '@ant-design/icons';
import { SchemaFieldControl } from '../../../app/components/listings/SchemaField';
import { formatFieldValue } from '../../../app/utils/form_schema';
import './manage_store_catalog.css';

const SAMPLE_NAMES = {
  food: 'Sample dish',
  service: 'Sample service',
  rental: 'Sample rental',
  product: 'Sample product',
};

/**
 * Live preview for Form settings (spec §F8): the product card as customers see it,
 * then the add-product form built from the current draft. Values typed here are not saved.
 */
const FormPreviewCard = ({ fields, listingType, subName }) => {
  const [values, setValues] = useState({});
  const valueOf = (f) => (values[f.key] !== undefined ? values[f.key] : f.defaultValue);
  const specs = fields
    .map((f) => ({ key: f.key, label: f.label, text: formatFieldValue(f, valueOf(f)) }))
    .filter((s) => s.text)
    .slice(0, 4);

  return (
    <div className="mc-preview">
      <div className="ms-label">Customers see</div>
      <div className="mc-preview-card">
        <div className="mc-preview-img" aria-hidden="true">
          <PictureOutlined />
        </div>
        <div className="mc-preview-body">
          {specs.length > 0 && (
            <div className="mc-preview-specs">
              {specs.map((s) => (
                <span key={s.key} className="mc-preview-spec" title={s.label}>
                  {s.text}
                </span>
              ))}
            </div>
          )}
          <div className="mc-preview-name">{SAMPLE_NAMES[listingType] || SAMPLE_NAMES.product}</div>
          <div className="mc-preview-price">
            ₹100 <span className="ms-mrp">₹120</span>
          </div>
        </div>
      </div>

      <div className="ms-label" style={{ marginTop: 16 }}>
        Add-product form for {subName || 'this category'}
      </div>
      <div className="mc-preview-form">
        <div className="mc-preview-row is-core">Name · Price · MRP · Unit · Photo · Stock · Section</div>
        {fields.length === 0 && <div className="ms-muted">No extra fields.</div>}
        {fields.map((f) => (
          <div key={f.key} className="mc-preview-row">
            <label htmlFor={`preview-${f.key}`} className="mc-preview-label">
              {f.label}
              {f.required ? ' *' : ''}
              {f.origin === 'custom' && <span className="ms-mini-tag">Custom</span>}
            </label>
            <SchemaFieldControl
              field={f}
              id={`preview-${f.key}`}
              size="small"
              value={valueOf(f)}
              onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

FormPreviewCard.propTypes = {
  fields: PropTypes.array.isRequired,
  listingType: PropTypes.string,
  subName: PropTypes.string,
};

export default FormPreviewCard;
