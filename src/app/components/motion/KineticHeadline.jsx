import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const PHRASES = [
  'open right now.',
  'freshly baked.',
  'in stock nearby.',
  'delivered in 15m.',
];

/**
 * KineticHeadline
 * An art-directed living headline with dynamic typing/morphing copy,
 * electric lime highlighter stroke, and pulsing purple spark bursts.
 */
export const KineticHeadline = ({ isMobile = false }) => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const typingSpeedRef = useRef(75);

  useEffect(() => {
    // Check prefers-reduced-motion
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplayText(PHRASES[0]);
      return;
    }

    const currentPhrase = PHRASES[phraseIndex];

    const handleTyping = () => {
      if (!isDeleting) {
        // Typing forward
        setDisplayText(currentPhrase.substring(0, displayText.length + 1));
        typingSpeedRef.current = 65 + Math.random() * 30; // Natural organic cadence

        if (displayText.length === currentPhrase.length) {
          // Pause at full word before deleting
          typingSpeedRef.current = 2400;
          setIsDeleting(true);
        }
      } else {
        // Deleting backward
        setDisplayText(currentPhrase.substring(0, displayText.length - 1));
        typingSpeedRef.current = 35;

        if (displayText.length === 0) {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
          typingSpeedRef.current = 400; // Brief pause before starting next phrase
        }
      }
    };

    const timer = setTimeout(handleTyping, typingSpeedRef.current);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex]);

  return (
    <h1
      style={{
        fontSize: isMobile ? 36 : 56,
        fontWeight: 800,
        color: '#110E28',
        lineHeight: 1.14,
        letterSpacing: '-0.035em',
        margin: '0 0 18px',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      Shops near you,
      <br />
      <span className="kinetic-highlight-lime">
        {displayText || PHRASES[0]}
      </span>
      <span className="kinetic-cursor" aria-hidden="true" />
      {/* 3 Radiating Hand-Drawn Purple Spark Strokes with Gentle Pulse */}
      <span
        className="hero-spark-container"
        style={{
          position: 'relative',
          top: isMobile ? -2 : -6,
          marginLeft: 10,
          display: 'inline-block',
        }}
        aria-hidden="true"
      >
        <svg
          width={isMobile ? 34 : 44}
          height={isMobile ? 30 : 38}
          viewBox="0 0 46 40"
          fill="none"
        >
          <path
            className="spark-line-1"
            d="M4 36 L15 10"
            stroke="#7C3AED"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            className="spark-line-2"
            d="M17 37 L36 21"
            stroke="#7C3AED"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            className="spark-line-3"
            d="M23 38 L42 33"
            stroke="#7C3AED"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </h1>
  );
};

KineticHeadline.propTypes = {
  isMobile: PropTypes.bool,
};

export default KineticHeadline;
