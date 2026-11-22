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
          width: 'clamp(44px, 12vw, 58px)',
          height: 'clamp(44px, 12vw, 58px)',
          borderRadius: '50%',
          background: iconBg || '#F1EDE8',
          margin: '0 auto clamp(8px, 2.5vw, 14px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isHovered ? 'scale(1.15) rotate(6deg)' : 'scale(1) rotate(0deg)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: isHovered
            ? `0 10px 20px -4px ${iconColor || '#A8451F'}40`
            : 'none',
          flexShrink: 0,
        }}
      >
        <span style={{ display: 'inline-flex', fontSize: 'clamp(20px, 5.5vw, 26px)', color: iconColor }}>
          {icon}
        </span>
      </div>

      {/* Category Name */}
      <h3
        style={{
          fontSize: 'clamp(12.5px, 3.6vw, 15px)',
          fontWeight: 700,
          color: '#110E28',
          margin: '0 0 6px',
          letterSpacing: '-0.01em',
          fontFamily: "'Fraunces', -apple-system, BlinkMacSystemFont, sans-serif",
          lineHeight: 1.25,
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}
      >
        {title}
      </h3>

      {/* Count Chip */}
      <div>
        <span
          style={{
            display: 'inline-block',
            fontSize: 'clamp(10.5px, 3vw, 12px)',
            fontWeight: 600,
            color: '#64748B',
            background: '#FAF7F2',
            padding: '2px 8px',
            borderRadius: 9999,
            border: '1px solid #ECE7DF',
            whiteSpace: 'nowrap',
          }}
        >
          {count}
        </span>
      </div>
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
