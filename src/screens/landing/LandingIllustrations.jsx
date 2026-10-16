import React from 'react';
import PropTypes from 'prop-types';

/**
 * Modern SVG Illustrations & Corner Overlays for Rquest Hyperlocal Marketplace
 * Crafted with pure inline SVGs, responsive viewBoxes, CSS animations, and vibrant palettes.
 */

// 1. Hero Standalone Illustration: Vibrant Neighborhood Direct Commerce Scene
export function HeroStreetIllustration({ className = '', style = {} }) {
  return (
    <div className={`illustration-hero-street ${className}`} style={{ width: '100%', maxWidth: 640, margin: '0 auto', ...style }}>
      <svg
        viewBox="0 0 680 460"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="hero-street-svg"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="skyGrad" x1="340" y1="0" x2="340" y2="400" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f0fdf4" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#ecfdf5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="storeRoofGrad" x1="120" y1="110" x2="440" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          <linearGradient id="storeWallGrad" x1="140" y1="150" x2="420" y2="380" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>

          <linearGradient id="roadGrad" x1="0" y1="390" x2="680" y2="450" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          <linearGradient id="emeraldPillGrad" x1="0" y1="0" x2="160" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          <linearGradient id="bluePillGrad" x1="0" y1="0" x2="160" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          <linearGradient id="scooterGrad" x1="480" y1="310" x2="630" y2="390" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="cardShadow" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0f172a" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Ambient Sky Glow */}
        <rect x="0" y="0" width="680" height="420" rx="24" fill="url(#skyGrad)" />

        {/* Subtle Architectural Blueprint Grid in Background */}
        <g stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="3 4" opacity="0.45">
          <line x1="60" y1="80" x2="620" y2="80" />
          <line x1="60" y1="160" x2="620" y2="160" />
          <line x1="60" y1="240" x2="620" y2="240" />
          <line x1="60" y1="320" x2="620" y2="320" />
          <line x1="120" y1="40" x2="120" y2="380" />
          <line x1="260" y1="40" x2="260" y2="380" />
          <line x1="420" y1="40" x2="420" y2="380" />
          <line x1="560" y1="40" x2="560" y2="380" />
        </g>

        {/* Distant Trees & Neighborhood Skyline */}
        <g opacity="0.6">
          <circle cx="80" cy="270" r="32" fill="#d1fae5" />
          <circle cx="104" cy="285" r="26" fill="#a7f3d0" />
          <rect x="90" y="295" width="8" height="35" rx="3" fill="#64748b" />

          <rect x="30" y="210" width="45" height="115" rx="6" fill="#e2e8f0" opacity="0.7" />
          <rect x="38" y="222" width="10" height="14" rx="2" fill="#cbd5e1" />
          <rect x="54" y="222" width="10" height="14" rx="2" fill="#cbd5e1" />
          <rect x="38" y="246" width="10" height="14" rx="2" fill="#cbd5e1" />
          <rect x="54" y="246" width="10" height="14" rx="2" fill="#cbd5e1" />

          {/* Background Right Building */}
          <rect x="450" y="190" width="70" height="140" rx="8" fill="#e2e8f0" opacity="0.7" />
          <rect x="464" y="206" width="14" height="18" rx="3" fill="#cbd5e1" />
          <rect x="492" y="206" width="14" height="18" rx="3" fill="#cbd5e1" />
          <rect x="464" y="238" width="14" height="18" rx="3" fill="#cbd5e1" />
          <rect x="492" y="238" width="14" height="18" rx="3" fill="#cbd5e1" />
        </g>

        {/* Main Physical Kirana & Mart Building */}
        <g id="physical-store" filter="url(#cardShadow)">
          {/* Main Wall */}
          <rect x="130" y="145" width="310" height="235" rx="16" fill="url(#storeWallGrad)" stroke="#e2e8f0" strokeWidth="2" />

          {/* Upper Signboard Band */}
          <rect x="145" y="160" width="280" height="36" rx="8" fill="#0f172a" />
          <circle cx="165" cy="178" r="6" fill="#10b981" />
          <text x="180" y="182" fill="#f8fafc" fontSize="13" fontWeight="800" fontFamily="system-ui, sans-serif" letterSpacing="0.5">
            SRI KRISHNA MART &amp; PROVISIONS
          </text>
          <rect x="382" y="169" width="34" height="18" rx="4" fill="#059669" />
          <text x="388" y="182" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="system-ui, sans-serif">
            OPEN
          </text>

          {/* Striped Canopy / Awning */}
          <path
            d="M 115 145 L 455 145 L 445 120 L 125 120 Z"
            fill="url(#storeRoofGrad)"
          />
          {/* Canopy stripes */}
          <g fill="#ffffff" opacity="0.25">
            <polygon points="150,120 180,120 170,145 140,145" />
            <polygon points="210,120 240,120 230,145 200,145" />
            <polygon points="270,120 300,120 290,145 260,145" />
            <polygon points="330,120 360,120 350,145 320,145" />
            <polygon points="390,120 420,120 410,145 380,145" />
          </g>

          {/* Scalloped Awning Fringe */}
          <path
            d="M 115 145 Q 125 155 135 145 Q 145 155 155 145 Q 165 155 175 145 Q 185 155 195 145 Q 205 155 215 145 Q 225 155 235 145 Q 245 155 255 145 Q 265 155 275 145 Q 285 155 295 145 Q 305 155 315 145 Q 325 155 335 145 Q 345 155 355 145 Q 365 155 375 145 Q 385 155 395 145 Q 405 155 415 145 Q 425 155 435 145 Q 445 155 455 145"
            fill="#047857"
          />

          {/* Large Shop Glass Window Left */}
          <rect x="150" y="210" width="130" height="110" rx="8" fill="#e0f2fe" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.9" />
          <line x1="215" y1="210" x2="215" y2="320" stroke="#bae6fd" strokeWidth="2" />
          <line x1="150" y1="265" x2="280" y2="265" stroke="#bae6fd" strokeWidth="2" />

          {/* Shelf Items inside window */}
          <g>
            {/* Shelf A */}
            <rect x="158" y="245" width="50" height="4" fill="#94a3b8" />
            <rect x="162" y="228" width="10" height="17" rx="2" fill="#ef4444" />
            <rect x="175" y="225" width="12" height="20" rx="2" fill="#3b82f6" />
            <rect x="190" y="230" width="14" height="15" rx="3" fill="#10b981" />

            {/* Shelf B */}
            <rect x="158" y="300" width="50" height="4" fill="#94a3b8" />
            <circle cx="168" cy="292" r="7" fill="#f59e0b" />
            <circle cx="184" cy="292" r="7" fill="#10b981" />
            <circle cx="200" cy="292" r="7" fill="#ec4899" />

            {/* Window Right Side Jars */}
            <rect x="225" y="245" width="46" height="4" fill="#94a3b8" />
            <rect x="230" y="226" width="15" height="19" rx="3" fill="#f59e0b" />
            <rect x="249" y="222" width="16" height="23" rx="3" fill="#6366f1" />
          </g>

          {/* Glass Glare Reflections */}
          <polygon points="155,215 190,215 160,315 155,315" fill="#ffffff" opacity="0.4" />
          <polygon points="205,215 220,215 180,315 165,315" fill="#ffffff" opacity="0.25" />

          {/* Open Store Entrance Door Right */}
          <rect x="295" y="210" width="125" height="170" rx="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />

          {/* Wooden Counter Desk */}
          <rect x="290" y="290" width="135" height="90" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="300" y="305" width="115" height="12" rx="3" fill="#cbd5e1" />
          <rect x="300" y="330" width="115" height="12" rx="3" fill="#cbd5e1" />

          {/* Physical UPI QR Stand on Counter (Hero Detail) */}
          <g transform="translate(305, 260)">
            {/* Stand Base */}
            <rect x="2" y="24" width="26" height="5" rx="2" fill="#0f172a" />
            <rect x="6" y="2" width="18" height="23" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
            {/* QR Pattern Mini Grid */}
            <rect x="9" y="5" width="4" height="4" fill="#059669" />
            <rect x="17" y="5" width="4" height="4" fill="#059669" />
            <rect x="9" y="13" width="4" height="4" fill="#059669" />
            <rect x="15" y="13" width="6" height="6" fill="#0f172a" />
            {/* UPI Soundbox mini badge */}
            <circle cx="28" cy="14" r="5" fill="#3b82f6" />
            <path d="M 26 14 L 30 14" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* Storekeeper Murugan Figure behind counter */}
          <g id="merchant-figure">
            {/* Body / Shirt */}
            <path d="M 350 250 Q 365 240 380 250 L 388 290 L 342 290 Z" fill="#059669" />
            {/* Head */}
            <circle cx="365" cy="232" r="13" fill="#fcd34d" />
            {/* Hair */}
            <path d="M 352 230 C 352 220 378 220 378 230 C 375 224 355 224 352 230 Z" fill="#1e293b" />
            {/* Friendly Glasses */}
            <circle cx="361" cy="232" r="3" fill="none" stroke="#0f172a" strokeWidth="1" />
            <circle cx="369" cy="232" r="3" fill="none" stroke="#0f172a" strokeWidth="1" />
            <line x1="364" y1="232" x2="366" y2="232" stroke="#0f172a" strokeWidth="1" />
            {/* Friendly Smile */}
            <path d="M 362 238 Q 365 241 368 238" stroke="#78350f" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            {/* Waving Hand holding tablet */}
            <rect x="382" y="260" width="16" height="22" rx="3" fill="#0f172a" stroke="#ffffff" strokeWidth="1" />
            <circle cx="390" cy="271" r="2.5" fill="#10b981" />
          </g>

          {/* Fresh Vegetables / Fruit Crates outside store */}
          <g transform="translate(140, 340)">
            {/* Wooden Crate A */}
            <rect x="0" y="8" width="48" height="26" rx="4" fill="#b45309" stroke="#78350f" strokeWidth="1" />
            <line x1="0" y1="17" x2="48" y2="17" stroke="#78350f" strokeWidth="1" />
            {/* Red Apples */}
            <circle cx="10" cy="6" r="6" fill="#dc2626" />
            <circle cx="22" cy="6" r="6" fill="#ef4444" />
            <circle cx="34" cy="6" r="6" fill="#b91c1c" />
            <circle cx="16" cy="2" r="5" fill="#ef4444" />
            <circle cx="28" cy="2" r="5" fill="#dc2626" />

            {/* Wooden Crate B */}
            <rect x="54" y="8" width="48" height="26" rx="4" fill="#d97706" stroke="#92400e" strokeWidth="1" />
            <line x1="54" y1="17" x2="102" y2="17" stroke="#92400e" strokeWidth="1" />
            {/* Green Veggies */}
            <ellipse cx="66" cy="5" rx="7" ry="5" fill="#16a34a" />
            <ellipse cx="78" cy="5" rx="7" ry="5" fill="#15803d" />
            <ellipse cx="90" cy="5" rx="7" ry="5" fill="#22c55e" />
          </g>
        </g>

        {/* Customer / Neighbor Priya standing near counter */}
        <g id="customer-figure" transform="translate(250, 245)">
          {/* Head */}
          <circle cx="22" cy="16" r="11" fill="#fcd34d" />
          {/* Hair ponytail */}
          <path d="M 12 16 C 12 7 32 7 32 16 C 30 10 14 10 12 16 Z" fill="#0f172a" />
          <path d="M 11 16 Q 6 22 8 28" stroke="#0f172a" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Jacket / Top */}
          <path d="M 12 28 Q 22 24 32 28 L 36 78 L 8 78 Z" fill="#6366f1" />
          {/* Jeans */}
          <rect x="10" y="78" width="10" height="55" rx="4" fill="#1e293b" />
          <rect x="24" y="78" width="10" height="55" rx="4" fill="#1e293b" />
          {/* Shoes */}
          <rect x="8" y="130" width="14" height="7" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="24" y="130" width="14" height="7" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
          {/* Tote Bag with Fresh Baguette / Greens */}
          <rect x="-2" y="52" width="16" height="24" rx="4" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
          <path d="M 2 52 Q 6 42 10 52" stroke="#b45309" strokeWidth="2" fill="none" />
          {/* Bread sticking out */}
          <line x1="6" y1="52" x2="3" y2="38" stroke="#d97706" strokeWidth="4" strokeLinecap="round" />
          {/* Phone in hand with checkmark */}
          <rect x="28" y="46" width="12" height="18" rx="3" fill="#090d16" stroke="#ffffff" strokeWidth="1" />
          <circle cx="34" cy="54" r="3" fill="#10b981" />
        </g>

        {/* Clean Street & Pavement */}
        <path d="M 0 395 L 680 395 L 680 460 L 0 460 Z" fill="url(#roadGrad)" />
        {/* Curbside granite line */}
        <line x1="0" y1="395" x2="680" y2="395" stroke="#94a3b8" strokeWidth="3" />
        {/* Street dashed white center line */}
        <line x1="20" y1="432" x2="660" y2="432" stroke="#ffffff" strokeWidth="3" strokeDasharray="24 16" opacity="0.8" />

        {/* Neighborhood Eco Scooter Runner Dispatched */}
        <g id="delivery-runner" filter="url(#cardShadow)" transform="translate(470, 275)">
          {/* Movement Speed Trails */}
          <line x1="-30" y1="100" x2="-8" y2="100" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <line x1="-45" y1="112" x2="-14" y2="112" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          <line x1="-25" y1="124" x2="-4" y2="124" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

          {/* Electric Scooter Chassis */}
          <g>
            {/* Back Wheel */}
            <circle cx="20" cy="120" r="18" fill="#1e293b" />
            <circle cx="20" cy="120" r="9" fill="#94a3b8" stroke="#ffffff" strokeWidth="2" />
            {/* Front Wheel */}
            <circle cx="115" cy="120" r="18" fill="#1e293b" />
            <circle cx="115" cy="120" r="9" fill="#94a3b8" stroke="#ffffff" strokeWidth="2" />
            {/* Frame Deck */}
            <path d="M 22 120 L 75 122 L 105 85 L 115 120" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Handlebar Stem */}
            <line x1="105" y1="85" x2="98" y2="40" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
            <line x1="90" y1="40" x2="108" y2="40" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
            {/* Headlight Beam */}
            <polygon points="108,44 165,30 165,70 108,50" fill="#fef08a" opacity="0.3" />
          </g>

          {/* Thermal Delivery Box (Rquest Branded) */}
          <rect x="-8" y="55" width="44" height="42" rx="7" fill="#0f172a" stroke="#2563eb" strokeWidth="2" />
          <rect x="-2" y="65" width="32" height="18" rx="4" fill="#2563eb" />
          <text x="3" y="78" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="system-ui, sans-serif">
            RQUEST
          </text>
          {/* Status Indicator on box */}
          <circle cx="30" cy="62" r="3" fill="#10b981" />

          {/* Runner Ravi Figure */}
          <g>
            {/* Legs */}
            <path d="M 45 70 L 62 100 L 72 118" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Torso & Jacket */}
            <path d="M 38 45 L 68 45 L 62 82 L 32 82 Z" fill="#2563eb" />
            {/* Arm reaching to handlebar */}
            <path d="M 55 52 L 85 50 L 98 42" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Helmet & Head */}
            <circle cx="54" cy="26" r="14" fill="#0f172a" />
            <path d="M 46 24 Q 54 10 66 22 L 66 30 Q 54 36 46 24 Z" fill="#10b981" />
            {/* Visor */}
            <path d="M 60 25 L 67 25" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* Floating Pill: ETA 4m / 180m away */}
          <g transform="translate(18, -12)" filter="url(#cardShadow)">
            <rect x="0" y="0" width="108" height="28" rx="14" fill="#090d16" stroke="#3b82f6" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="4" fill="#10b981" />
            <text x="24" y="18" fill="#ffffff" fontSize="10.5" fontWeight="800" fontFamily="system-ui, sans-serif">
              Runner • ETA 4m
            </text>
          </g>
        </g>

        {/* ------------------------------------------------------------------
            Dynamic Standalone Floating Badges / SVG Overlay Elements
            ------------------------------------------------------------------ */}
        
        {/* Floating Badge Left: 0% Commission Guarantee */}
        <g className="floating-badge-svg" transform="translate(24, 75)" filter="url(#cardShadow)">
          <rect x="0" y="0" width="170" height="50" rx="14" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
          <circle cx="24" cy="25" r="14" fill="#d1fae5" />
          <text x="17" y="30" fontSize="15">🏷️</text>
          <text x="46" y="21" fill="#0f172a" fontSize="12" fontWeight="800" fontFamily="system-ui, sans-serif">
            0% Commission
          </text>
          <text x="46" y="36" fill="#059669" fontSize="10" fontWeight="700" fontFamily="system-ui, sans-serif">
            100% Shelf MRP Lock
          </text>
        </g>

        {/* Floating Badge Center Top: 2-Step Handshake PIN */}
        <g className="floating-badge-svg" transform="translate(260, 24)" filter="url(#cardShadow)">
          <rect x="0" y="0" width="180" height="48" rx="14" fill="#090d16" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="22" cy="24" r="12" fill="#1e293b" />
          <text x="14" y="30" fontSize="14">🔒</text>
          <text x="42" y="20" fill="#94a3b8" fontSize="10.5" fontWeight="700" fontFamily="system-ui, sans-serif">
            MUTUAL COUNTER PIN
          </text>
          <text x="42" y="36" fill="#34d399" fontSize="13" fontWeight="900" fontFamily="monospace" letterSpacing="2">
            PIN: 4812 ✓
          </text>
        </g>

        {/* Floating Badge Right Top: Direct UPI Settlement */}
        <g className="floating-badge-svg" transform="translate(485, 95)" filter="url(#cardShadow)">
          <rect x="0" y="0" width="170" height="48" rx="14" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.5" />
          <circle cx="22" cy="24" r="12" fill="#dbeafe" />
          <text x="15" y="29" fontSize="13">⚡</text>
          <text x="42" y="20" fill="#0f172a" fontSize="11.5" fontWeight="800" fontFamily="system-ui, sans-serif">
            Direct UPI QR
          </text>
          <text x="42" y="35" fill="#2563eb" fontSize="10" fontWeight="700" fontFamily="system-ui, sans-serif">
            Zero Platform Escrow
          </text>
        </g>

        {/* GPS Radar Target Ring on Top of Store */}
        <g transform="translate(285, 105)" opacity="0.85">
          <circle cx="0" cy="0" r="16" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="0" cy="0" r="8" fill="#10b981" fillOpacity="0.2" stroke="#059669" strokeWidth="2" />
          <circle cx="0" cy="0" r="3" fill="#059669" />
        </g>
      </svg>
    </div>
  );
}

