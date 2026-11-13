import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * CategoryStall
 * Tactile neighborhood marketplace stall card with interactive micro-animations.
 */
export const CategoryStall = ({
  title,
  count,
  icon,
  iconBg,
  iconColor,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="category-stall-card"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
    >
      {/* Icon Badge with Dynamic Micro-Animation */}
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: iconBg || '#F1EDE8',
          margin: '0 auto 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isHovered ? 'scale(1.15) rotate(6deg)' : 'scale(1) rotate(0deg)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: isHovered
            ? `0 10px 20px -4px ${iconColor || '#0B2D6B'}40`
            : 'none',
        }}
      >
        <span style={{ display: 'inline-flex', fontSize: 26, color: iconColor }}>
          {icon}
        </span>
      </div>

      {/* Category Name */}
      <h3
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: '#110E28',
          margin: '0 0 6px',
          letterSpacing: '-0.01em',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {title}
      </h3>

      {/* Count Chip */}
      <span
        style={{
          display: 'inline-block',
          fontSize: 12,
          fontWeight: 600,
          color: '#64748B',
          background: '#F8F4EF',
          padding: '2px 9px',
          borderRadius: 9999,
          border: '1px solid #ECE7DF',
        }}
      >
        {count}
      </span>
    </div>
  );
};

CategoryStall.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  iconBg: PropTypes.string,
  iconColor: PropTypes.string,
  onClick: PropTypes.func,
};

export default CategoryStall;
