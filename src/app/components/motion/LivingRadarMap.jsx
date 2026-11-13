import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { StarFilled, ArrowRightOutlined, ThunderboltFilled } from '@ant-design/icons';

const PINS = [
  {
    id: 'sunrise-bakehouse',
    name: 'Sunrise',
    fullName: 'Sunrise Bakehouse',
    category: 'Bakery',
    distance: '0.4 km',
    rating: 4.8,
    reviews: 184,
    x: 68,
    y: 20,
    accent: '#D2F82E',
  },
  {
    id: 'fixit-hardware',
    name: 'FixIt',
    fullName: 'FixIt Hardware & Tools',
    category: 'Hardware',
    distance: '1.2 km',
    rating: 4.9,
    reviews: 96,
    x: 88,
    y: 8,
    accent: '#0159C5',
  },
  {
    id: 'petal-stem-botanics',
    name: 'Petal',
    fullName: 'Petal & Stem Botanics',
    category: 'Florist',
    distance: '1.6 km',
    rating: 4.7,
    reviews: 78,
    x: 67,
    y: 69,
    accent: '#FF6B4A',
  },
  {
    id: 'green-basket-kirana',
    name: 'Kirana',
    fullName: 'Green Basket Kirana',
    category: 'Grocery',
    distance: '0.9 km',
    rating: 4.6,
    reviews: 312,
    x: 85,
    y: 38,
    accent: '#059669',
  },
];

/**
 * LivingRadarMap
 * Animated neighborhood radar canvas with rotating scan beam,
 * pulsing distance rings, levitating merchant pins, and interactive spotlight card.
 */
export const LivingRadarMap = ({ onSelectShop }) => {
  const [activePin, setActivePin] = useState(PINS[0]);
  const [rotationDeg, setRotationDeg] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let deg = 0;
    const animateSweep = () => {
      deg = (deg + 0.75) % 360;
      setRotationDeg(deg);
      animRef.current = requestAnimationFrame(animateSweep);
    };

    animRef.current = requestAnimationFrame(animateSweep);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div
      className="hero-map-card-wrapper"
      style={{
        position: 'relative',
        borderRadius: 28,
        border: '1px solid #ECE7DF',
        background: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: '0 24px 50px -12px rgba(17, 14, 40, 0.12)',
      }}
    >
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        {/* Base Map Graphic */}
        <img
          src="/images/home_map_hero.png"
          alt="Neighborhood Commerce Map"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            userSelect: 'none',
          }}
        />

        {/* Dynamic Sweeping Radar Beam centered on User coordinates */}
        <div
          className="radar-sweep-beam-active"
          style={{
            top: '47.6%',
            left: '45.5%',
            transform: `rotate(${rotationDeg}deg)`,
          }}
          aria-hidden="true"
        />

        {/* Concentric Pulsing Distance Rings */}
        <div
          className="radar-ring"
          style={{ top: '47.6%', left: '45.5%', width: 130, height: 130 }}
        />
        <div
          className="radar-ring"
          style={{ top: '47.6%', left: '45.5%', width: 240, height: 240 }}
        />
        <div className="radar-ring-pulse" style={{ top: '47.6%', left: '45.5%' }} />

        {/* Center User Beacon */}
        <div
          style={{
            position: 'absolute',
            top: '47.6%',
            left: '45.5%',
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#0159C5',
              border: '3px solid #FFFFFF',
              boxShadow: '0 0 12px rgba(1, 89, 197, 0.8)',
            }}
          />
        </div>

        {/* Interactive Levitating Merchant Pins */}
        {PINS.map((pin) => {
          const isSelected = activePin?.id === pin.id;
          return (
            <div
              key={pin.id}
              className="radar-merchant-pin"
              style={{
                top: `${pin.y}%`,
                left: `${pin.x}%`,
              }}
              onClick={() => {
                setActivePin(pin);
                if (onSelectShop) onSelectShop(pin.id);
              }}
            >
              <div
                className="radar-pin-pill"
                style={{
                  background: isSelected ? '#110E28' : 'rgba(17, 14, 40, 0.92)',
                  borderColor: isSelected ? '#D2F82E' : 'rgba(255, 255, 255, 0.4)',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: pin.accent,
                    display: 'inline-block',
                  }}
                />
                <span>{pin.name}</span>
              </div>
              <div className="radar-pin-pointer" />
            </div>
          );
        })}

        {/* Top-Right: Floating 15-min delivery speed pill */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: 16,
            padding: '8px 14px',
            border: '1px solid rgba(235, 231, 224, 0.8)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: '#D2F82E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#110E28',
              fontSize: 16,
            }}
          >
            <ThunderboltFilled />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#110E28', lineHeight: 1.2 }}>
              15 min
            </div>
            <div style={{ fontSize: 10.5, color: '#64748B', fontWeight: 600 }}>
              avg delivery nearby
            </div>
          </div>
        </div>

        {/* Bottom Spotlight Mini Card */}
        {activePin && (
          <div
            onClick={() => onSelectShop && onSelectShop(activePin.id)}
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              right: 12,
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(235, 231, 224, 0.9)',
              borderRadius: 18,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 24px rgba(17, 14, 40, 0.12)',
              cursor: 'pointer',
              zIndex: 9,
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#F1EDE8',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <img
                  src={
                    activePin.id === 'sunrise-bakehouse'
                      ? '/images/shop-sunrise-bakehouse.png'
                      : activePin.id === 'fixit-hardware'
                      ? '/images/shop-fixit-hardware.png'
                      : activePin.id === 'petal-stem-botanics'
                      ? '/images/shop-petal-stem.png'
                      : '/images/shop-green-basket.png'
                  }
                  alt={activePin.fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#110E28' }}>
                    {activePin.fullName}
                  </span>
                  <span style={{ color: '#0159C5', fontSize: 12 }}>✓</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span>{activePin.distance} · {activePin.category}</span>
                  <span>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, color: '#110E28' }}>
                    <StarFilled style={{ color: '#F59E0B', fontSize: 10 }} /> {activePin.rating}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#110E28',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ArrowRightOutlined />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

LivingRadarMap.propTypes = {
  onSelectShop: PropTypes.func,
};

export default LivingRadarMap;
