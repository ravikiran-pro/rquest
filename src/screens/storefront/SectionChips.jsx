import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Drawer, Input } from 'antd';
import { SearchOutlined, UnorderedListOutlined } from '@ant-design/icons';
import './storefront.css';

const MAX_CHIPS = 12;

/**
 * Sticky bar with search and horizontally scrollable section chips (spec §F9).
 * The active chip follows the block in view; more than 12 sections adds an "All sections" sheet.
 */
const SectionChips = ({ sections, activeId, onJump, search, onSearch, placeholder, showChips }) => {
  const scrollerRef = useRef(null);
  const [listOpen, setListOpen] = useState(false);
  const shown = sections.slice(0, MAX_CHIPS);

  // Keep the active chip visible inside the scrolling row
  useEffect(() => {
    const row = scrollerRef.current;
    if (!row || activeId === null || activeId === undefined) return;
    const chip = row.querySelector(`[data-chip="${String(activeId)}"]`);
    if (chip && typeof chip.scrollIntoView === 'function') {
      const left = chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2;
      row.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
  }, [activeId]);

  return (
    <div className="sf-sticky">
      <Input
        allowClear
        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="sf-search"
        aria-label="Search this store"
        maxLength={100}
      />
      {showChips && sections.length > 1 && (
        <nav className="sf-chips" ref={scrollerRef} aria-label="Sections">
          {shown.map((s) => (
            <button
              key={s.id}
              type="button"
              data-chip={String(s.id)}
              className={`sf-chip ${String(activeId) === String(s.id) ? 'is-active' : ''}`}
              aria-current={String(activeId) === String(s.id) ? 'true' : undefined}
              onClick={() => onJump(s.id)}
            >
              {s.name}
              <span className="sf-chip-count">{s.count}</span>
            </button>
          ))}
          {sections.length > MAX_CHIPS && (
            <button type="button" className="sf-chip sf-chip--all" onClick={() => setListOpen(true)}>
              <UnorderedListOutlined aria-hidden="true" /> All sections
            </button>
          )}
        </nav>
      )}
      <Drawer open={listOpen} onClose={() => setListOpen(false)} placement="bottom" height="70%" title="All sections">
        <ul className="sf-section-list">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={String(activeId) === String(s.id) ? 'is-active' : ''}
                onClick={() => {
                  setListOpen(false);
                  onJump(s.id);
                }}
              >
                <span>{s.name}</span>
                <span className="sf-chip-count">{s.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </Drawer>
    </div>
  );
};

SectionChips.propTypes = {
  sections: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), name: PropTypes.string, count: PropTypes.number }))
    .isRequired,
  activeId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onJump: PropTypes.func.isRequired,
  search: PropTypes.string,
  onSearch: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  showChips: PropTypes.bool,
};

export default SectionChips;
