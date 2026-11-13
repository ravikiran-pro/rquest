import React, { useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * TiltCard
 * High-performance 3D perspective tilt container with dynamic
 * specular lighting reflection that reacts to cursor position.
 */
export const TiltCard = ({
  children,
  className = '',
  maxTilt = 8,
  scale = 1.02,
  style = {},
}) => {
  const cardRef = useRef(null);

  const handleMouseMove = useCallback(
    (e) => {
      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(
        2
      )}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    },
    [maxTilt, scale]
  );

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;

    card.style.transform =
      'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
  }, []);

  const handleMouseEnter = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = 'transform 0.1s ease-out';
  }, []);

  return (
    <div className={`tilt-card-wrapper ${className}`} style={style}>
      <div
        ref={cardRef}
        className="tilt-card-inner"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      >
        <div className="tilt-card-sheen" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
};

TiltCard.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  maxTilt: PropTypes.number,
  scale: PropTypes.number,
  style: PropTypes.object,
};

export default TiltCard;