// 2. Standalone Illustration: 2-Step Mutual Stock Confirmation & PIN Handshake
export function HandshakePinIllustration({ className = '', style = {} }) {
  return (
    <div className={`illustration-handshake ${className}`} style={{ width: '100%', maxWidth: 440, margin: '0 auto', ...style }}>
      <svg
        viewBox="0 0 440 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="shieldGrad" x1="220" y1="20" x2="220" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="shieldShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#059669" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Subtle Background Circuit Mesh */}
        <circle cx="220" cy="120" r="95" fill="#f0fdf4" opacity="0.7" />
        <circle cx="220" cy="120" r="75" stroke="#bbf7d0" strokeWidth="1.5" strokeDasharray="4 4" />

        {/* Customer Phone Left */}
        <g transform="translate(50, 45)">
          <rect x="0" y="0" width="105" height="170" rx="16" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" filter="drop-shadow(0 8px 16px rgba(15,23,42,0.06))" />
          <rect x="8" y="14" width="89" height="142" rx="8" fill="#f8fafc" />
          {/* Header */}
          <rect x="14" y="22" width="50" height="8" rx="4" fill="#0f172a" />
          <circle cx="85" cy="26" r="4" fill="#10b981" />
          {/* Order Details */}
          <rect x="14" y="40" width="77" height="32" rx="6" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
          <text x="20" y="54" fill="#065f46" fontSize="9" fontWeight="800" fontFamily="system-ui">Atta 5kg • ₹190</text>
          <text x="20" y="66" fill="#059669" fontSize="8" fontWeight="700" fontFamily="system-ui">✓ Shelf Confirmed</text>
          {/* PIN Lock UI */}
          <rect x="14" y="85" width="77" height="42" rx="6" fill="#090d16" />
          <text x="22" y="100" fill="#94a3b8" fontSize="8" fontWeight="700" fontFamily="system-ui">COUNTER PIN</text>
          <text x="22" y="118" fill="#34d399" fontSize="13" fontWeight="900" fontFamily="monospace" letterSpacing="1.5">4 8 1 2</text>
          {/* Home indicator */}
          <rect x="40" y="148" width="25" height="3" rx="1.5" fill="#cbd5e1" />
        </g>

        {/* Merchant Terminal Right */}
        <g transform="translate(285, 45)">
          <rect x="0" y="0" width="105" height="170" rx="16" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" filter="drop-shadow(0 8px 16px rgba(15,23,42,0.06))" />
          <rect x="8" y="14" width="89" height="142" rx="8" fill="#f8fafc" />
          {/* Header */}
          <rect x="14" y="22" width="60" height="8" rx="4" fill="#059669" />
          {/* Merchant Verify Request */}
          <rect x="14" y="40" width="77" height="32" rx="6" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
          <text x="20" y="54" fill="#1e40af" fontSize="9" fontWeight="800" fontFamily="system-ui">Priya S. • 240m</text>
          <text x="20" y="66" fill="#2563eb" fontSize="8" fontWeight="700" fontFamily="system-ui">Tap &quot;In Stock&quot; ✓</text>
          {/* UPI Soundbox Chime Box */}
          <rect x="14" y="85" width="77" height="42" rx="6" fill="#059669" />
          <text x="20" y="100" fill="#d1fae5" fontSize="8" fontWeight="700" fontFamily="system-ui">UPI SOUNDBOX</text>
          <text x="20" y="118" fill="#ffffff" fontSize="12" fontWeight="900" fontFamily="system-ui">₹240 REC&apos;D</text>
          {/* Home indicator */}
          <rect x="40" y="148" width="25" height="3" rx="1.5" fill="#cbd5e1" />
        </g>

        {/* Connecting Digital Verification Handshake Arc */}
        <path
          d="M 155 115 C 185 85 255 85 285 115"
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeDasharray="5 4"
        />

        {/* Central Shield with Verification Checkmark */}
        <g transform="translate(198, 92)" filter="url(#shieldShadow)">
          <path
            d="M 22 2 L 40 8 L 40 26 C 40 38 22 48 22 48 C 22 48 4 38 4 26 L 4 8 Z"
            fill="url(#shieldGrad)"
          />
          <path
            d="M 14 24 L 19 29 L 30 18"
            stroke="#ffffff"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Sound Waves & Particle Accents */}
        <g stroke="#10b981" strokeWidth="2" strokeLinecap="round">
          <path d="M 248 100 Q 254 116 248 132" fill="none" opacity="0.6" />
          <path d="M 255 94 Q 263 116 255 138" fill="none" opacity="0.4" />
        </g>
      </svg>
    </div>
  );
}

