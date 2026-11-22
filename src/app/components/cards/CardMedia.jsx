import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './card-media.css';

// Soft tints from the existing palette, each paired with a readable ink colour.
const TONES = [
  { bg: '#FBEDE6', ink: '#C2542B' },
  { bg: '#EAF0E7', ink: '#2F5D3C' },
  { bg: '#FBF3E2', ink: '#3F6212' },
  { bg: '#F7EDE4', ink: '#5B3A29' },
  { bg: '#FDE8E4', ink: '#9F1D1D' },
  { bg: '#E3F5EE', ink: '#065F46' },
];

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

// Up to two initials from the first words that contain letters or digits
const monogram = (label) => {
  const words = String(label || '')
    .trim()
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word));
  if (words.length === 0) return '•';
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
};

/**
 * Image with a designed fallback. When there is no src, or the image fails to
 * load, it shows a tinted monogram instead of a broken image and its alt text.
 */
const CardMedia = ({ src, alt, size = 'lg', className = '' }) => {
  const [failed, setFailed] = useState(false);

  // A new src gets a fresh attempt
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        className={`rq-card-media ${className}`.trim()}
        src={src}
        alt={alt || ''}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  const tone = TONES[hashString(String(alt || '')) % TONES.length];
  return (
    <div
      role="img"
      aria-label={alt || 'Image unavailable'}
      className={`rq-card-media rq-card-media-fallback rq-card-media-${size} ${className}`.trim()}
      style={{ background: tone.bg, color: tone.ink }}
    >
      <span aria-hidden="true">{monogram(alt)}</span>
    </div>
  );
};

CardMedia.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.oneOf(['lg', 'sm']),
  className: PropTypes.string,
};

export default CardMedia;
