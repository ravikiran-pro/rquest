import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircleFilled, HomeOutlined, ShopOutlined, EnvironmentOutlined } from '@ant-design/icons';
import './profile-components.css';

export const getFormattedAddress = (addr) =>
  addr?.formatted_address ||
  [addr?.house_flat_floor, addr?.street_area, addr?.landmark, addr?.city, addr?.pincode]
    .filter(Boolean)
    .join(', ');

const getLabelIcon = (label) => {
  const l = (label || '').toLowerCase();
  if (l === 'home') return <HomeOutlined />;
  if (l === 'work' || l === 'office') return <ShopOutlined />;
  return <EnvironmentOutlined />;
};

/** Selectable saved-address row, used by the cart and the address picker. */
const AddressOption = ({ address, selected = false, onSelect }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    className={`rq-address-option${selected ? ' is-selected' : ''}`}
    onClick={() => onSelect?.(address)}
  >
    <span className="rq-address-option-icon">{getLabelIcon(address.label)}</span>

    <span className="rq-address-option-body">
      <span className="rq-address-option-head">
        <span className="rq-address-option-label">{address.label || 'Saved'}</span>
        {address.is_default && <span className="rq-address-option-default">Default</span>}
      </span>
      {address.recipient_name && <span className="rq-address-option-name">{address.recipient_name}</span>}
      <span className="rq-address-option-text">{getFormattedAddress(address)}</span>
    </span>

    <span className="rq-address-option-check" aria-hidden="true">
      {selected && <CheckCircleFilled />}
    </span>
  </button>
);

AddressOption.propTypes = {
  address: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  onSelect: PropTypes.func,
};

export default AddressOption;
