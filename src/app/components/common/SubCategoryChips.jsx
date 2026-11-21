import React from 'react';
import PropTypes from 'prop-types';
import { colors } from '../../styles/theme';
import { shopSubCategories } from '../../utils/shopSubCategories';

const BASE_CHIP = {
  display: 'inline-block',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  borderRadius: 999,
  fontWeight: 600,
  lineHeight: '18px',
  background: colors.primaryLight,
  color: colors.primary,
  border: '1px solid rgba(11, 45, 107, 0.2)',
};

/**
 * All of a shop's sub-categories as small chips, primary first. Falls back to one
 * label (the category, or the shop type) when the shop has no sub-category.
 */
const SubCategoryChips = ({ shop, fallback = 'Store', size = 'sm' }) => {
  const list = shopSubCategories(shop);
  const fontSize = size === 'md' ? 12 : 11;
  const padding = size === 'md' ? '1px 8px' : '0 7px';

  if (list.length === 0) {
    const label = shop?.shopCategory?.name || shop?.shop_type || fallback;
    return (
      <span style={{ ...BASE_CHIP, fontSize, padding }} title={label}>
        {label}
      </span>
    );
  }

  return (
    <span
      role="list"
      aria-label="Sub-categories"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minWidth: 0, maxWidth: '100%' }}
    >
      {list.map((sub) => (
        <span role="listitem" key={sub.id} title={sub.name} style={{ ...BASE_CHIP, fontSize, padding }}>
          {sub.name}
        </span>
      ))}
    </span>
  );
};

SubCategoryChips.propTypes = {
  shop: PropTypes.object,
  fallback: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md']),
};

export default SubCategoryChips;
