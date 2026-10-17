import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Slider,
  Drawer,
  Popover,
  Button,
  Typography,
  Flex,
  Segmented,
  Radio,
  Grid,
  Rate,
  Switch,
} from 'antd';
import {
  FilterOutlined,
  DownOutlined,
  EnvironmentOutlined,
  StarFilled,
  AppstoreOutlined,
  BarsOutlined,
  DollarOutlined,
  SwapOutlined,
  CheckOutlined,
  ShopOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import {
  DEFAULT_FILTERS,
  DISTANCE_PRESETS,
  FILTER_CATEGORIES,
  PRICE_PRESETS,
  RATING_PRESETS,
  LISTING_TYPE_OPTIONS,
  SORT_OPTIONS,
  countActiveFilters,
} from './filterUtils';
import './SearchFilterBar.css';

const { Text } = Typography;

const SearchFilterBar = ({
  searchMode = 'items', // 'items' | 'shops'
  filters = DEFAULT_FILTERS,
  onFilterChange,
  onResetFilters,
  totalResults = 0,
  viewMode = 'grid', // 'grid' | 'list'
  onViewModeChange,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activePopover, setActivePopover] = useState(null);

  const activeCount = countActiveFilters(filters, searchMode);

  // Helper updater for partial filter keys
  const updateFilter = (key, value) => {
    onFilterChange?.({
      ...filters,
      [key]: value,
    });
  };

  // Toggle category in array
  const toggleCategory = (catId) => {
    const current = filters.categories || [];
    const exists = current.includes(catId);
    const updated = exists
      ? current.filter((id) => id !== catId)
      : [...current, catId];
    updateFilter('categories', updated);
  };

  // Render Category Select Content
  const renderCategoryContent = () => (
    <div className="filter-popover-content" style={{ width: 320 }}>
      <div className="popover-header">
        <span className="popover-title">Business Category</span>
        {filters.categories?.length > 0 && (
          <button
            className="popover-reset"
            onClick={() => updateFilter('categories', [])}
          >
            Clear ({filters.categories.length})
          </button>
        )}
      </div>
      <div className="categories-select-grid">
        {FILTER_CATEGORIES.map((cat) => {
          const isSelected = (filters.categories || []).includes(cat.id);
          return (
            <div
              key={cat.id}
              className={`category-select-card ${isSelected ? 'active' : ''}`}
              onClick={() => toggleCategory(cat.id)}
            >
              <span>{cat.icon}</span>
              <span style={{ flex: 1 }}>{cat.label}</span>
              {isSelected && <CheckOutlined style={{ fontSize: 11, color: '#4f46e5' }} />}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Distance Radius Content
  const renderDistanceContent = () => {
    const currentDist = filters.maxDistance ?? 30;
    return (
      <div className="filter-popover-content">
        <div className="popover-header">
          <span className="popover-title">Distance Radius</span>
          {filters.maxDistance !== null && (
            <button
              className="popover-reset"
              onClick={() => updateFilter('maxDistance', null)}
            >
              Reset
            </button>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Maximum Radius:
            </Text>
            <Text strong style={{ color: '#4f46e5', fontSize: 14 }}>
              {filters.maxDistance ? `${filters.maxDistance} km` : 'Unlimited / Any'}
            </Text>
          </Flex>

          <Slider
            min={1}
            max={30}
            step={1}
            value={currentDist}
            onChange={(val) => updateFilter('maxDistance', val === 30 ? null : val)}
            tooltip={{
              formatter: (val) => (val === 30 ? 'All distances' : `${val} km`),
            }}
          />
        </div>

        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
          Quick Presets
        </Text>
        <div className="presets-grid">
          {DISTANCE_PRESETS.map((dp) => {
            const isMatch = filters.maxDistance === dp.value;
            return (
              <button
                key={dp.label}
                type="button"
                className={`preset-chip ${isMatch ? 'active' : ''}`}
                onClick={() => updateFilter('maxDistance', dp.value)}
              >
                <span>{dp.icon}</span> {dp.shortLabel}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Price Range Content (Items only)
  const renderPriceContent = () => {
    const minVal = filters.minPrice ?? 0;
    const maxVal = filters.maxPrice ?? 3000;
    return (
      <div className="filter-popover-content">
        <div className="popover-header">
          <span className="popover-title">Price Range</span>
          {(filters.minPrice !== null || filters.maxPrice !== null) && (
            <button
              className="popover-reset"
              onClick={() => {
                onFilterChange?.({
                  ...filters,
                  minPrice: null,
                  maxPrice: null,
                });
              }}
            >
              Reset
            </button>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <Slider
            range
            min={0}
            max={3000}
            step={50}
            value={[minVal, maxVal]}
            onChange={(val) => {
              onFilterChange?.({
                ...filters,
                minPrice: val[0] === 0 ? null : val[0],
                maxPrice: val[1] === 3000 ? null : val[1],
              });
            }}
            tooltip={{
              formatter: (val) => `₹${val}`,
            }}
          />

          <div className="price-input-row">
            <div className="price-input-box">
              <span className="price-currency-symbol">₹</span>
              <input
                type="number"
                placeholder="Min"
                className="price-input-field"
                value={filters.minPrice ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  updateFilter('minPrice', val);
                }}
              />
            </div>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>to</span>
            <div className="price-input-box">
              <span className="price-currency-symbol">₹</span>
              <input
                type="number"
                placeholder="Max"
                className="price-input-field"
                value={filters.maxPrice ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  updateFilter('maxPrice', val);
                }}
              />
            </div>
          </div>
        </div>

        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
          Popular Budgets
        </Text>
        <div className="presets-grid">
          {PRICE_PRESETS.map((pp) => {
            const isMatch =
              (filters.minPrice === pp.min || (pp.min === 0 && filters.minPrice === null)) &&
              (filters.maxPrice === pp.max || (pp.max === 10000 && filters.maxPrice === 10000));
            return (
              <button
                key={pp.label}
                type="button"
                className={`preset-chip ${isMatch ? 'active' : ''}`}
                onClick={() => {
                  onFilterChange?.({
                    ...filters,
                    minPrice: pp.min === 0 ? null : pp.min,
                    maxPrice: pp.max,
                  });
                }}
              >
                {pp.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Rating Content
  const renderRatingContent = () => (
    <div className="filter-popover-content" style={{ width: 240 }}>
      <div className="popover-header">
        <span className="popover-title">Customer Rating</span>
        {filters.minRating !== null && (
          <button
            className="popover-reset"
            onClick={() => updateFilter('minRating', null)}
          >
            Reset
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {RATING_PRESETS.map((rp) => {
          const isSelected = filters.minRating === rp.value;
          return (
            <div
              key={rp.label}
              className={`preset-chip ${isSelected ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 8,
              }}
              onClick={() => updateFilter('minRating', rp.value)}
            >
              <span>{rp.label}</span>
              {rp.value && <Rate disabled defaultValue={rp.value} allowHalf style={{ fontSize: 12 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Sort Content
  const renderSortContent = () => (
    <div className="filter-popover-content" style={{ width: 230 }}>
      <div className="popover-header">
        <span className="popover-title">Sort Results</span>
      </div>

      <Radio.Group
        value={filters.sortBy || 'distance_asc'}
        onChange={(e) => updateFilter('sortBy', e.target.value)}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {SORT_OPTIONS.filter((opt) => !opt.itemsOnly || searchMode === 'items').map((opt) => (
          <Radio key={opt.value} value={opt.value} style={{ fontSize: 13, fontWeight: 500 }}>
            <span style={{ marginRight: 6 }}>{opt.icon}</span> {opt.label}
          </Radio>
        ))}
      </Radio.Group>
    </div>
  );

  // Active Tag representations
  const renderActiveFilterTags = () => {
    const tags = [];

    // Distance
    if (filters.maxDistance) {
      tags.push({
        key: 'dist',
        label: `Within ${filters.maxDistance} km`,
        icon: <EnvironmentOutlined />,
        onRemove: () => updateFilter('maxDistance', null),
      });
    }

    // Categories
    (filters.categories || []).forEach((catId) => {
      const def = FILTER_CATEGORIES.find((c) => c.id === catId);
      tags.push({
        key: `cat_${catId}`,
        label: def?.label || catId,
        icon: def?.icon,
        onRemove: () => toggleCategory(catId),
      });
    });

    // Rating
    if (filters.minRating) {
      tags.push({
        key: 'rating',
        label: `${filters.minRating}★ & above`,
        icon: <StarFilled style={{ color: '#eab308' }} />,
        onRemove: () => updateFilter('minRating', null),
      });
    }

    // Items-specific tags
    if (searchMode === 'items') {
      if (filters.minPrice !== null || filters.maxPrice !== null) {
        let priceStr = 'Price: ';
        if (filters.minPrice && filters.maxPrice) priceStr += `₹${filters.minPrice} - ₹${filters.maxPrice}`;
        else if (filters.minPrice) priceStr += `Min ₹${filters.minPrice}`;
        else if (filters.maxPrice) priceStr += `Under ₹${filters.maxPrice}`;
        tags.push({
          key: 'price',
          label: priceStr,
          icon: <DollarOutlined />,
          onRemove: () => {
            onFilterChange?.({ ...filters, minPrice: null, maxPrice: null });
          },
        });
      }

      if (filters.listingType && filters.listingType !== 'all') {
        const typeOpt = LISTING_TYPE_OPTIONS.find((t) => t.value === filters.listingType);
        tags.push({
          key: 'listingType',
          label: typeOpt?.label || filters.listingType,
          icon: typeOpt?.icon,
          onRemove: () => updateFilter('listingType', 'all'),
        });
      }
    }

    // Availability Tag
    if (filters.onlyAvailable) {
      tags.push({
        key: 'available',
        label: 'Available Now',
        icon: <CheckCircleFilled style={{ color: '#22c55e' }} />,
        onRemove: () => updateFilter('onlyAvailable', false),
      });
    }

    // Sort Tag (if not default)
    if (filters.sortBy && filters.sortBy !== 'distance_asc') {
      const sortOpt = SORT_OPTIONS.find((s) => s.value === filters.sortBy);
      tags.push({
        key: 'sort',
        label: `Sort: ${sortOpt?.label || filters.sortBy}`,
        icon: <SwapOutlined />,
        onRemove: () => updateFilter('sortBy', 'distance_asc'),
      });
    }

    if (tags.length === 0) return null;

    return (
      <div className="active-tags-strip">
        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
          Active Filters:
        </Text>
        {tags.map((t) => (
          <div key={t.key} className="active-tag-chip">
            {t.icon && <span style={{ marginRight: 2 }}>{t.icon}</span>}
            <span>{t.label}</span>
            <span
              className="active-tag-close"
              onClick={t.onRemove}
              title="Remove filter"
            >
              ✕
            </span>
          </div>
        ))}

        <button className="clear-all-link" onClick={onResetFilters}>
          Clear All
        </button>
      </div>
    );
  };

  return (
    <div className="search-filter-wrapper">
      <div className="search-filter-container">
        {/* Horizontal Pills Row */}
        <div className="filter-pills-row">
          {/* Master "All Filters" Button */}
          <button
            type="button"
            className={`filter-pill-btn master-filter ${activeCount > 0 ? 'active' : ''}`}
            onClick={() => setIsDrawerOpen(true)}
          >
            <FilterOutlined style={{ fontSize: 13 }} />
            <span>Filters</span>
            {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
          </button>

          {/* Location Range (Distance) Popover / Trigger */}
          <Popover
            content={renderDistanceContent()}
            trigger="click"
            open={!isMobile && activePopover === 'distance'}
            onOpenChange={(visible) => setActivePopover(visible ? 'distance' : null)}
            placement="bottomLeft"
          >
            <button
              type="button"
              className={`filter-pill-btn ${filters.maxDistance !== null ? 'active' : ''}`}
              onClick={() => isMobile && setIsDrawerOpen(true)}
            >
              <EnvironmentOutlined />
              <span>
                {filters.maxDistance ? `< ${filters.maxDistance} km` : 'Distance'}
              </span>
              <DownOutlined className="filter-pill-chevron" />
            </button>
          </Popover>

          {/* Category Popover / Trigger */}
          <Popover
            content={renderCategoryContent()}
            trigger="click"
            open={!isMobile && activePopover === 'category'}
            onOpenChange={(visible) => setActivePopover(visible ? 'category' : null)}
            placement="bottomLeft"
          >
            <button
              type="button"
              className={`filter-pill-btn ${(filters.categories?.length || 0) > 0 ? 'active' : ''}`}
              onClick={() => isMobile && setIsDrawerOpen(true)}
            >
              <AppstoreOutlined />
              <span>
                {filters.categories?.length > 0
                  ? `Category (${filters.categories.length})`
                  : 'Category'}
              </span>
              <DownOutlined className="filter-pill-chevron" />
            </button>
          </Popover>

          {/* Price Range Popover / Trigger (Items only) */}
          {searchMode === 'items' && (
            <Popover
              content={renderPriceContent()}
              trigger="click"
              open={!isMobile && activePopover === 'price'}
              onOpenChange={(visible) => setActivePopover(visible ? 'price' : null)}
              placement="bottomLeft"
            >
              <button
                type="button"
                className={`filter-pill-btn ${
                  filters.minPrice !== null || filters.maxPrice !== null ? 'active' : ''
                }`}
                onClick={() => isMobile && setIsDrawerOpen(true)}
              >
                <DollarOutlined />
                <span>
                  {filters.minPrice || filters.maxPrice
                    ? `Price: ₹${filters.minPrice || 0} - ₹${filters.maxPrice || 'Any'}`
                    : 'Price Range'}
                </span>
                <DownOutlined className="filter-pill-chevron" />
              </button>
            </Popover>
          )}

          {/* Rating Popover / Trigger */}
          <Popover
            content={renderRatingContent()}
            trigger="click"
            open={!isMobile && activePopover === 'rating'}
            onOpenChange={(visible) => setActivePopover(visible ? 'rating' : null)}
            placement="bottomLeft"
          >
            <button
              type="button"
              className={`filter-pill-btn ${filters.minRating !== null ? 'active' : ''}`}
              onClick={() => isMobile && setIsDrawerOpen(true)}
            >
              <StarFilled style={{ color: filters.minRating ? '#eab308' : '#94a3b8' }} />
              <span>{filters.minRating ? `${filters.minRating}★+` : 'Rating'}</span>
              <DownOutlined className="filter-pill-chevron" />
            </button>
          </Popover>

          {/* Available Now Quick Toggle Pill */}
          <button
            type="button"
            className={`filter-pill-btn ${filters.onlyAvailable ? 'active' : ''}`}
            onClick={() => updateFilter('onlyAvailable', !filters.onlyAvailable)}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: filters.onlyAvailable ? '#22c55e' : '#94a3b8',
                marginRight: 4,
              }}
            />
            <span>Available Now</span>
          </button>

          {/* Quick Presets / Shortcuts for fast 1-tap filtering */}
          <button
            type="button"
            className={`filter-pill-btn ${filters.maxDistance === 2 ? 'active' : ''}`}
            onClick={() => updateFilter('maxDistance', filters.maxDistance === 2 ? null : 2)}
          >
            <span>⚡ Within 2 km</span>
          </button>

          {searchMode === 'items' && (
            <button
              type="button"
              className={`filter-pill-btn ${filters.maxPrice === 100 ? 'active' : ''}`}
              onClick={() => {
                const isUnder100 = filters.maxPrice === 100 && (filters.minPrice === null || filters.minPrice === 0);
                onFilterChange?.({
                  ...filters,
                  minPrice: null,
                  maxPrice: isUnder100 ? null : 100,
                });
              }}
            >
              <span>💰 Under ₹100</span>
            </button>
          )}

          {/* Sort By Popover / Trigger */}
          <Popover
            content={renderSortContent()}
            trigger="click"
            open={!isMobile && activePopover === 'sort'}
            onOpenChange={(visible) => setActivePopover(visible ? 'sort' : null)}
            placement="bottomRight"
          >
            <button
              type="button"
              className={`filter-pill-btn ${filters.sortBy !== 'distance_asc' ? 'active' : ''}`}
              onClick={() => isMobile && setIsDrawerOpen(true)}
              style={{ marginLeft: 'auto' }}
            >
              <SwapOutlined />
              <span>
                {SORT_OPTIONS.find((s) => s.value === filters.sortBy)?.label || 'Sort'}
              </span>
              <DownOutlined className="filter-pill-chevron" />
            </button>
          </Popover>

          {/* Quick Reset Pill if filters are active */}
          {activeCount > 0 && (
            <button
              type="button"
              className="filter-pill-btn reset-btn"
              onClick={onResetFilters}
              title="Reset all filters"
              style={{ color: '#ef4444', borderColor: '#fca5a5' }}
            >
              <span>Reset</span>
            </button>
          )}

          {/* View Mode Switcher (Grid / List) */}
          {onViewModeChange && (
            <div className="view-mode-toggle-group">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => onViewModeChange('grid')}
                title="Grid View"
                aria-label="Grid View"
              >
                <AppstoreOutlined />
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => onViewModeChange('list')}
                title="List View"
                aria-label="List View"
              >
                <BarsOutlined />
              </button>
            </div>
          )}
        </div>

        {/* Active Filter Chips Strip */}
        {renderActiveFilterTags()}
      </div>

      {/* Comprehensive Filter Drawer (Bottom Sheet on Mobile, Slideover on Desktop) */}
      <Drawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        placement={isMobile ? 'bottom' : 'right'}
        width={isMobile ? '100%' : 420}
        height={isMobile ? '88vh' : undefined}
        title={
          <Flex justify="space-between" align="center" style={{ width: '100%' }}>
            <Flex align="center" gap={8}>
              <FilterOutlined style={{ color: '#4f46e5' }} />
              <span style={{ fontWeight: 800, fontSize: 16 }}>All Filters & Sort</span>
              {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
            </Flex>
            {activeCount > 0 && (
              <Button type="link" size="small" onClick={onResetFilters} danger style={{ fontWeight: 600 }}>
                Reset All
              </Button>
            )}
          </Flex>
        }
        className="mobile-filter-drawer"
        style={{
          borderTopLeftRadius: isMobile ? 20 : 0,
          borderTopRightRadius: isMobile ? 20 : 0,
          overflow: 'hidden',
        }}
      >
        <div className="mobile-drawer-body-inner">
          {isMobile && <div className="mobile-drawer-handle" />}

          {/* Display Layout Switcher (Grid / List) */}
          {onViewModeChange && (
            <div className="mobile-filter-section">
              <div className="mobile-section-header">
                <span className="mobile-section-title">
                  <AppstoreOutlined style={{ color: '#4f46e5' }} /> Display Layout
                </span>
              </div>
              <Segmented
                block
                value={viewMode}
                onChange={onViewModeChange}
                options={[
                  { label: 'Grid View', value: 'grid', icon: <AppstoreOutlined /> },
                  { label: 'List View', value: 'list', icon: <BarsOutlined /> },
                ]}
                style={{ fontWeight: 600, padding: 4, background: '#f1f5f9' }}
              />
            </div>
          )}

          {/* Section 1: Location Radius */}
          <div className="mobile-filter-section">
            <div className="mobile-section-header">
              <span className="mobile-section-title">
                <EnvironmentOutlined style={{ color: '#4f46e5' }} /> Distance Radius
              </span>
              <Text strong style={{ color: '#4f46e5', fontSize: 13 }}>
                {filters.maxDistance ? `Within ${filters.maxDistance} km` : 'Any Distance'}
              </Text>
            </div>

            <Slider
              min={1}
              max={30}
              step={1}
              value={filters.maxDistance ?? 30}
              onChange={(val) => updateFilter('maxDistance', val === 30 ? null : val)}
              tooltip={{
                formatter: (val) => (val === 30 ? 'All distances' : `${val} km`),
              }}
            />

            <div className="presets-grid" style={{ marginTop: 8 }}>
              {DISTANCE_PRESETS.map((dp) => (
                <button
                  key={dp.label}
                  type="button"
                  className={`preset-chip ${filters.maxDistance === dp.value ? 'active' : ''}`}
                  onClick={() => updateFilter('maxDistance', dp.value)}
                >
                  <span>{dp.icon}</span> {dp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Sort By */}
          <div className="mobile-filter-section">
            <div className="mobile-section-header">
              <span className="mobile-section-title">
                <SwapOutlined style={{ color: '#4f46e5' }} /> Sort Order
              </span>
            </div>

            <Radio.Group
              value={filters.sortBy || 'distance_asc'}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {SORT_OPTIONS.filter((opt) => !opt.itemsOnly || searchMode === 'items').map((opt) => (
                <Radio key={opt.value} value={opt.value} style={{ fontSize: 13, fontWeight: 500 }}>
                  <span style={{ marginRight: 6 }}>{opt.icon}</span> {opt.label}
                </Radio>
              ))}
            </Radio.Group>
          </div>

          {/* Section 3: Categories */}
          <div className="mobile-filter-section">
            <div className="mobile-section-header">
              <span className="mobile-section-title">
                <AppstoreOutlined style={{ color: '#4f46e5' }} /> Business Category
              </span>
              {filters.categories?.length > 0 && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => updateFilter('categories', [])}
                  style={{ padding: 0, fontSize: 12 }}
                >
                  Clear ({filters.categories.length})
                </Button>
              )}
            </div>

            <div className="categories-select-grid">
              {FILTER_CATEGORIES.map((cat) => {
                const isSelected = (filters.categories || []).includes(cat.id);
                return (
                  <div
                    key={cat.id}
                    className={`category-select-card ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleCategory(cat.id)}
                  >
                    <span>{cat.icon}</span>
                    <span style={{ flex: 1 }}>{cat.label}</span>
                    {isSelected && <CheckOutlined style={{ fontSize: 11, color: '#4f46e5' }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Price Range (Items only) */}
          {searchMode === 'items' && (
            <div className="mobile-filter-section">
              <div className="mobile-section-header">
                <span className="mobile-section-title">
                  <DollarOutlined style={{ color: '#4f46e5' }} /> Price Range
                </span>
                {(filters.minPrice !== null || filters.maxPrice !== null) && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      onFilterChange?.({ ...filters, minPrice: null, maxPrice: null });
                    }}
                    style={{ padding: 0, fontSize: 12 }}
                  >
                    Reset
                  </Button>
                )}
              </div>

              <Slider
                range
                min={0}
                max={3000}
                step={50}
                value={[filters.minPrice ?? 0, filters.maxPrice ?? 3000]}
                onChange={(val) => {
                  onFilterChange?.({
                    ...filters,
                    minPrice: val[0] === 0 ? null : val[0],
                    maxPrice: val[1] === 3000 ? null : val[1],
                  });
                }}
                tooltip={{ formatter: (val) => `₹${val}` }}
              />

              <div className="price-input-row" style={{ marginBottom: 10 }}>
                <div className="price-input-box">
                  <span className="price-currency-symbol">₹</span>
                  <input
                    type="number"
                    placeholder="Min"
                    className="price-input-field"
                    value={filters.minPrice ?? ''}
                    onChange={(e) => updateFilter('minPrice', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>to</span>
                <div className="price-input-box">
                  <span className="price-currency-symbol">₹</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="price-input-field"
                    value={filters.maxPrice ?? ''}
                    onChange={(e) => updateFilter('maxPrice', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
              </div>

              <div className="presets-grid">
                {PRICE_PRESETS.map((pp) => (
                  <button
                    key={pp.label}
                    type="button"
                    className={`preset-chip ${
                      (filters.minPrice === pp.min || (pp.min === 0 && filters.minPrice === null)) &&
                      filters.maxPrice === pp.max
                        ? 'active'
                        : ''
                    }`}
                    onClick={() => {
                      onFilterChange?.({
                        ...filters,
                        minPrice: pp.min === 0 ? null : pp.min,
                        maxPrice: pp.max,
                      });
                    }}
                  >
                    {pp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Item / Listing Type (Items only) */}
          {searchMode === 'items' && (
            <div className="mobile-filter-section">
              <div className="mobile-section-header">
                <span className="mobile-section-title">
                  <ShopOutlined style={{ color: '#4f46e5' }} /> Item Domain
                </span>
              </div>

              <div className="presets-grid">
                {LISTING_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`preset-chip ${filters.listingType === opt.value ? 'active' : ''}`}
                    onClick={() => updateFilter('listingType', opt.value)}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 6: Rating */}
          <div className="mobile-filter-section">
            <div className="mobile-section-header">
              <span className="mobile-section-title">
                <StarFilled style={{ color: '#eab308' }} /> Customer Rating
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {RATING_PRESETS.map((rp) => (
                <button
                  key={rp.label}
                  type="button"
                  className={`preset-chip ${filters.minRating === rp.value ? 'active' : ''}`}
                  style={{ padding: '10px 8px', textAlign: 'center' }}
                  onClick={() => updateFilter('minRating', rp.value)}
                >
                  {rp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 7: Availability */}
          <div className="mobile-filter-section">
            <div className="mobile-section-header">
              <span className="mobile-section-title">
                <CheckCircleFilled style={{ color: '#22c55e' }} /> Instant Availability
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
              }}
              onClick={() => updateFilter('onlyAvailable', !filters.onlyAvailable)}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>Available Now</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Show open stores & available services</div>
              </div>
              <Switch
                checked={!!filters.onlyAvailable}
                onChange={(val) => updateFilter('onlyAvailable', val)}
              />
            </div>
          </div>
        </div>

        {/* Sticky Drawer Footer */}
        <div className="mobile-drawer-footer">
          <Button
            onClick={onResetFilters}
            style={{ borderRadius: 10, fontWeight: 600, height: 42, flex: 1 }}
          >
            Clear All
          </Button>

          <Button
            type="primary"
            onClick={() => setIsDrawerOpen(false)}
            style={{
              borderRadius: 10,
              fontWeight: 700,
              height: 42,
              flex: 2,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            }}
          >
            Apply Filters ({totalResults} results)
          </Button>
        </div>
      </Drawer>
    </div>
  );
};

SearchFilterBar.propTypes = {
  searchMode: PropTypes.oneOf(['items', 'shops']),
  filters: PropTypes.object,
  onFilterChange: PropTypes.func,
  onResetFilters: PropTypes.func,
  totalResults: PropTypes.number,
  rawCount: PropTypes.number,
  viewMode: PropTypes.oneOf(['grid', 'list']),
  onViewModeChange: PropTypes.func,
};

export default SearchFilterBar;

