import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';

const ARTIFACTS = [
  {
    id: 'croissant',
    emoji: '🥐',
    label: 'Sunrise Breads · 0.4km',
    category: 'bakery',
    top: '12%',
    left: '2%',
    floatDelay: 0,
    parallaxSpeed: 0.04,
  },
  {
    id: 'key',
    emoji: '🗝️',
    label: 'FixIt Hardware · 1.2km',
    category: 'hardware',
    top: '78%',
    left: '4%',
    floatDelay: 1.2,
    parallaxSpeed: -0.03,
  },
  {
    id: 'leaf',
    emoji: '🪴',
    label: 'Petal Botanics · 1.6km',
    category: 'florist',
    top: '84%',
    right: '5%',
    floatDelay: 2.1,
    parallaxSpeed: 0.035,
  },
  {
    id: 'pharmacy',
    emoji: '💊',
    label: 'Care Pharmacy · 0.7km',
    category: 'pharmacy',
    top: '16%',
    right: '3%',
    floatDelay: 0.8,
    parallaxSpeed: -0.045,
  },
];

/**
 * FloatingArtifacts
 * Layered parallax floating 3D shop props that gently bob with natural physics
 * and react to mouse movement, creating tangible neighborhood depth.
 */
export const FloatingArtifacts = ({ onSelectCategory }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0, currentX: 0, currentY: 0 });
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const handleMouseMove = (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      mouseRef.current.x = (e.clientX - centerX) / centerX;
      mouseRef.current.y = (e.clientY - centerY) / centerY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Smooth lerp loop for buttery response
    const loop = () => {
      const { x, y, currentX, currentY } = mouseRef.current;
      mouseRef.current.currentX += (x - currentX) * 0.06;
      mouseRef.current.currentY += (y - currentY) * 0.06;

      setMousePos({
        x: mouseRef.current.currentX,
        y: mouseRef.current.currentY,
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 4,
      }}
      aria-hidden="true"
    >
      {ARTIFACTS.map((item) => {
        const transX = mousePos.x * item.parallaxSpeed * 280;
        const transY = mousePos.y * item.parallaxSpeed * 280;

        return (
          <div
            key={item.id}
            className="floating-artifact"
            onClick={() => onSelectCategory && onSelectCategory(item.category)}
            title={item.label}
            style={{
              top: item.top,
              left: item.left,
              right: item.right,
              transform: `translate3d(${transX}px, ${transY}px, 0)`,
            }}
          >
            <div className="floating-artifact-inner">
              <span>{item.emoji}</span>
              <span className="floating-artifact-label">{item.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

FloatingArtifacts.propTypes = {
  onSelectCategory: PropTypes.func,
};

export default FloatingArtifacts;