// 3. Standalone Illustration: 0% Commission vs Monopoly Apps Scaled Comparison
export function ZeroCommissionScaleIllustration({ className = '', style = {} }) {
  return (
    <div className={`illustration-scale ${className}`} style={{ width: '100%', maxWidth: 440, margin: '0 auto', ...style }}>
      <svg
        viewBox="0 0 440 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="emeraldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="roseGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>

        {/* Comparison Pillar Base */}
        <rect x="40" y="200" width="360" height="14" rx="4" fill="#e2e8f0" />
        <rect x="212" y="80" width="16" height="120" rx="4" fill="#94a3b8" />
        <circle cx="220" cy="80" r="10" fill="#0f172a" />

        {/* Tilted Lever Scale Beam (Rquest is higher & lighter with 0% cut) */}
        <g transform="rotate(-6 220 80)">
          <rect x="70" y="76" width="300" height="8" rx="4" fill="#0f172a" />

          {/* Left Pan: Monopoly Aggregators (Heavy with cuts) */}
          <g transform="translate(80, 80)">
            <line x1="20" y1="0" x2="5" y2="45" stroke="#64748b" strokeWidth="1.5" />
            <line x1="20" y1="0" x2="35" y2="45" stroke="#64748b" strokeWidth="1.5" />
            <path d="M 0 45 Q 20 60 40 45 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
            {/* Red Fee Blocks */}
            <rect x="8" y="24" width="24" height="20" rx="4" fill="url(#roseGrad)" />
            <text x="13" y="38" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="system-ui">-28%</text>
            <text x="5" y="70" fill="#e11d48" fontSize="10" fontWeight="800" fontFamily="system-ui">Aggregators</text>
          </g>

          {/* Right Pan: Rquest Direct (Higher with pure profit) */}
          <g transform="translate(320, 80)">
            <line x1="20" y1="0" x2="5" y2="45" stroke="#10b981" strokeWidth="1.5" />
            <line x1="20" y1="0" x2="35" y2="45" stroke="#10b981" strokeWidth="1.5" />
            <path d="M 0 45 Q 20 60 40 45 Z" fill="#d1fae5" stroke="#10b981" strokeWidth="1" />
            {/* Green Profit Stack */}
            <rect x="8" y="22" width="24" height="22" rx="4" fill="url(#emeraldGrad)" />
            <text x="11" y="36" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="system-ui">100%</text>
            <text x="-2" y="70" fill="#059669" fontSize="10" fontWeight="800" fontFamily="system-ui">Rquest (0%)</text>
          </g>
        </g>
      </svg>
    </div>
  );
}

