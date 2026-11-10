import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Flex } from 'antd';
import {
  FilterOutlined,
  CheckCircleFilled,
  StarFilled,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { FILTER_CATEGORIES, countActiveFilters } from './filterUtils';
import { colors, radii } from '../../styles';

const FilterSidebar = ({
  filters,
  onFilterChange,
  onResetFilters,
  searchMode = 'items',
  categoryCounts = {},
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
          <CheckCircleFilled
            style={{
              fontSize: 15,
              color: filters.onlyAvailable ? colors.semantic.success : colors.textLight,
            }}
          />
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
          {FILTER_CATEGORIES.slice(0, 5).map((cat) => {
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
      </div>

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
            ☆ 4.0+
          </button>
        </Flex>
      </div>

      {/* Bottom Mini Trust Card */}
      <div
        style={{
          background: colors.surfaceContainerLow,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <SafetyCertificateOutlined style={{ fontSize: 18, color: colors.tertiary, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMain, marginBottom: 2 }}>
            100% Shelf Rate
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, lineHeight: 1.35 }}>
            No 25–35% hidden app markups. Exact shopkeeper bills.
          </div>
        </div>
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
  style: PropTypes.object,
};

export default FilterSidebar;
