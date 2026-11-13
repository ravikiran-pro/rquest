import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';

const INITIAL_SHOPPERS = [
  {
    id: 'priya',
    name: 'Priya',
    distance: '0.4km',
    seeking: 'sourdough boules',
    color: '#7C3AED',
    initialX: 68,
    initialY: 18,
    vx: 0.18,
    vy: 0.12,
  },
  {
    id: 'arun',
    name: 'Arun',
    distance: '0.9km',
    seeking: 'wall anchors',
    color: '#0159C5',
    initialX: 14,
    initialY: 76,
    vx: -0.14,
    vy: 0.16,
  },
  {
    id: 'kavita',
    name: 'Kavita',
    distance: '1.2km',
    seeking: 'white lilies',
    color: '#EA580C',
    initialX: 82,
    initialY: 72,
    vx: 0.15,
    vy: -0.15,
  },
  {
    id: 'rahul',
    name: 'Rahul',
    distance: '0.6km',
    seeking: 'mustard oil',
    color: '#059669',
    initialX: 32,
    initialY: 26,
    vx: -0.12,
    vy: -0.18,
  },
];

/**
 * ShopperCursors
 * Ambient multiplayer cursor presence bringing the neighborhood to life,
 * mimicking real nearby residents exploring local shops with subtle physics.
 */
export const ShopperCursors = ({ containerRef }) => {
  const [shoppers, setShoppers] = useState(() =>
    INITIAL_SHOPPERS.map((s) => ({
      ...s,
      x: s.initialX,
      y: s.initialY,
      targetX: s.initialX,
      targetY: s.initialY,
    }))
  );

  const shoppersRef = useRef(shoppers);
  shoppersRef.current = shoppers;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let animId;
    let t = 0;

    const tick = () => {
      t += 0.02;

      setShoppers((prev) =>
        prev.map((s, idx) => {
          // Harmonic natural drifting motion
          const offsetX = Math.sin(t + idx * 1.5) * 6;
          const offsetY = Math.cos(t * 0.8 + idx * 2.1) * 5;

          const currentX = s.initialX + offsetX;
          const currentY = s.initialY + offsetY;

          return {
            ...s,
            x: currentX,
            y: currentY,
          };
        })
      );

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 5,
      }}
      aria-hidden="true"
    >
      {shoppers.map((shopper) => (
        <div
          key={shopper.id}
          className="shopper-cursor-tag"
          style={{
            left: `${shopper.x}%`,
            top: `${shopper.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Triangular pointer arrow */}
          <div
            className="shopper-cursor-pointer"
            style={{ borderBottomColor: shopper.color }}
          />

          {/* Shopper Avatar Initials */}
          <div
            className="shopper-avatar-dot"
            style={{ background: shopper.color }}
          >
            {shopper.name[0]}
          </div>

          {/* Name & Seeking Pill */}
          <span>
            {shopper.name}
            <span style={{ opacity: 0.65, fontWeight: 500, margin: '0 4px' }}>
              ({shopper.distance})
            </span>
            <span style={{ color: '#0159C5', fontWeight: 600 }}>
              · {shopper.seeking}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
};

ShopperCursors.propTypes = {
  containerRef: PropTypes.object,
};

export default ShopperCursors;