// 4. Standalone Illustration: Community Runner & 10-Min Proximity Pickup
export function NeighborhoodRunnerIllustration({ className = '', style = {} }) {
  return (
    <div className={`illustration-runner ${className}`} style={{ width: '100%', maxWidth: 440, margin: '0 auto', ...style }}>
      <svg
        viewBox="0 0 440 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Radar Ring Track */}
        <circle cx="220" cy="110" r="85" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="6 6" />
        <circle cx="220" cy="110" r="45" stroke="#e2e8f0" strokeWidth="1.5" />

        {/* Origin Store Blip */}
        <g transform="translate(130, 85)">
          <circle cx="16" cy="16" r="16" fill="#f0fdf4" stroke="#10b981" strokeWidth="2" />
          <text x="9" y="21" fontSize="14">🏪</text>
          <text x="-6" y="42" fill="#0f172a" fontSize="9" fontWeight="800" fontFamily="system-ui">Store A</text>
        </g>

        {/* Destination Customer Blip */}
        <g transform="translate(280, 85)">
          <circle cx="16" cy="16" r="16" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
          <text x="9" y="21" fontSize="14">🏠</text>
          <text x="-6" y="42" fill="#0f172a" fontSize="9" fontWeight="800" fontFamily="system-ui">Doorstep</text>
        </g>

        {/* Animated Connecting Trajectory */}
        <path
          d="M 160 100 Q 220 50 280 100"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeDasharray="6 4"
        />

        {/* Moving Runner Scooter Icon in Middle */}
        <g transform="translate(205, 60)">
          <rect x="0" y="0" width="36" height="36" rx="18" fill="#0f172a" stroke="#60a5fa" strokeWidth="2" />
          <text x="8" y="24" fontSize="16">🛵</text>
          <rect x="-15" y="40" width="66" height="18" rx="6" fill="#090d16" />
          <text x="-8" y="52" fill="#60a5fa" fontSize="8" fontWeight="800" fontFamily="system-ui">180m • ETA 4m</text>
        </g>
      </svg>
    </div>
  );
}

