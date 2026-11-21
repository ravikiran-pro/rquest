import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Flex, Select } from 'antd';
import {
  FilterOutlined,
  StarFilled,
} from '@ant-design/icons';
import { FILTER_CATEGORIES, countActiveFilters } from './filterUtils';
import { colors, radii } from '../../styles';
import './FilterSidebar.css';

// Custom-field filter groups shown before "more details" is opened
const MAX_FIELD_GROUPS = 3;

const FilterSidebar = ({
  filters,
  onFilterChange,
  onResetFilters,
  searchMode = 'items',
  categoryCounts = {},
  fieldFilters = [],
  subCategoryOptions = [],
  style = {},
}) => {
  const activeCount = countActiveFilters(filters, searchMode);

  const updateFilter = (key, value) => {
    onFilterChange?.({
      ...filters,
      [key]: value,
    });
  };

  const toggleCategory = (catId) => {
    const current = filters.categories || [];
    const exists = current.includes(catId);
    const updated = exists ? current.filter((id) => id !== catId) : [...current, catId];
    updateFilter('categories', updated);
  };

  const isPriceSelected = (min, max) => {
    return filters.minPrice === min && filters.maxPrice === max;
  };

  const selectPriceRange = (min, max) => {
    if (isPriceSelected(min, max)) {
      onFilterChange?.({ ...filters, minPrice: null, maxPrice: null });
    } else {
      onFilterChange?.({ ...filters, minPrice: min, maxPrice: max });
    }
  };

  // Category custom-field filters: picking the active value again clears it
  const activeFields = filters.fields || {};
  const selectFieldValue = (key, value) => {
    const next = { ...activeFields };
    if (next[key] === value) {
      delete next[key];
    } else {
      next[key] = value;
    }
    updateFilter('fields', next);
  };
  const showFieldFilters = searchMode === 'items' && fieldFilters.length > 0;
  // Keep the panel short: show the first few groups (and any in use), the rest on demand
  const [showAllFields, setShowAllFields] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  // Top categories first; the rest sit behind "more" so they stay reachable
  const VISIBLE_CATEGORY_COUNT = 5;
  const visibleCategories = showAllCategories
    ? FILTER_CATEGORIES
    : FILTER_CATEGORIES.slice(0, VISIBLE_CATEGORY_COUNT);
  const hiddenCategoryCount = FILTER_CATEGORIES.length - VISIBLE_CATEGORY_COUNT;
  const isFieldActive = (field) =>
    activeFields[field.key] !== undefined && activeFields[field.key] !== null && activeFields[field.key] !== '';
  const visibleFieldFilters = showAllFields
    ? fieldFilters
    : fieldFilters.filter((field, index) => index < MAX_FIELD_GROUPS || isFieldActive(field));
  const hiddenFieldCount = fieldFilters.length - visibleFieldFilters.length;

  const selectRating = (val) => {
    if (filters.minRating === val) {
      updateFilter('minRating', null);
    } else {
      updateFilter('minRating', val);
    }
  };

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        padding: '16px 16px 20px',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
        width: '100%',
        ...style,
      }}
    >
      {/* Sidebar Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Flex align="center" gap={8}>
          <FilterOutlined style={{ fontSize: 15, color: colors.primary }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: colors.textMain }}>Filters</span>
          {activeCount > 0 && (
            <span
              style={{
                background: colors.primaryLight,
                color: colors.primary,
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: radii.full,
              }}
            >
              {activeCount} active
            </span>
          )}
        </Flex>

        {activeCount > 0 && (
          <button
            onClick={onResetFilters}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear All
          </button>
        )}
      </Flex>

      {/* Quick Direct Verification Toggles */}
      <div
        style={{
          background: colors.surfaceContainerLow,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: '10px 12px',
          marginBottom: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <Flex
          align="center"
          gap={8}
          style={{ cursor: 'pointer' }}
          onClick={() => updateFilter('onlyAvailable', !filters.onlyAvailable)}
        >
          <Checkbox checked={Boolean(filters.onlyAvailable)} style={{ fontSize: 12 }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: filters.onlyAvailable ? 700 : 500,
              color: colors.textMain,
            }}
          >
            Physical Shelf Stock
          </span>
        </Flex>

        <Flex
          align="center"
          gap={8}
          style={{ cursor: 'pointer' }}
          onClick={() => updateFilter('verifiedToday', !filters.verifiedToday)}
        >
          <Checkbox checked={Boolean(filters.verifiedToday)} style={{ fontSize: 12 }} />
          <span style={{ fontSize: 12, color: colors.textMain, fontWeight: 500 }}>
            Verified in Store Today
          </span>
        </Flex>

        <Flex
          align="center"
          gap={8}
          style={{ cursor: 'pointer' }}
          onClick={() => updateFilter('immediatePickup', !filters.immediatePickup)}
        >
          <Checkbox checked={Boolean(filters.immediatePickup)} style={{ fontSize: 12 }} />
          <span style={{ fontSize: 12, color: colors.textMain, fontWeight: 500 }}>
            Ready for Immediate Pickup
          </span>
        </Flex>
      </div>

      {/* CATEGORIES */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: colors.textMuted,
            marginBottom: 10,
          }}
        >
          Categories
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {visibleCategories.map((cat) => {
            const isChecked = (filters.categories || []).includes(cat.id);
            const count = categoryCounts[cat.id] || 0;
            return (
              <Flex
                key={cat.id}
                justify="space-between"
                align="center"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleCategory(cat.id)}
              >
                <Flex align="center" gap={8}>
                  <Checkbox checked={isChecked} />
                  <span
                    style={{
                      fontSize: 13,
                      color: isChecked ? colors.textMain : colors.textMuted,
                      fontWeight: isChecked ? 600 : 400,
                    }}
                  >
                    {cat.label}
                  </span>
                </Flex>
                <span
                  style={{
                    fontSize: 11,
                    color: count > 0 ? colors.textMuted : colors.textLight,
                    fontWeight: count > 0 ? 600 : 400,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {count}
                </span>
              </Flex>
            );
          })}
        </div>
        {hiddenCategoryCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllCategories((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: colors.primary,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              marginTop: 10,
            }}
          >
            {showAllCategories ? 'Show fewer categories' : `+ ${hiddenCategoryCount} more categories`}
          </button>
        )}
      </div>

      {/* SUB-CATEGORIES (shops): a shop matches when it is in any selected one */}
      {searchMode === 'shops' && subCategoryOptions.length > 0 && (
        <div style={{ marginBottom: 18 }} data-testid="sub-category-filter">
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: colors.textMuted,
              marginBottom: 10,
            }}
          >
            Sub-categories
          </div>
          <Select
            className="filter-sidebar-subcategory"
            mode="multiple"
            allowClear
            showSearch
            aria-label="Filter stores by sub-category"
            placeholder="Any sub-category"
            value={(filters.subCategoryIds || []).map(String)}
            onChange={(values) => updateFilter('subCategoryIds', values)}
            options={subCategoryOptions}
            optionFilterProp="label"
            maxTagCount="responsive"
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* CATEGORY CUSTOM-FIELD FILTERS (only when the results have them) */}
      {showFieldFilters && (
        <div style={{ marginBottom: 18 }} data-testid="field-filters">
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: colors.textMuted,
              marginBottom: 10,
            }}
          >
            Refine By Details
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleFieldFilters.map((field) =>
              field.type === 'boolean' ? (
                <Flex key={field.key} gap={6} wrap="wrap">
                  <button
                    aria-pressed={activeFields[field.key] === true}
                    onClick={() => selectFieldValue(field.key, true)}
                    style={{
                        padding: '5px 10px',
                        borderRadius: radii.full,
                        border: `1px solid ${activeFields[field.key] === true ? colors.primary : colors.border}`,
                        background: activeFields[field.key] === true ? colors.primaryLight : colors.surface,
                        color: activeFields[field.key] === true ? colors.primary : colors.textMain,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                  >
                    {field.label}
                  </button>
                </Flex>
              ) : (
                <div key={field.key}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: colors.textMain,
                      marginBottom: 6,
                    }}
                  >
                    {field.label}
                  </div>
                  <Flex gap={6} wrap="wrap">
                    {field.values.map((value) => (
                      <button
                        key={value}
                        aria-pressed={activeFields[field.key] === value}
                        onClick={() => selectFieldValue(field.key, value)}
                        style={{
                        padding: '5px 10px',
                        borderRadius: radii.full,
                        border: `1px solid ${activeFields[field.key] === value ? colors.primary : colors.border}`,
                        background: activeFields[field.key] === value ? colors.primaryLight : colors.surface,
                        color: activeFields[field.key] === value ? colors.primary : colors.textMain,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      >
                        {value}
                      </button>
                    ))}
                  </Flex>
                </div>
              )
            )}
          </div>
          {(hiddenFieldCount > 0 || showAllFields) && fieldFilters.length > MAX_FIELD_GROUPS && (
            <button
              onClick={() => setShowAllFields(!showAllFields)}
              style={{
                background: 'none',
                border: 'none',
                color: colors.primary,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                marginTop: 10,
              }}
            >
              {showAllFields ? 'Show fewer details' : `+ ${hiddenFieldCount} more details`}
            </button>
          )}
        </div>
      )}

      {/* PRICE RANGE (Offerings mode only) */}
      {searchMode === 'items' && (
        <div style={{ marginBottom: 18 }}>
        <Flex justify="space-between" align="center" style={{ marginBottom: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: colors.textMuted,
            }}
          >
            Price Range
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: colors.primary }}>
            {filters.minPrice !== null || filters.maxPrice !== null
              ? `₹${filters.minPrice || 0} - ₹${filters.maxPrice || '1,000+'}`
              : '₹0 - ₹1,000+'}
          </span>
        </Flex>

        <Flex gap={6} wrap="wrap">
          <button
            onClick={() => selectPriceRange(0, 100)}
            style={{
              padding: '5px 10px',
              borderRadius: radii.full,
              border: `1px solid ${isPriceSelected(0, 100) ? colors.primary : colors.border}`,
              background: isPriceSelected(0, 100) ? colors.primaryLight : colors.surface,
              color: isPriceSelected(0, 100) ? colors.primary : colors.textMain,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Under ₹100
          </button>
          <button
            onClick={() => selectPriceRange(100, 500)}
            style={{
              padding: '5px 10px',
              borderRadius: radii.full,
              border: `1px solid ${isPriceSelected(100, 500) ? colors.primary : colors.border}`,
              background: isPriceSelected(100, 500) ? colors.primaryLight : colors.surface,
              color: isPriceSelected(100, 500) ? colors.primary : colors.textMain,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            ₹100 - ₹500
          </button>
          <button
            onClick={() => selectPriceRange(500, 10000)}
            style={{
              padding: '5px 10px',
              borderRadius: radii.full,
              border: `1px solid ${isPriceSelected(500, 10000) ? colors.primary : colors.border}`,
              background: isPriceSelected(500, 10000) ? colors.primaryLight : colors.surface,
              color: isPriceSelected(500, 10000) ? colors.primary : colors.textMain,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            ₹500+
          </button>
        </Flex>
        </div>
      )}

      {/* MERCHANT RATING */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: colors.textMuted,
            marginBottom: 10,
          }}
        >
          Merchant Rating
        </div>

        <Flex gap={6} wrap="wrap">
          <button
            onClick={() => selectRating(4.5)}
            style={{
              padding: '5px 10px',
              borderRadius: radii.full,
              border: `1px solid ${filters.minRating === 4.5 ? colors.primary : colors.border}`,
              background: filters.minRating === 4.5 ? colors.primaryLight : colors.surface,
              color: filters.minRating === 4.5 ? colors.primary : colors.textMain,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease',
            }}
          >
            <StarFilled style={{ fontSize: 11, color: colors.starGold }} />
            4.5+ (Top Rated)
          </button>
          <button
            onClick={() => selectRating(4.0)}
            style={{
              padding: '5px 10px',
              borderRadius: radii.full,
              border: `1px solid ${filters.minRating === 4.0 ? colors.primary : colors.border}`,
              background: filters.minRating === 4.0 ? colors.primaryLight : colors.surface,
              color: filters.minRating === 4.0 ? colors.primary : colors.textMain,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease',
            }}
          >
            4.0+ rating
          </button>
        </Flex>
      </div>
    </div>
  );
};

FilterSidebar.propTypes = {
  filters: PropTypes.object.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onResetFilters: PropTypes.func.isRequired,
  searchMode: PropTypes.string,
  categoryCounts: PropTypes.object,
  subCategoryOptions: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string })
  ),
  fieldFilters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string,
      type: PropTypes.string,
      values: PropTypes.array,
    })
  ),
  style: PropTypes.object,
};

export default FilterSidebar;
