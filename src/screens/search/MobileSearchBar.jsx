import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Popover, Spin } from 'antd';
import {
  AimOutlined,
  AppstoreOutlined,
  AudioOutlined,
  BarsOutlined,
  CameraOutlined,
  CloseOutlined,
  CompassOutlined,
  ControlOutlined,
  DownOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import './mobile-search.css';

export const RADIUS_PRESETS = [
  { label: '1 km walking', val: 1 },
  { label: '2 km neighborhood', val: 2 },
  { label: '5 km cycling', val: 5 },
  { label: '10 km citywide', val: 10 },
  { label: 'All distances', val: null },
];

/**
 * Phone header for the search page. One flat, full-width block: search field,
 * Stores / Items switch, a chip row for location, radius and filters, then the
 * result count with the view toggle. All state and rules stay in the screen;
 * this component only renders and reports events.
 */
const MobileSearchBar = ({
  searchText,
  onSearchTextChange,
  onSearchSubmit,
  isFocused,
  onFocus,
  onBlur,
  onCancel,
  searchMode,
  onModeChange,
  shopCount,
  itemCount,
  resultsLabel,
  areaName,
  onChangeLocation,
  onNearby,
  isDetecting,
  maxDistance,
  onRadiusChange,
  activeFiltersCount,
  onOpenFilters,
  viewMode,
  onViewModeChange,
  activeFilterTags,
  onClearAll,
  onVoice,
  onImage,
  onAi,
}) => {
  const [isRadiusOpen, setIsRadiusOpen] = useState(false);
  const showSmartTools = !isFocused && !searchText;
  const radiusLabel = maxDistance ? `${maxDistance} km` : 'Any distance';

  return (
    <div className="rq-m-search" role="search">
      {/* Search field: full width. Voice, photo and AI sit inside it when idle */}
      <div className="rq-m-search-row">
        <div className={`rq-m-field${isFocused ? ' is-focused' : ''}`}>
          <SearchOutlined className="rq-m-field-icon" aria-hidden="true" />
          <input
            type="search"
            className="rq-m-input"
            aria-label={searchMode === 'shops' ? 'Search stores' : 'Search items and services'}
            enterKeyHint="search"
            value={searchText}
            placeholder={searchMode === 'shops' ? 'Search stores' : 'Search items'}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={(e) => onSearchTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSearchSubmit();
                e.currentTarget.blur();
              }
              if (e.key === 'Escape') {
                onCancel();
                e.currentTarget.blur();
              }
            }}
          />
          {searchText && (
            <button
              type="button"
              className="rq-m-icon-btn"
              aria-label="Clear search"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSearchTextChange('')}
            >
              <CloseOutlined />
            </button>
          )}
          {showSmartTools && (
            <>
              <button type="button" className="rq-m-icon-btn" aria-label="Voice search" title="Voice search" onClick={onVoice}>
                <AudioOutlined />
              </button>
              <button type="button" className="rq-m-icon-btn" aria-label="Photo search" title="Photo search" onClick={onImage}>
                <CameraOutlined />
              </button>
              <button type="button" className="rq-m-icon-btn is-ai" aria-label="AI smart search" title="AI smart search" onClick={onAi}>
                <ControlOutlined />
              </button>
            </>
          )}
        </div>
        {isFocused && (
          <button
            type="button"
            className="rq-m-cancel"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Stores / Items as a segmented switch */}
      <div className="rq-m-tabs" role="tablist" aria-label="Results type">
        <button
          type="button"
          role="tab"
          aria-selected={searchMode === 'items'}
          className={`rq-m-tab${searchMode === 'items' ? ' is-active' : ''}`}
          onClick={() => onModeChange('items')}
        >
          Items
          <span className="rq-m-count">{itemCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={searchMode === 'shops'}
          className={`rq-m-tab${searchMode === 'shops' ? ' is-active' : ''}`}
          onClick={() => onModeChange('shops')}
        >
          Stores
          <span className="rq-m-count">{shopCount}</span>
        </button>
      </div>

      {/* Location, radius, filters and Nearby in one scrolling row */}
      <div className="rq-m-chips" role="toolbar" aria-label="Location and filters">
        <button type="button" className="rq-m-chip is-location" onClick={onChangeLocation}>
          <EnvironmentOutlined />
          <span className="rq-m-chip-text">{areaName}</span>
          <span className="rq-m-chip-link">Change</span>
        </button>

        <button
          type="button"
          className={`rq-m-chip${activeFiltersCount > 0 ? ' is-active' : ''}`}
          onClick={onOpenFilters}
        >
          <FilterOutlined />
          <span>Filters</span>
          {activeFiltersCount > 0 && <span className="rq-m-chip-count">{activeFiltersCount}</span>}
        </button>

        <Popover
          trigger="click"
          open={isRadiusOpen}
          onOpenChange={setIsRadiusOpen}
          placement="bottomLeft"
          content={
            <div className="rq-m-radius-menu">
              <div className="rq-m-radius-title">Search radius</div>
              {RADIUS_PRESETS.map((preset) => {
                const selected = (maxDistance ?? null) === preset.val;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={`rq-m-radius-option${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      onRadiusChange(preset.val);
                      setIsRadiusOpen(false);
                    }}
                  >
                    <span>{preset.label}</span>
                    {selected && <CompassOutlined />}
                  </button>
                );
              })}
            </div>
          }
        >
          <button type="button" className="rq-m-chip" aria-haspopup="dialog" aria-expanded={isRadiusOpen}>
            <CompassOutlined />
            <span>{radiusLabel}</span>
            <DownOutlined className="rq-m-chevron" />
          </button>
        </Popover>



        <button
          type="button"
          className="rq-m-chip is-icon"
          aria-label="Detect precise location"
          title="Detect precise location"
          disabled={isDetecting}
          onClick={onNearby}
        >
          {isDetecting ? <Spin size="small" /> : <AimOutlined />}
        </button>
      </div>

      {/* Result count and view toggle */}
      <div className="rq-m-meta">
        <span className="rq-m-result-count">{resultsLabel}</span>
        <div className="rq-m-view" role="group" aria-label="Result layout">
          <button
            type="button"
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
            onClick={() => onViewModeChange('grid')}
          >
            <AppstoreOutlined />
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
            onClick={() => onViewModeChange('list')}
          >
            <BarsOutlined />
          </button>
        </div>
      </div>

      {/* Applied filters, only when there are some */}
      {activeFilterTags.length > 0 && (
        <div className="rq-m-tags">
          {activeFilterTags.map((tag) => (
            <span key={tag.key} className="rq-m-tag">
              {tag.label}
              <button type="button" aria-label={`Remove ${tag.label}`} onClick={tag.onRemove}>
                <CloseOutlined />
              </button>
            </span>
          ))}
          <button type="button" className="rq-m-clear" onClick={onClearAll}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

MobileSearchBar.propTypes = {
  searchText: PropTypes.string.isRequired,
  onSearchTextChange: PropTypes.func.isRequired,
  onSearchSubmit: PropTypes.func.isRequired,
  isFocused: PropTypes.bool.isRequired,
  onFocus: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  searchMode: PropTypes.oneOf(['shops', 'items']).isRequired,
  onModeChange: PropTypes.func.isRequired,
  shopCount: PropTypes.number.isRequired,
  itemCount: PropTypes.number.isRequired,
  resultsLabel: PropTypes.string.isRequired,
  areaName: PropTypes.string.isRequired,
  onChangeLocation: PropTypes.func.isRequired,
  onNearby: PropTypes.func.isRequired,
  isDetecting: PropTypes.bool,
  maxDistance: PropTypes.number,
  onRadiusChange: PropTypes.func.isRequired,
  activeFiltersCount: PropTypes.number.isRequired,
  onOpenFilters: PropTypes.func.isRequired,
  viewMode: PropTypes.oneOf(['grid', 'list']).isRequired,
  onViewModeChange: PropTypes.func.isRequired,
  activeFilterTags: PropTypes.array.isRequired,
  onClearAll: PropTypes.func.isRequired,
  onVoice: PropTypes.func.isRequired,
  onImage: PropTypes.func.isRequired,
  onAi: PropTypes.func.isRequired,
};

export default MobileSearchBar;