// 5. Dynamic Page Design on Corner Sides: Left Gutter Flank
export function LeftCornerFlank({ className = '' }) {
  return (
    <div className={`landing-corner-flank flank-left ${className}`} aria-hidden="true">
      <svg width="60" height="380" viewBox="0 0 60 380" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Technical Corner Bracket ┌ */}
        <path d="M 45 10 L 15 10 L 15 70" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="12" y="7" width="6" height="6" fill="#10b981" />

        {/* Dot Matrix Cluster */}
        <g fill="#94a3b8" opacity="0.6">
          <circle cx="20" cy="95" r="1.5" />
          <circle cx="30" cy="95" r="1.5" />
          <circle cx="40" cy="95" r="1.5" />
          <circle cx="20" cy="105" r="1.5" />
          <circle cx="30" cy="105" r="1.5" />
          <circle cx="40" cy="105" r="1.5" />
          <circle cx="20" cy="115" r="1.5" />
          <circle cx="30" cy="115" r="1.5" />
          <circle cx="40" cy="115" r="1.5" />
        </g>

        {/* Technical Coordinate Stamp */}
        <g transform="rotate(-90 28 200)">
          <text x="28" y="200" fill="#64748b" fontSize="9" fontWeight="800" letterSpacing="2" fontFamily="monospace">
            RQ // LOCAL 0% CUT
          </text>
        </g>

        {/* Dynamic Glowing Target Ring */}
        <circle cx="25" cy="285" r="12" stroke="#10b981" strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />
        <circle cx="25" cy="285" r="4" fill="#059669" />

        {/* Bottom Bracket └ */}
        <path d="M 15 320 L 15 370 L 45 370" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="42" y="367" width="6" height="6" fill="#10b981" />
      </svg>
    </div>
  );
}

// 6. Dynamic Page Design on Corner Sides: Right Gutter Flank
export function RightCornerFlank({ className = '' }) {
  return (
    <div className={`landing-corner-flank flank-right ${className}`} aria-hidden="true">
      <svg width="60" height="380" viewBox="0 0 60 380" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Technical Corner Bracket ┐ */}
        <path d="M 15 10 L 45 10 L 45 70" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="42" y="7" width="6" height="6" fill="#3b82f6" />

        {/* Dot Matrix Cluster */}
        <g fill="#94a3b8" opacity="0.6">
          <circle cx="20" cy="95" r="1.5" />
          <circle cx="30" cy="95" r="1.5" />
          <circle cx="40" cy="95" r="1.5" />
          <circle cx="20" cy="105" r="1.5" />
          <circle cx="30" cy="105" r="1.5" />
          <circle cx="40" cy="105" r="1.5" />
          <circle cx="20" cy="115" r="1.5" />
          <circle cx="30" cy="115" r="1.5" />
          <circle cx="40" cy="115" r="1.5" />
        </g>

        {/* Technical Coordinate Stamp */}
        <g transform="rotate(90 32 200)">
          <text x="32" y="200" fill="#64748b" fontSize="9" fontWeight="800" letterSpacing="2" fontFamily="monospace">
            RADAR // PIN 4812
          </text>
        </g>

        {/* Dynamic Glowing Target Ring */}
        <circle cx="35" cy="285" r="12" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />
        <circle cx="35" cy="285" r="4" fill="#2563eb" />

        {/* Bottom Bracket ┘ */}
        <path d="M 45 320 L 45 370 L 15 370" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="12" y="367" width="6" height="6" fill="#3b82f6" />
      </svg>
    </div>
  );
}

// 7. Hand-Drawn Editorial Swoosh for "Zero Middlemen." Title
export function HeroSwoosh({ className = '', style = {} }) {
  return (
    <svg
      viewBox="0 0 240 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`hero-swoosh-svg ${className}`}
      style={{ display: 'block', width: '100%', height: 'auto', ...style }}
    >
      <path
        d="M 3 11 C 45 4, 110 3, 237 8"
        stroke="#10b981"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M 12 14 C 70 8, 140 7, 225 12"
        stroke="#059669"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

// 8. Hand-Drawn Playful Doodle Arrow Pointing to Search / Marketplace
export function HeroDoodleArrow({ className = '', text = 'Search 240m nearby' }) {
  return (
    <div className={`hero-doodle-arrow-container ${className}`}>
      <span className="hero-doodle-label">{text}</span>
      <svg width="48" height="36" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M 8 6 C 24 8, 36 16, 32 30"
          stroke="#059669"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 24 28 L 32 32 L 36 24"
          stroke="#059669"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// 9. Smooth Topographic Section Wave Divider
export function SectionWaveDivider({ className = '' }) {
  return (
    <div className={`section-wave-divider ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <path
          d="M 0 40 Q 360 0, 720 40 T 1440 40 L 1440 80 L 0 80 Z"
          fill="#090d16"
        />
        <path
          d="M 0 55 Q 360 25, 720 55 T 1440 55"
          stroke="rgba(16, 185, 129, 0.3)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    </div>
  );
}

// 10. Sparkle Star SVG Accent
export function SparkleStar({ size = 16, color = '#10b981', className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      <path
        d="M 12 0 Q 12 12, 0 12 Q 12 12, 12 24 Q 12 12, 24 12 Q 12 12, 12 0 Z"
        fill={color}
      />
    </svg>
  );
}

HeroStreetIllustration.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};

HandshakePinIllustration.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};

ZeroCommissionScaleIllustration.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};

NeighborhoodRunnerIllustration.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};

LeftCornerFlank.propTypes = {
  className: PropTypes.string,
};

RightCornerFlank.propTypes = {
  className: PropTypes.string,
};

HeroSwoosh.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};

HeroDoodleArrow.propTypes = {
  className: PropTypes.string,
  text: PropTypes.string,
};

SectionWaveDivider.propTypes = {
  className: PropTypes.string,
};

SparkleStar.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};


