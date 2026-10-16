import React, { useState, useEffect, useRef } from 'react';
import { Tag, Tooltip } from 'antd';
import {
  SearchOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  CheckCircleFilled,
  MessageOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  DollarCircleOutlined,
  CompassOutlined,
  CheckOutlined,
  LockOutlined,
  PhoneOutlined,
  NotificationOutlined,
  SendOutlined,
  CloseOutlined,
  MinusOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { useHistory, Link } from 'react-router-dom';
import Routes from '../../app/routes/routes';
import './index.css';
import {
  HeroStreetIllustration,
  HandshakePinIllustration,
  ZeroCommissionScaleIllustration,
  NeighborhoodRunnerIllustration,
  LeftCornerFlank,
  RightCornerFlank,
  HeroSwoosh,
  HeroDoodleArrow,
  SectionWaveDivider,
} from './LandingIllustrations';

// Interactive Live Order Request & Delivery Tracking Stages (Above Chat Island)
const DELIVERY_TRACK_STAGES = [
  {
    step: 1,
    id: 'placed',
    title: 'Placed',
    sub: '10:38 AM',
    icon: '📝',
    desc: 'Customer requested 5kg Atta & Milk verification',
  },
  {
    step: 2,
    id: 'verified',
    title: 'Shelf Verified',
    sub: '10:40 AM',
    icon: '✓',
    desc: 'Murugan confirmed physical shelf stock at Counter #1',
  },
  {
    step: 3,
    id: 'runner',
    title: 'Runner On Way',
    sub: '180m • ETA 4m',
    icon: '🛵',
    desc: 'Runner Ravi K. dispatched for zero-markup direct handover',
  },
  {
    step: 4,
    id: 'handshake',
    title: 'PIN Handshake',
    sub: 'PIN 4812',
    icon: '🔒',
    desc: 'Mutual 2-way PIN verification & instant UPI soundbox chime',
  },
];

// Real Hyperlocal Store Mock Data for the Interactive Radar Deck
const RADAR_STORES = [
  {
    id: 'sri-krishna',
    category: 'kirana',
    categoryLabel: 'Kirana & Mart',
    icon: '🛒',
    name: 'Sri Krishna Provisions & Dairy',
    distance: '240m away',
    time: '8 mins walk',
    rating: '4.9★ (380)',
    stockHighlight: 'Fresh Whole Wheat Atta & Aavin Milk in stock',
    price: '₹240 (Shelf MRP)',
    coords: { top: '35%', left: '26%' },
    appLink: `${Routes.app}?category=Provision+Store`,
  },
  {
    id: 'bawarchi-biryani',
    category: 'food',
    categoryLabel: 'Food & Dining',
    icon: '🍲',
    name: 'Bawarchi Dum Biryani & Kebabs',
    distance: '580m away',
    time: '12 mins walk',
    rating: '4.8★ (920)',
    stockHighlight: 'Hot Dum Chicken Biryani batch ready now',
    price: '₹220 (Zero App Markup)',
    coords: { top: '65%', left: '68%' },
    appLink: `${Routes.app}?category=Restaurants`,
  },
  {
    id: 'ramesh-electricals',
    category: 'service',
    categoryLabel: 'Technicians',
    icon: '🔧',
    name: 'Ramesh AC Service & Electrician',
    distance: '1.1 km away',
    time: 'Available in 20m',
    rating: '4.95★ (160)',
    stockHighlight: 'In-chat quote card + 7-Day Guarantee',
    price: '₹199 Inspection fee',
    coords: { top: '22%', left: '72%' },
    appLink: `${Routes.app}?category=Technicians`,
  },
  {
    id: 'meena-boutique',
    category: 'fashion',
    categoryLabel: 'Boutique',
    icon: '👗',
    name: 'Meena Designer Kurtis & Sarees',
    distance: '850m away',
    time: 'BOPIS ready',
    rating: '4.7★ (85)',
    stockHighlight: 'Custom alterations & silk collection',
    price: 'Counter direct price',
    coords: { top: '75%', left: '32%' },
    appLink: `${Routes.app}?category=Dress+Shop`,
  },
];

// Price Transparency Scanner Data (Landbook Reference Interactive Economics)
const PRICE_SCANNER_DATA = [
  {
    id: 'biryani',
    tabLabel: '🍲 Chicken Dum Biryani',
    name: 'Special Chicken Dum Biryani (Full Degchi Portion)',
    store: 'Bawarchi Dum Biryani & Kebabs',
    rquestPrice: 220,
    aggregatorBase: 280,
    aggregatorDelivery: 45,
    aggregatorPlatform: 12,
    aggregatorGst: 18,
    shelfNote: 'Verified fresh 1:15 PM degchi batch ready for pickup',
    distance: '580m away • 12 mins walk',
  },
  {
    id: 'groceries',
    tabLabel: '🛒 Daily Milk & Atta 5kg',
    name: 'Aavin Full Cream Milk (2L) + Whole Wheat Atta 5kg',
    store: 'Sri Krishna Provisions & Dairy',
    rquestPrice: 350,
    aggregatorBase: 420,
    aggregatorDelivery: 35,
    aggregatorPlatform: 15,
    aggregatorGst: 0,
    shelfNote: 'Physical shelf MRP verified via in-chat camera check',
    distance: '240m away • 8 mins walk',
  },
  {
    id: 'technician',
    tabLabel: '🔧 AC Leak & Deep Wash',
    name: '1.5T AC Water Leak Repair & Anti-Bacterial Wash',
    store: 'Ramesh AC Service & Electrician',
    rquestPrice: 450,
    aggregatorBase: 699,
    aggregatorDelivery: 50,
    aggregatorPlatform: 99,
    aggregatorGst: 45,
    shelfNote: 'In-chat formal digital quote + 7-Day Guarantee locked',
    distance: '1.1 km away • Available in 20m',
  },
  {
    id: 'boutique',
    tabLabel: '👗 Designer Handloom Kurti',
    name: 'Pure Cotton Handloom Kurti with Free Counter Alterations',
    store: 'Meena Designer Kurtis & Sarees',
    rquestPrice: 850,
    aggregatorBase: 1250,
    aggregatorDelivery: 60,
    aggregatorPlatform: 40,
    aggregatorGst: 50,
    shelfNote: 'Counter direct price, trial room & alterations ready',
    distance: '850m away • BOPIS ready',
  },
];

const CATEGORIES_GALLERY = [
  {
    id: 'Provision Store',
    name: 'Daily Groceries & Kiranas',
    icon: '🛒',
    desc: 'Daily provisions, fresh dairy, cooking oils, and spices at genuine shelf prices.',
    distanceBadge: 'Within 350m',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=700&auto=format&fit=crop&q=80',
    count: '38 Local Stores',
  },
  {
    id: 'Restaurants',
    name: 'Hot Food & Cloud Kitchens',
    icon: '🍲',
    desc: 'Neighborhood dum biryani, tea points, evening snacks, and bakeries with 10m pickup.',
    distanceBadge: 'Within 600m',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=700&auto=format&fit=crop&q=80',
    count: '54 Food Outlets',
  },
  {
    id: 'Technicians',
    name: 'AC, Electrical & Plumbers',
    icon: '🔧',
    desc: 'Verified home service mechanics with transparent in-chat quotes and 7-day guarantee.',
    distanceBadge: 'Within 1.5 km',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=700&auto=format&fit=crop&q=80',
    count: '24 Available Now',
  },
  {
    id: 'Dress Shop',
    name: 'Fashion Boutiques & Sarees',
    icon: '👗',
    desc: 'Ethnic wear, custom tailoring, bridal kurtis, and footwear from local boutique artisans.',
    distanceBadge: 'Within 900m',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=700&auto=format&fit=crop&q=80',
    count: '19 Boutiques',
  },
  {
    id: 'Small business',
    name: 'Salons, Spas & Wellness',
    icon: '💆',
    desc: 'Neighborhood unisex salons, hair styling, facials, and grooming appointments.',
    distanceBadge: 'Within 800m',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=700&auto=format&fit=crop&q=80',
    count: '15 Centers',
  },
  {
    id: 'Rentals',
    name: 'Tools & Vehicle Rentals',
    icon: '🏍️',
    desc: 'Two-wheeler rentals, power tools, photography lights, and event sound systems.',
    distanceBadge: 'Within 2.0 km',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=700&auto=format&fit=crop&q=80',
    count: '12 Providers',
  },
];

// Side-by-side comparison matrix data (Used for desktop table & dedicated mobile deck)
const COMPARISON_FEATURES = [
  {
    id: 'commission',
    icon: '💰',
    title: 'Merchant Sales Commission',
    badge: 'Save ₹40,000+/mo',
    isTop: true,
    rquest: {
      headline: '0% Commission (Flat ₹199/mo SaaS)',
      detail: '100% direct customer revenue goes to the retailer with zero transaction cut.',
    },
    legacy: {
      headline: '18% to 32% cut on every transaction',
      detail: 'Monopoly aggregators slash deep into retailer bottom-lines on every order.',
    },
  },
  {
    id: 'pricing',
    icon: '🏷️',
    title: 'Customer Shelf Pricing',
    badge: 'Zero Markups',
    isTop: true,
    rquest: {
      headline: '100% Real Counter MRP',
      detail: 'Identical prices to walking into the physical neighborhood store.',
    },
    legacy: {
      headline: 'Inflated 20–25% on menus',
      detail: 'Shops must hike catalog prices to cover platform commissions.',
    },
  },
  {
    id: 'stock',
    icon: '📦',
    title: 'Shelf Stock Verification',
    badge: 'Zero Refund Drama',
    isTop: true,
    rquest: {
      headline: '2-Step Mutual Stock Check First',
      detail: 'Store confirms physical item is in hand before you pay single rupee.',
    },
    legacy: {
      headline: 'Charged upfront; 3–5 day refund dispute',
      detail: 'Missing items in parcel require arguing with chatbot agents.',
    },
  },
  {
    id: 'chat',
    icon: '💬',
    title: 'Customer-Store Relationship',
    badge: 'Direct Negotiation',
    isTop: false,
    rquest: {
      headline: 'Direct WebSocket Chat & Audio Call',
      detail: 'Chat with store manager, ask custom cuts/brands, and share photos.',
    },
    legacy: {
      headline: 'Masked numbers & rigid tickets',
      detail: 'Aggregators isolate customers to monopolize the relationship.',
    },
  },
  {
    id: 'settlement',
    icon: '⚡',
    title: 'Payment Settlement',
    badge: 'Instant Soundbox',
    isTop: false,
    rquest: {
      headline: 'Instant Direct UPI QR Chime',
      detail: 'Money arrives immediately in merchant’s own bank account.',
    },
    legacy: {
      headline: 'Held in escrow for 7–14 days',
      detail: 'Platforms sit on merchant working capital with delayed payouts.',
    },
  },
  {
    id: 'fulfillment',
    icon: '🛵',
    title: 'Fulfillment & Delivery Modes',
    badge: 'Zero Fleet Surcharges',
    isTop: false,
    rquest: {
      headline: 'BOPIS, Store Staff, or Runner Pool',
      detail: 'Free 2-minute counter pickup or direct neighborhood runner dispatch.',
    },
    legacy: {
      headline: 'Forced rider fleet & surge fees',
      detail: 'High delivery fees, handling fees, and surge surcharges even for 200m.',
    },
  },
];

export default function LandingScreen() {
  const history = useHistory();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Perspective Mode Switcher ('shopper' | 'merchant' | 'illustrated') - Landbook Curated Feature
  const [experienceMode, setExperienceMode] = useState('shopper');

  // Interactive Radar State
  const [selectedRadius, setSelectedRadius] = useState('1km');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedStore, setSelectedStore] = useState(RADAR_STORES[0]);

  // Interactive Price Scanner State
  const [activeScannerItem, setActiveScannerItem] = useState('biryani');

  // Interactive Profit Calculator State (Inside Bento Grid)
  const [monthlyRevenue, setMonthlyRevenue] = useState(150000);
  
  // Interactive Quote State
  const [quoteAccepted, setQuoteAccepted] = useState(false);

  // Active Order Fulfillment Highlight State ('bopis' | 'runner' | 'handshake')
  const [activeFulfillment, setActiveFulfillment] = useState('runner');

  // Floating Order Request & Delivery Track State (Floats Above Chat Island)
  const [deliveryStep, setDeliveryStep] = useState(3); // 1: Placed, 2: Shelf Verified, 3: Runner Dispatched, 4: Handshake PIN
  const [trackerCollapsed, setTrackerCollapsed] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const manualStepOverrideRef = useRef(false);
  const manualOverrideTimerRef = useRef(null);

  // Dedicated Mobile Comparison Deck View Mode ('all' | 'top')
  const [comparisonFilter, setComparisonFilter] = useState('all');

  // Floating Live In-Store Chat Notification State (matches In-App Chat UI/UX)
  const [chatMinimized, setChatMinimized] = useState(false);
  const [chatDismissed, setChatDismissed] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const [isStoreTyping, setIsStoreTyping] = useState(false);
  const chatScrollRef = useRef(null);

  // Mobile HUD Tab State ('tracker' | 'chat') & Touch Gestures
  const [mobileHudTab, setMobileHudTab] = useState('chat');
  const [hudAutoEntered, setHudAutoEntered] = useState(false);
  const touchStartRef = useRef(null);

  // Smooth entrance notification for mobile users
  useEffect(() => {
    const timer = setTimeout(() => {
      setHudAutoEntered(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Touch Swipe Gesture Handler (Swipe down to minimize, swipe left/right to toggle Tracker/Chat)
  const handleTouchStart = (e) => {
    if (!e.touches || !e.touches[0]) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current || !e.changedTouches || !e.changedTouches[0]) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Horizontal swipe: switch between Tracker and Chat view on mobile
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && deltaTime < 600) {
      if (deltaX < 0) {
        setMobileHudTab('chat');
      } else {
        setMobileHudTab('tracker');
      }
    }

    // Vertical swipe down: minimize to capsule
    if (deltaY > 50 && Math.abs(deltaY) > Math.abs(deltaX) * 1.1) {
      setChatMinimized(true);
    } else if (chatMinimized && deltaY < -40) {
      setChatMinimized(false);
    }

    touchStartRef.current = null;
  };

  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'store',
      author: 'Murugan (Store Owner)',
      text: 'Anna, your 5kg Whole Wheat Atta & 2L Fresh Milk are packed at Counter #1. Ready for handshake pickup anytime before 9:30 PM!',
      time: '10:42 AM',
      orderAttachment: {
        orderId: 'RQ-4812',
        items: '1x Whole Wheat Atta 5kg (₹190) + 2x Aavin Fresh Milk 1L (₹50)',
        total: '₹240 (Shelf MRP)',
        savings: 'Saved ₹70 vs 25% apps',
        pin: '4812',
      },
    },
  ]);

  // Scroll-reactive visual experience: drives floating parallax and order stages
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      setScrollProgress(progress);

      // Auto-progress order story based on scroll section unless user manually clicked
      if (!manualStepOverrideRef.current) {
        if (progress < 22) {
          setDeliveryStep(2); // Shelf confirmed in Hero
          setActiveFulfillment('bopis');
        } else if (progress >= 22 && progress < 65) {
          setDeliveryStep(3); // Runner dispatched during Radar / Scanner
          setActiveFulfillment('runner');
        } else {
          setDeliveryStep(4); // Handshake complete at lower sections
          setActiveFulfillment('handshake');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle manual selection on the floating delivery track or hero status bar
  const handleSelectDeliveryStep = (stepNum) => {
    setDeliveryStep(stepNum);
    manualStepOverrideRef.current = true;
    if (manualOverrideTimerRef.current) clearTimeout(manualOverrideTimerRef.current);
    manualOverrideTimerRef.current = setTimeout(() => {
      manualStepOverrideRef.current = false;
    }, 15000);

    if (stepNum === 1 || stepNum === 2) {
      setActiveFulfillment('bopis');
    } else if (stepNum === 3) {
      setActiveFulfillment('runner');
    } else {
      setActiveFulfillment('handshake');
    }

    let statusText = '';
    if (stepNum === 1) statusText = '📦 Order #RQ-4812 created. Verifying physical shelf inventory...';
    if (stepNum === 2) statusText = '✓ Physical stock confirmed! Atta 5kg & Milk 2L reserved. Handshake PIN: 4812.';
    if (stepNum === 3) statusText = '🛵 Runner Ravi K. (180m away) picked up parcel from Counter #1. ETA 4 mins!';
    if (stepNum === 4) statusText = '🔒 2-Step Handshake PIN 4812 verified! Soundbox chime: ₹240 received on UPI (0% commission).';

    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        sender: 'store',
        author: 'Delivery Status Hub',
        text: statusText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 60);
  };

  const handleSelectFulfillmentTag = (mode) => {
    setActiveFulfillment(mode);
    if (mode === 'bopis') handleSelectDeliveryStep(2);
    if (mode === 'runner') handleSelectDeliveryStep(3);
    if (mode === 'handshake') handleSelectDeliveryStep(4);
  };

  const handleSendChatMessage = (text) => {
    if (!text || !text.trim()) return;
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInputText('');

    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 60);

    // Simulate Merchant typing & response
    setIsStoreTyping(true);
    setTimeout(() => {
      setIsStoreTyping(false);
      let replyText = 'Pakka Anna! Kept safely on the front desk. See you at Counter #1.';
      const lower = text.toLowerCase();
      if (lower.includes('pin') || lower.includes('4812')) {
        replyText = 'Counter PIN 4812 verified! 🔒 Instant UPI Soundbox is set for ₹240.';
      } else if (lower.includes('runner') || lower.includes('delivery')) {
        replyText = 'Runner Ravi (180m away) has been notified. 🛵 Direct route handover!';
      } else if (lower.includes('curd') || lower.includes('milk') || lower.includes('packet')) {
        replyText = 'Added 1 packet fresh curd (₹30) at shelf MRP! Updated basket total is ₹270.';
      } else if (lower.includes('discount') || lower.includes('offer')) {
        replyText = 'You already saved ₹70 on shelf MRP! 0% aggregator commission passed directly to you.';
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'store',
          author: 'Murugan (Store Owner)',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 60);
    }, 900);
  };

  // Calculations for Merchant Profit Calculator
  const legacyCommission = Math.round(monthlyRevenue * 0.25);
  const rquestCost = 199;
  const netSavings = legacyCommission - rquestCost;

  const handleHeroSearch = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      history.push(`${Routes.app}?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      history.push(Routes.app);
    }
  };

  const filteredStores = activeCategory === 'all'
    ? RADAR_STORES
    : RADAR_STORES.filter((s) => s.category === activeCategory);

  return (
    <div className="landing-wrapper">
      {/* Background Atmosphere Subtle Blueprint Dots */}
      <div className="landing-ambient-bg" />

      {/* Dynamic Architectural Corner Side Designs (Open Source Vector Overlays) */}
      <LeftCornerFlank />
      <RightCornerFlank />

      {/* Floating Dynamic Corner Side Badges */}
      <div className="corner-side-badge corner-side-top-left" aria-hidden="true">
        <span className="corner-beacon green" />
        <span>⚡ 10-Min Counter BOPIS</span>
      </div>
      <div className="corner-side-badge corner-side-top-right" aria-hidden="true">
        <span className="corner-beacon blue" />
        <span>🔒 4-Digit Handshake PIN</span>
      </div>
      <div className="corner-side-badge corner-side-mid-left" aria-hidden="true">
        <span className="corner-beacon purple" />
        <span>🛵 Zero Fleet Markups</span>
      </div>
      <div className="corner-side-badge corner-side-mid-right" aria-hidden="true">
        <span className="corner-beacon emerald" />
        <span>0% Merchant Commission</span>
      </div>

      {/* ------------------------------------------------------------------
          1. Hero Section - Architectural Split Screen Architecture
          ------------------------------------------------------------------ */}
      <section className="landing-container">
        <div className="landing-hero-split">
          {/* Left Column: Confident Typography & Proximity Action */}
          <div className="hero-left-content">
            <div className="hero-live-badge">
              <span className="hero-live-beacon" />
              <span className="hero-badge-title">Direct Hyperlocal Network</span>
              <span className="hero-badge-dot">/</span>
              <span className="hero-badge-metric">0% Commission Model</span>
            </div>

            <h1 className="hero-main-title">
              Local Stores. <br />
              Real Shelf Prices. <br />
              <span className="hero-title-emerald">
                Zero Middlemen.
                <HeroSwoosh className="hero-title-swoosh" />
              </span>
            </h1>

            <p className="hero-desc">
              Discover verified neighborhood kiranas, food joints, technicians, and rentals within walking distance.
              Verify physical shelf stock in direct real-time chat, pay directly via UPI QR, and collect in 10 minutes or get community runner delivery.
            </p>

            {/* Modern Search Capsule with Hand-Drawn Annotation Arrow */}
            <div className="hero-search-wrapper-relative">
              <form className="hero-search-capsule" onSubmit={handleHeroSearch}>
                <SearchOutlined style={{ fontSize: 18, color: '#64748b' }} />
                <input
                  type="text"
                  className="hero-search-field"
                  placeholder="Search fresh milk, biryani, AC repair, dresses, rentals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="hero-search-action-btn">
                  <span>Find Nearby</span>
                  <ArrowRightOutlined />
                </button>
              </form>
              <HeroDoodleArrow text="100% Shelf MRP • Zero Markups" className="hero-arrow-annotation" />
            </div>

            {/* Clean Typographic Popular Links (No Button Overload) */}
            <div className="hero-popular-row">
              <span className="popular-label">Popular:</span>
              <button type="button" className="popular-link-item" onClick={() => history.push(`${Routes.app}?q=Fresh+Milk`)}>
                Daily Groceries
              </button>
              <span className="popular-bullet">·</span>
              <button type="button" className="popular-link-item" onClick={() => history.push(`${Routes.app}?q=Biryani`)}>
                Hot Dining
              </button>
              <span className="popular-bullet">·</span>
              <button type="button" className="popular-link-item" onClick={() => history.push(`${Routes.app}?category=Technicians`)}>
                AC Technicians
              </button>
              <span className="popular-bullet">·</span>
              <button type="button" className="popular-link-item" onClick={() => history.push(`${Routes.app}?category=Dress+Shop`)}>
                Boutiques
              </button>
            </div>

            {/* Primary Action & Merchant Onboarding Link */}
            <div className="hero-action-row">
              <Link to={Routes.app} className="btn-hero-obsidian">
                <CompassOutlined />
                <span>Explore Local Marketplace</span>
                <ArrowRightOutlined style={{ fontSize: 13 }} />
              </Link>
              <Link to={Routes.client} className="hero-merchant-link">
                <span>Shopkeeper? Register for ₹0</span>
                <ArrowRightOutlined style={{ fontSize: 12 }} />
              </Link>
            </div>

            {/* Trust Capsule */}
            <div className="hero-social-proof">
              <div className="avatar-stack">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80" alt="User 1" />
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80" alt="User 2" />
                <img src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=60&auto=format&fit=crop&q=80" alt="User 3" />
              </div>
              <div className="proof-text">
                <span className="proof-stars">★★★★★</span>
                <span><strong>4.9 / 5</strong> rating from 12,000+ local neighbors</span>
              </div>
            </div>
          </div>

          {/* Right Column: Creative Showcase with 3D Overlays & Mode Switcher */}
          <div className="hero-right-console">
            <div className="hero-stage-wrapper">
              {/* Perspective Mode Switcher (Landbook Reference Signature) */}
              <div className="stage-mode-switcher">
                <button
                  type="button"
                  className={`mode-switch-btn ${experienceMode === 'shopper' ? 'active' : ''}`}
                  onClick={() => setExperienceMode('shopper')}
                >
                  <span className="mode-btn-icon">🛍️</span>
                  <span>Shopper Radar View</span>
                </button>
                <button
                  type="button"
                  className={`mode-switch-btn ${experienceMode === 'merchant' ? 'active' : ''}`}
                  onClick={() => setExperienceMode('merchant')}
                >
                  <span className="mode-btn-icon">🏪</span>
                  <span>Store Owner Hub (0% Cut)</span>
                </button>
                <button
                  type="button"
                  className={`mode-switch-btn ${experienceMode === 'illustrated' ? 'active' : ''}`}
                  onClick={() => setExperienceMode('illustrated')}
                >
                  <span className="mode-btn-icon">🎨</span>
                  <span>Neighborhood Scene</span>
                </button>
              </div>

              {/* The Viewport with Floating Glassmorphic Overlays */}
              <div className="stage-viewport">
                {/* Floating Overlay A (Top Left) */}
                <div className="floating-badge-overlay overlay-top-left">
                  {experienceMode === 'shopper' ? (
                    <div className="overlay-content-card">
                      <div className="overlay-header">
                        <span className="overlay-icon">🛒</span>
                        <span className="overlay-title">Shelf MRP Lock</span>
                        <span className="overlay-live-pill">Direct</span>
                      </div>
                      <div className="overlay-body-text">
                        <strong>₹240</strong> Counter Price <span className="overlay-strike">₹310 on apps</span>
                      </div>
                      <div className="overlay-footer-note">● Saved ₹70 on single basket</div>
                    </div>
                  ) : experienceMode === 'merchant' ? (
                    <div className="overlay-content-card">
                      <div className="overlay-header">
                        <span className="overlay-icon">🛎️</span>
                        <span className="overlay-title">Live Shelf Request</span>
                        <span className="overlay-live-pill live-green">Just Now</span>
                      </div>
                      <div className="overlay-body-text">
                        <strong>Priya S.</strong> requested Milk & Atta (240m)
                      </div>
                      <div className="overlay-footer-note">⚡ Tap &quot;In-Stock&quot; to confirm</div>
                    </div>
                  ) : (
                    <div className="overlay-content-card">
                      <div className="overlay-header">
                        <span className="overlay-icon">🏪</span>
                        <span className="overlay-title">Physical Mart</span>
                        <span className="overlay-live-pill live-green">Open Now</span>
                      </div>
                      <div className="overlay-body-text">
                        <strong>Direct Store Counter</strong>
                      </div>
                      <div className="overlay-footer-note">● 0% Middleman Markup</div>
                    </div>
                  )}
                </div>

                {/* Floating Overlay B (Top Right) */}
                <div className="floating-badge-overlay overlay-top-right">
                  {experienceMode === 'shopper' ? (
                    <div className="overlay-content-card">
                      <div className="overlay-header">
                        <span className="overlay-icon">💬</span>
                        <span className="overlay-title">Live Counter Chat</span>
                      </div>
                      <div className="overlay-body-text">
                        <em>&quot;Anna, pack 1 Biryani hot?&quot;</em> <br />
                        <strong>✓ &quot;Ready at counter! PIN 4812&quot;</strong>
                      </div>
                    </div>
                  ) : experienceMode === 'merchant' ? (
                    <div className="overlay-content-card">
                      <div className="overlay-header">
                        <span className="overlay-icon">💰</span>
                        <span className="overlay-title">0% Platform Cut</span>
                      </div>
                      <div className="overlay-body-text">
                        <strong>100% Payout</strong> into Merchant UPI
                      </div>
                      <div className="overlay-footer-note">Zero 14-day holdback delay</div>
                    </div>
                  ) : (
                    <div className="overlay-content-card">
                      <div className="overlay-header">
                        <span className="overlay-icon">🛵</span>
                        <span className="overlay-title">Runner In Transit</span>
                      </div>
                      <div className="overlay-body-text">
                        <strong>Ravi K.</strong> 180m away (ETA 4m)
                      </div>
                      <div className="overlay-footer-note">Direct store handover</div>
                    </div>
                  )}
                </div>

                {/* Floating Overlay C (Bottom Left) */}
                <div className="floating-badge-overlay overlay-bottom-left">
                  {experienceMode === 'shopper' ? (
                    <div className="overlay-content-card">
                      <div className="overlay-header">
                        <span className="overlay-icon">⚡</span>
                        <span className="overlay-title">2-Way PIN Handshake</span>
                      </div>
                      <div className="overlay-body-text">
                        Counter PIN: <strong className="pin-num">4812</strong>
                      </div>
                      <div className="overlay-footer-note">Counter pickup in 8 mins</div>
                    </div>
                  ) : experienceMode === 'merchant' ? (
                    <div className="overlay-content-card">
                      <div className="overlay-header">
                        <span className="overlay-icon">🔊</span>
                        <span className="overlay-title">Instant Soundbox Chime</span>
                      </div>
                      <div className="overlay-body-text">
                        <strong>₹340 Received</strong> directly via UPI
                      </div>
                      <div className="overlay-footer-note">0% platform commission cut</div>
                    </div>
                  ) : (
                    <div className="overlay-content-card">
                      <div className="overlay-header">
                        <span className="overlay-icon">🔒</span>
                        <span className="overlay-title">2-Way PIN Lock</span>
                      </div>
                      <div className="overlay-body-text">
                        Mutual PIN: <strong className="pin-num">4812</strong>
                      </div>
                      <div className="overlay-footer-note">Physical counter verify</div>
                    </div>
                  )}
                </div>

                {/* Floating Overlay D (Bottom Right) */}
                <div className="floating-badge-overlay overlay-bottom-right">
                  {experienceMode === 'shopper' ? (
                    <div className="overlay-content-card">
                      <div className="overlay-header">
                        <span className="overlay-icon">🚶</span>
                        <span className="overlay-title">Self-Pickup or Runner</span>
                      </div>
                      <div className="overlay-body-text">
                        <strong>240m away</strong> (6m walk)
                      </div>
                      <div className="overlay-footer-note">₹0 Delivery fleet surcharge</div>
                    </div>
                  ) : experienceMode === 'merchant' ? (
                    <div className="overlay-content-card">
                      <div className="overlay-header">
                        <span className="overlay-icon">📈</span>
                        <span className="overlay-title">Flat ₹199/mo SaaS</span>
                      </div>
                      <div className="overlay-body-text">
                        <strong>+₹45,920/mo</strong> Saved vs 25% Apps
                      </div>
                    </div>
                  ) : (
                    <div className="overlay-content-card">
                      <div className="overlay-header">
                        <span className="overlay-icon">⚡</span>
                        <span className="overlay-title">Instant UPI QR</span>
                      </div>
                      <div className="overlay-body-text">
                        <strong>₹0 Middleman Cut</strong>
                      </div>
                      <div className="overlay-footer-note">Soundbox chime instant</div>
                    </div>
                  )}
                </div>

                {/* Main Interactive Deck: Shopper Radar vs Merchant Hub vs Illustrated Scene */}
                {experienceMode === 'illustrated' ? (
                  <div className="illustrated-scene-deck animate-fade-in">
                    <div className="illustrated-scene-header">
                      <div className="scene-badge">
                        <span className="tag-status-light live-green" />
                        <span>Neighborhood Direct Commerce in Action</span>
                      </div>
                      <Tag color="cyan" style={{ borderRadius: 8, fontWeight: 800, padding: '3px 10px' }}>
                        0% Middlemen • Real Shelf MRP
                      </Tag>
                    </div>

                    <div className="illustrated-scene-canvas">
                      <HeroStreetIllustration />
                    </div>

                    <div className="illustrated-scene-footer">
                      <div className="scene-footer-chip">
                        <span>🏪 Sri Krishna Provisions</span>
                        <span className="chip-sub">240m away • Counter Online</span>
                      </div>
                      <div className="scene-footer-chip">
                        <span>🛵 Runner Ravi</span>
                        <span className="chip-sub">Dispatched • ETA 4m</span>
                      </div>
                      <div className="scene-footer-chip">
                        <span>🔒 PIN: 4812</span>
                        <span className="chip-sub">Mutual 2-Way Lock</span>
                      </div>
                    </div>

                    <div className="illustrated-scene-actions">
                      <Link to={Routes.app} className="btn-radar-primary">
                        <CompassOutlined />
                        <span>Launch Marketplace Map</span>
                        <ArrowRightOutlined style={{ fontSize: 12, marginLeft: 'auto' }} />
                      </Link>
                    </div>
                  </div>
                ) : experienceMode === 'shopper' ? (
                  <div className="radar-device-deck">
                    {/* Interactive Order Delivery & Fulfillment Status Bar */}
                    <div className="hero-fulfillment-status-bar">
                      <div
                        className={`fulfillment-status-chip ${activeFulfillment === 'bopis' ? 'active' : ''}`}
                        onClick={() => handleSelectFulfillmentTag('bopis')}
                      >
                        <span className="chip-indicator-dot green" />
                        <div className="chip-text">
                          <span className="chip-label">⚡ Express BOPIS</span>
                          <span className="chip-sub">Ready in 4m • PIN 4812</span>
                        </div>
                        {activeFulfillment === 'bopis' && <span className="chip-active-bar" />}
                      </div>

                      <div
                        className={`fulfillment-status-chip ${activeFulfillment === 'runner' ? 'active' : ''}`}
                        onClick={() => handleSelectFulfillmentTag('runner')}
                      >
                        <span className="chip-indicator-dot blue" />
                        <div className="chip-text">
                          <span className="chip-label">🛵 Direct Runner</span>
                          <span className="chip-sub">180m away • ETA 6m</span>
                        </div>
                        {activeFulfillment === 'runner' && <span className="chip-active-bar" />}
                      </div>

                      <div
                        className={`fulfillment-status-chip ${activeFulfillment === 'handshake' ? 'active' : ''}`}
                        onClick={() => handleSelectFulfillmentTag('handshake')}
                      >
                        <span className="chip-indicator-dot purple" />
                        <div className="chip-text">
                          <span className="chip-label">🔒 2-Step Handshake</span>
                          <span className="chip-sub">100% Shelf MRP</span>
                        </div>
                        {activeFulfillment === 'handshake' && <span className="chip-active-bar" />}
                      </div>
                    </div>

                    <div className="radar-header-bar">
                      <div className="radar-header-title">
                        <span className="radar-beacon-dot" />
                        <span>Neighborhood Radar Console</span>
                      </div>
                      <div className="radar-radius-selector">
                        {['500m', '1km', '3km', '5km'].map((rad) => (
                          <button
                            key={rad}
                            className={`radius-btn ${selectedRadius === rad ? 'active' : ''}`}
                            onClick={() => setSelectedRadius(rad)}
                          >
                            {rad}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Midnight Radar Screen Canvas with Multiplayer Cursors */}
                    <div className="radar-screen-canvas">
                      <div className="radar-grid-bg" />
                      <div className="radar-sweep-beam" />
                      <div className="radar-circle-outer" />
                      <div className="radar-circle-mid" />
                      <div className="radar-circle-inner" />
                      
                      <div className={`radar-center-pin ${activeFulfillment === 'handshake' ? 'handshake-shield-pulse' : ''}`} title="Your GPS Location">
                        <div className="center-dot-pulse" />
                        <div className="center-dot-core" />
                      </div>

                      {/* Live Animated Runner GPS Trajectory Route when Runner Mode is active */}
                      {activeFulfillment === 'runner' && (
                        <svg className="radar-route-svg" viewBox="0 0 300 190">
                          <path
                            d="M 80 66 Q 115 110 150 95"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2.5"
                            strokeDasharray="5 4"
                            className="radar-route-dashed"
                          />
                        </svg>
                      )}

                      {/* Multiplayer Live Cursors (Landbook Style Presence) */}
                      <div className="radar-live-cursor cursor-pos-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M4 4l7 17 2.5-6.5L20 12 4 4z" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                        </svg>
                        <span className="cursor-label">Rahul K. • looking for Biryani</span>
                      </div>

                      <div className="radar-live-cursor cursor-pos-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M4 4l7 17 2.5-6.5L20 12 4 4z" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                        </svg>
                        <span className="cursor-label">Sneha R. • Milk & Bread</span>
                      </div>

                      {/* Live Community Delivery Runner Blip with visual movement */}
                      <div className={`radar-runner-marker ${activeFulfillment === 'runner' ? 'runner-in-motion' : ''}`}>
                        <span className="runner-icon-badge">🛵</span>
                        <div className="runner-floating-tag">
                          <span className="runner-name">Ravi K. (Direct Runner)</span>
                          <span className="runner-dist">
                            {activeFulfillment === 'runner' ? 'Delivering • 180m (ETA 6m)' : 'Available nearby'}
                          </span>
                        </div>
                      </div>

                      {/* Floating Live Fulfillment Status Tag in Radar */}
                      <div className="radar-floating-delivery-tag">
                        <span className="tag-status-light live-green" />
                        <span className="tag-status-text">
                          {activeFulfillment === 'bopis' && '⚡ Order #4812: Packed at Sri Krishna Counter (PIN: 4812) • Ready in 4m'}
                          {activeFulfillment === 'runner' && '🛵 Runner Assigned: 180m away (Direct Store Dispatch) • ETA 6m'}
                          {activeFulfillment === 'handshake' && '🔒 Stock Confirmed: 2-Step Mutual Handshake Locked (Zero Platform Cut)'}
                        </span>
                      </div>

                      {/* Floating Interactive Store Markers */}
                      {filteredStores.map((st) => (
                        <div
                          key={st.id}
                          className={`radar-blip ${selectedStore.id === st.id ? 'radar-blip-active' : ''}`}
                          style={{ top: st.coords.top, left: st.coords.left }}
                          onClick={() => setSelectedStore(st)}
                        >
                          <span className="radar-blip-icon">{st.icon}</span>
                          <span className="radar-blip-name">{st.name.split(' ')[0]}</span>
                          <span className="radar-blip-status" />
                        </div>
                      ))}
                    </div>

                    {/* Segmented Category Filter Tabs */}
                    <div className="radar-segmented-nav">
                      {[
                        { id: 'all', label: 'All Places' },
                        { id: 'kirana', label: 'Groceries' },
                        { id: 'food', label: 'Dining' },
                        { id: 'service', label: 'Services' },
                        { id: 'fashion', label: 'Boutique' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          className={`radar-tab ${activeCategory === c.id ? 'active' : ''}`}
                          onClick={() => {
                            setActiveCategory(c.id);
                            const matching = c.id === 'all'
                              ? RADAR_STORES[0]
                              : RADAR_STORES.find((s) => s.category === c.id) || RADAR_STORES[0];
                            setSelectedStore(matching);
                          }}
                        >
                          <span>{c.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Active Selected Store Card */}
                    <div className="radar-active-card">
                      <div className="radar-card-top">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div className="radar-store-avatar">{selectedStore.icon}</div>
                          <div className="radar-store-info">
                            <div className="radar-store-name">{selectedStore.name}</div>
                            <div className="radar-store-meta">
                              <span className="radar-dist-tag">{selectedStore.distance}</span>
                              <span>•</span>
                              <span>{selectedStore.rating}</span>
                            </div>
                          </div>
                        </div>
                        <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 700, margin: 0, fontSize: 11 }}>
                          {selectedStore.time}
                        </Tag>
                      </div>

                      <div className="radar-card-stock-highlight">
                        <span className="stock-label"><strong>Live Shelf:</strong> {selectedStore.stockHighlight}</span>
                        <span className="stock-price">{selectedStore.price}</span>
                      </div>

                      <div className="radar-card-actions">
                        <Link to={selectedStore.appLink} className="btn-radar-primary">
                          <MessageOutlined />
                          <span>View Stock & Chat Directly</span>
                          <ArrowRightOutlined style={{ fontSize: 12, marginLeft: 'auto' }} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Store Owner Hub Console (Merchant Command Center) */
                  <div className="merchant-command-deck">
                    <div className="merchant-deck-header">
                      <div className="merchant-store-badge">
                        <span className="m-store-avatar">🏪</span>
                        <div>
                          <div className="m-store-name">Sri Murugan Provisions & Mart</div>
                          <div className="m-store-status">● Live Counter Online • 0% Commission Active</div>
                        </div>
                      </div>
                      <Tag color="green" style={{ fontWeight: 800, padding: '2px 8px' }}>
                        Flat ₹199/mo SaaS
                      </Tag>
                    </div>

                    <div className="merchant-metrics-bar">
                      <div className="m-metric-tile">
                        <div className="m-tile-label">Today&apos;s Direct Billing</div>
                        <div className="m-tile-val">₹14,850</div>
                        <div className="m-tile-sub">100% in merchant UPI</div>
                      </div>
                      <div className="m-metric-tile highlight-green">
                        <div className="m-tile-label">Saved From 25% Apps</div>
                        <div className="m-tile-val text-green">+₹3,712</div>
                        <div className="m-tile-sub">Kept in your cash drawer</div>
                      </div>
                    </div>

                    <div className="merchant-live-feed">
                      <div className="feed-title">
                        <NotificationOutlined /> Real-Time Neighborhood Pings
                      </div>
                      <div className="feed-item">
                        <div className="feed-avatar">🛒</div>
                        <div className="feed-info">
                          <div className="feed-name">Priya S. (240m away) • Atta 5kg + Milk</div>
                          <div className="feed-time">₹350 Direct UPI • PIN: 4812</div>
                        </div>
                        <span className="feed-badge-confirmed">Counter Ready ✓</span>
                      </div>
                      <div className="feed-item">
                        <div className="feed-avatar">🍲</div>
                        <div className="feed-info">
                          <div className="feed-name">Karthik R. (380m away) • Dum Biryani Single</div>
                          <div className="feed-time">₹220 • In-Store Chat Negotiation</div>
                        </div>
                        <span className="feed-badge-pending">Packing Now</span>
                      </div>
                    </div>

                    <div className="merchant-action-row">
                      <Link to={Routes.client} className="btn-merchant-deck-action">
                        <span>Open Merchant Terminal & Register (₹0 Fee)</span>
                        <ArrowRightOutlined />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          2. Interactive Counter Price Transparency Scanner (High Creativity)
          ------------------------------------------------------------------ */}
      <section className="landing-scanner-section">
        <div className="landing-container">
          <div className="scanner-header-card">
            <div className="scanner-badge">
              <DollarCircleOutlined /> Direct Hyperlocal Economics
            </div>
            <h2 className="scanner-title">Why Pay 30% App Markups When Your Local Store is 300m Away?</h2>
            <p className="scanner-subtitle">
              Centralized delivery apps secretly inflate physical counter prices and tack on delivery fees, packaging fees, surge charges, and platform cuts.
              Rquest connects you directly with the physical store for genuine counter MRP.
            </p>

            {/* Interactive Item Switcher Tabs */}
            <div className="scanner-tabs-row">
              {PRICE_SCANNER_DATA.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`scanner-tab-pill ${activeScannerItem === item.id ? 'active' : ''}`}
                  onClick={() => setActiveScannerItem(item.id)}
                >
                  {item.tabLabel}
                </button>
              ))}
            </div>

            {/* Interactive Comparison Split Stage */}
            {(() => {
              const cur = PRICE_SCANNER_DATA.find((x) => x.id === activeScannerItem) || PRICE_SCANNER_DATA[0];
              const aggTotal = cur.aggregatorBase + cur.aggregatorDelivery + cur.aggregatorPlatform + cur.aggregatorGst;
              const savings = aggTotal - cur.rquestPrice;
              const pctSaved = Math.round((savings / aggTotal) * 100);

              return (
                <div className="scanner-stage-grid">
                  {/* Left Card: Monopoly Aggregators */}
                  <div className="scanner-card legacy-card">
                    <div className="card-tag tag-legacy">Monopoly Delivery Apps (Swiggy / Zepto / Blinkit)</div>
                    <div className="scanner-item-header">
                      <h3>{cur.name}</h3>
                      <div className="store-origin">{cur.store}</div>
                    </div>

                    <div className="price-breakdown-list">
                      <div className="breakdown-row">
                        <span>Inflated Item Price:</span>
                        <span className="price-val">₹{cur.aggregatorBase}</span>
                      </div>
                      <div className="breakdown-row">
                        <span>Delivery Fleet Fee:</span>
                        <span className="price-val">+₹{cur.aggregatorDelivery}</span>
                      </div>
                      <div className="breakdown-row">
                        <span>Platform & Surge Fee:</span>
                        <span className="price-val">+₹{cur.aggregatorPlatform}</span>
                      </div>
                      {cur.aggregatorGst > 0 && (
                        <div className="breakdown-row">
                          <span>Packaging & GST:</span>
                          <span className="price-val">+₹{cur.aggregatorGst}</span>
                        </div>
                      )}
                    </div>

                    <div className="breakdown-total legacy-total">
                      <span>You Pay on Monopoly Apps:</span>
                      <span className="total-amount">₹{aggTotal}</span>
                    </div>
                  </div>

                  {/* Center Pill: VS Badge & Instant Savings Callout */}
                  <div className="scanner-vs-capsule">
                    <div className="vs-circle">VS</div>
                    <div className="savings-highlight-badge">
                      <span className="save-pct">Save {pctSaved}%</span>
                      <span className="save-diff">₹{savings} in your pocket</span>
                    </div>
                  </div>

                  {/* Right Card: Rquest Direct Operating System */}
                  <div className="scanner-card rquest-direct-card">
                    <div className="card-tag tag-rquest">Rquest 0% Commission Direct System</div>
                    <div className="scanner-item-header">
                      <h3>{cur.name}</h3>
                      <div className="store-origin text-emerald">
                        <EnvironmentOutlined /> {cur.store} ({cur.distance})
                      </div>
                    </div>

                    <div className="price-breakdown-list">
                      <div className="breakdown-row rquest-row">
                        <span>Real Physical Counter MRP:</span>
                        <span className="price-val text-emerald">₹{cur.rquestPrice}</span>
                      </div>
                      <div className="breakdown-row rquest-row">
                        <span>Platform Commission:</span>
                        <span className="price-val text-emerald">₹0 (0% Cut)</span>
                      </div>
                      <div className="breakdown-row rquest-row">
                        <span>Self-Pickup / Neighbor Walk:</span>
                        <span className="price-val text-emerald">₹0 Delivery Fee</span>
                      </div>
                      <div className="breakdown-row rquest-row">
                        <span>Physical Stock Verification:</span>
                        <span className="price-val text-emerald">Included in Live Chat</span>
                      </div>
                    </div>

                    <div className="breakdown-total rquest-total">
                      <div>
                        <span style={{ fontSize: 13, color: '#64748b' }}>Direct Counter Total:</span>
                        <div className="total-amount text-emerald">₹{cur.rquestPrice}</div>
                      </div>
                      <Link to={`${Routes.app}?q=${encodeURIComponent(cur.name.split(' ')[0])}`} className="btn-scanner-order">
                        <span>Order at Counter Price</span>
                        <ArrowRightOutlined />
                      </Link>
                    </div>

                    <div className="scanner-shelf-guarantee">
                      <CheckCircleFilled style={{ color: '#059669' }} />
                      <span>{cur.shelfNote}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          2. Interactive Bento Grid (The Modern Dribbble/Behance Signature)
          ------------------------------------------------------------------ */}
      <section className="landing-bento-section">
        <div className="landing-container">
          <div className="bento-header">
            <span className="section-label-chip">Engineered for Direct Neighborhood Trade</span>
            <h2 className="bento-title">Everything Built Around Pure Hyperlocal Reality</h2>
            <p className="bento-subtitle">
              Unlike centralized delivery monopolies that burn investor millions on bike fleets,
              Rquest is a lightweight software operating system designed for neighborhood survival.
            </p>
          </div>

          <div className="bento-grid">
            {/* Bento Tile 1 (Span 2): The 2-Step Mutual Stock Confirmation Engine */}
            <div className="bento-card bento-card-span-2">
              <div>
                <span className="bento-card-badge badge-green">
                  <CheckCircleFilled /> Zero Refund Friction
                </span>
                <h3 className="bento-card-heading">The 2-Step Mutual Confirmation Protocol</h3>
                <p className="bento-card-desc">
                  Physical shelf inventory in local stores changes every hour. On Rquest, customers are <strong>never charged upfront</strong>.
                  The shopkeeper receives an instant real-time chime, physically checks their shelf, confirms availability, and only then do you pay via direct UPI QR.
                </p>
              </div>

              {/* Standalone Illustrated Handshake & Stock Confirmation */}
              <div className="bento-illustration-wrapper">
                <HandshakePinIllustration />
              </div>

              {/* Visual Protocol Flow */}
              <div className="protocol-steps-grid">
                <div className="protocol-step-card step-01">
                  <div className="protocol-step-num">STEP 01</div>
                  <div className="protocol-step-title">Place Intent Cart</div>
                  <div className="protocol-step-desc">₹0 charged. Sent to nearby merchant screen.</div>
                </div>

                <div className="protocol-step-card step-02">
                  <div className="protocol-step-num">STEP 02</div>
                  <div className="protocol-step-title">Shelf Stock Check</div>
                  <div className="protocol-step-desc">Merchant taps &quot;In Stock&quot; or suggests substitute in chat.</div>
                </div>

                <div className="protocol-step-card step-03">
                  <div className="protocol-step-num">STEP 03</div>
                  <div className="protocol-step-title">Direct UPI &amp; PIN</div>
                  <div className="protocol-step-desc">Pay 100% directly. Counter pickup PIN unlocked!</div>
                </div>
              </div>
            </div>

            {/* Bento Tile 2: Live In-Chat Quote Simulator */}
            <div className="bento-card">
              <div>
                <span className="bento-card-badge badge-blue">
                  <SafetyCertificateOutlined /> Formal Quotes
                </span>
                <h3 className="bento-card-heading">In-Chat Digital Quotes for Technicians</h3>
                <p className="bento-card-desc">
                  High-value services like AC repair, plumbing, and carpentry cannot be standard grocery carts. Technicians issue formal quote cards in chat with a 7-day satisfaction warranty lock.
                </p>
              </div>

              {/* Chat Quote Simulator */}
              <div className="chat-quote-simulator">
                <div className="chat-bubble-user">
                  My 1.5T AC is leaking water. Can you inspect today in Jamalia?
                </div>
                <div className="chat-bubble-merchant">
                  <div>Inspected requirements. Here is the formal quote:</div>
                  <div className="quote-formal-box">
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>Drain Clear + Coil Wash</div>
                    <div className="quote-formal-price">₹450</div>
                    {quoteAccepted ? (
                      <Tag color="success" style={{ marginTop: 6, fontWeight: 700 }}>
                        <CheckOutlined /> 7-Day Warranty Locked
                      </Tag>
                    ) : (
                      <button
                        className="btn-accept-quote"
                        onClick={() => setQuoteAccepted(true)}
                      >
                        Accept Quote & Book
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Tile 3: 2-Way PIN Handshake Verification */}
            <div className="bento-card">
              <div>
                <span className="bento-card-badge badge-purple">
                  <LockOutlined /> Counter & Runner Handshake
                </span>
                <h3 className="bento-card-heading">2-Way PIN Handshake Protocol</h3>
                <p className="bento-card-desc">
                  Eliminates package loss. Counter pickup orders show a 4-digit code. Delivery runner orders require matching shop handover PIN and customer doorstep PIN.
                </p>
              </div>

              {/* PIN UI Demo with Standalone Runner Illustration */}
              <div className="bento-tile-runner-illustration">
                <NeighborhoodRunnerIllustration />
              </div>

              <div className="pin-handshake-box">
                <div className="pin-display-card">
                  <div className="pin-label">Store Counter PIN</div>
                  <div className="pin-code">4812</div>
                  <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ Verified at shop</span>
                </div>
                <div className="pin-display-card">
                  <div className="pin-label">Doorstep PIN</div>
                  <div className="pin-code">9931</div>
                  <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>Customer shares at door</span>
                </div>
              </div>
            </div>

            {/* Bento Tile 4 (Span 2, Dark Theme): Interactive Merchant Profit Calculator */}
            <div className="bento-card bento-card-span-2 bento-card-dark">
              <div>
                <span className="bento-card-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                  <DollarCircleOutlined /> Live Merchant Profit Simulator
                </span>
                <h3 className="bento-card-heading">See How Much You Lose to 25% Commissions</h3>
                <p className="bento-card-desc">
                  Drag the slider below to see how much money traditional aggregators (Swiggy, Zepto, Blinkit) take from your monthly revenue compared to Rquest’s flat ₹199/month SaaS.
                </p>
              </div>

              {/* Standalone Scale Comparison Illustration */}
              <div className="calc-scale-illustration-wrapper">
                <ZeroCommissionScaleIllustration />
              </div>

              {/* Calculator Slider Controller */}
              <div className="calc-slider-box">
                <div className="calc-slider-header">
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1' }}>Your Monthly Store Billing:</span>
                  <span className="calc-revenue-amount">₹{monthlyRevenue.toLocaleString('en-IN')}</span>
                </div>
                <input
                  type="range"
                  min="25000"
                  max="500000"
                  step="5000"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                  className="custom-range-slider"
                />

                <div className="calc-results-grid">
                  <div className="calc-result-tile">
                    <div className="calc-tile-title">Legacy Apps Take (25% Commission):</div>
                    <div className="calc-tile-loss">-₹{legacyCommission.toLocaleString('en-IN')}/mo</div>
                    <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Deducted before payouts</div>
                  </div>

                  <div className="calc-result-tile" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                    <div className="calc-tile-title" style={{ color: '#34d399' }}>Your Extra Profit on Rquest:</div>
                    <div className="calc-tile-savings">+₹{netSavings.toLocaleString('en-IN')}/mo</div>
                    <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>100% kept in your bank account</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <Link
                    to={Routes.client}
                    style={{
                      background: '#10b981',
                      color: '#090d16',
                      fontWeight: 800,
                      padding: '10px 20px',
                      borderRadius: 10,
                      textDecoration: 'none',
                      fontSize: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>Register My Shop with 0% Commission</span>
                    <ArrowRightOutlined />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          3. Curated Visual Category Gallery (Tactile Dribbble Style)
          ------------------------------------------------------------------ */}
      <section className="landing-categories-section">
        <div className="landing-container">
          <div className="bento-header">
            <span className="section-label-chip">Neighborhood Proximity Catalog</span>
            <h2 className="bento-title">Browse Real Local Businesses Near You</h2>
            <p className="bento-subtitle">
              Click any category to jump into the live marketplace radar and find physical outlets within walking distance.
            </p>
          </div>

          <div className="cat-gallery-grid">
            {CATEGORIES_GALLERY.map((cat) => (
              <Link
                key={cat.id}
                to={`${Routes.app}?category=${encodeURIComponent(cat.id)}`}
                className="cat-gallery-card"
              >
                <div className="cat-image-container">
                  <img src={cat.image} alt={cat.name} />
                  <span className="cat-distance-badge">
                    <EnvironmentOutlined /> {cat.distanceBadge}
                  </span>
                </div>
                <div className="cat-body">
                  <div>
                    <div className="cat-title-row">
                      <span style={{ fontSize: 20 }}>{cat.icon}</span>
                      <h3 className="cat-title">{cat.name}</h3>
                    </div>
                    <p className="cat-desc">{cat.desc}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{cat.count}</span>
                    <span className="cat-action-link">
                      <span>Explore now</span>
                      <ArrowRightOutlined />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          4. Side-by-Side Comparison Matrix
          ------------------------------------------------------------------ */}
      <section className="landing-comparison-section">
        <div className="landing-container">
          <div className="bento-header">
            <span className="section-label-chip">Economic Clarity</span>
            <h2 className="bento-title">The Rquest Difference vs. Monopoly Aggregators</h2>
            <p className="bento-subtitle">
              How our Zero-Fleet model saves local retail and gives neighbors true counter prices.
            </p>
          </div>

          <div className="comp-matrix-card">
            {/* Desktop Table View (Retained 100% for Large Screens) */}
            <div className="desktop-only-matrix">
              <div className="comp-matrix-scroll-wrapper">
                <table className="comp-matrix-table">
                  <thead>
                    <tr>
                      <th className="th-feature">Feature / Architecture</th>
                      <th className="th-legacy">Monopoly Aggregators (Swiggy, Zepto, Blinkit)</th>
                      <th className="th-rquest">Rquest Direct Operating System</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_FEATURES.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.title}</strong>
                        </td>
                        <td className="td-legacy">❌ {item.legacy.headline}</td>
                        <td className="td-rquest">✅ {item.rquest.headline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dedicated Native Mobile Comparison Component (No Awkward Table Scrolling) */}
            <div className="mobile-only-matrix">
              <div className="mobile-comp-filter-tabs">
                <button
                  type="button"
                  className={`mobile-comp-tab ${comparisonFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setComparisonFilter('all')}
                >
                  <span>🌟 All Features (6)</span>
                </button>
                <button
                  type="button"
                  className={`mobile-comp-tab ${comparisonFilter === 'top' ? 'active' : ''}`}
                  onClick={() => setComparisonFilter('top')}
                >
                  <span>⚡ Top 3 Savings</span>
                </button>
              </div>

              <div className="mobile-comp-cards-list">
                {COMPARISON_FEATURES.filter((f) => comparisonFilter === 'all' || f.isTop).map((item) => (
                  <div key={item.id} className="mobile-comp-card">
                    <div className="mobile-comp-card-head">
                      <div className="mobile-comp-title-group">
                        <span className="mobile-comp-icon">{item.icon}</span>
                        <span className="mobile-comp-title">{item.title}</span>
                      </div>
                      <span className="mobile-comp-badge">{item.badge}</span>
                    </div>

                    <div className="mobile-comp-duo-grid">
                      {/* Rquest Advantage Block */}
                      <div className="comp-duo-side rquest-side">
                        <div className="duo-side-badge win">
                          <span>✓ Rquest Direct</span>
                        </div>
                        <div className="duo-side-headline">{item.rquest.headline}</div>
                        <div className="duo-side-detail">{item.rquest.detail}</div>
                      </div>

                      {/* Monopoly Apps Penalty Block */}
                      <div className="comp-duo-side legacy-side">
                        <div className="duo-side-badge loss">
                          <span>✕ Monopoly Apps</span>
                        </div>
                        <div className="duo-side-headline">{item.legacy.headline}</div>
                        <div className="duo-side-detail">{item.legacy.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          5. Real Merchant & Customer Voices
          ------------------------------------------------------------------ */}
      <section className="landing-testimonials-section">
        <div className="landing-container">
          <div className="bento-header">
            <span className="section-label-chip">Neighborhood Proof</span>
            <h2 className="bento-title">Stories from Physical Store Owners</h2>
            <p className="bento-subtitle">
              Real retailers and neighbors saving money and building community ties every day.
            </p>
          </div>

          <div className="testi-grid">
            <div className="testi-card">
              <div>
                <div className="testi-stars">★★★★★</div>
                <p className="testi-quote">
                  &ldquo;On other delivery apps, I was losing ₹22,000 every single month in commissions. On Rquest, I pay just ₹199/month and my regular neighborhood customers order and chat with me directly.&rdquo;
                </p>
              </div>
              <div className="testi-profile">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
                  alt="Murugan K."
                  className="testi-avatar"
                />
                <div>
                  <div className="testi-author-name">Murugan K.</div>
                  <div className="testi-author-store">Owner, Sri Murugan Groceries & Dairy</div>
                </div>
              </div>
            </div>

            <div className="testi-card">
              <div>
                <div className="testi-stars">★★★★★</div>
                <p className="testi-quote">
                  &ldquo;Being able to confirm my biryani batch is ready over chat and picking it up with my 4-digit PIN takes literally 45 seconds at the counter. No delivery fees, no marked-up food prices!&rdquo;
                </p>
              </div>
              <div className="testi-profile">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80"
                  alt="Sneha Raman"
                  className="testi-avatar"
                />
                <div>
                  <div className="testi-author-name">Sneha Raman</div>
                  <div className="testi-author-store">Resident & Food Customer</div>
                </div>
              </div>
            </div>

            <div className="testi-card">
              <div>
                <div className="testi-stars">★★★★★</div>
                <p className="testi-quote">
                  &ldquo;The in-chat quote cards make booking AC servicing super easy. Customers send pictures of the leak, I issue a formal ₹450 quote card, they accept, and I visit. Super clean and professional.&rdquo;
                </p>
              </div>
              <div className="testi-profile">
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80"
                  alt="Karthik S."
                  className="testi-avatar"
                />
                <div>
                  <div className="testi-author-name">Karthik S.</div>
                  <div className="testi-author-store">Certified Electrical & AC Technician</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Topographic Smooth SVG Wave Divider */}
      <SectionWaveDivider />

      {/* ------------------------------------------------------------------
          6. High-Impact Obsidian Dark Universe (Terminal CTA + Footer)
          ------------------------------------------------------------------ */}
      <div className="landing-dark-universe">
        <div className="dark-universe-ambient-glow" />

        {/* Real-time Order Delivery & Fulfillment Status Ribbon */}
        <div className="landing-container">
          <div className="dark-fulfillment-ribbon">
            <div className="dark-status-tag">
              <span className="dark-status-dot pulse-green" />
              <div className="dark-status-text">
                <span className="dark-status-label">Fulfillment 01</span>
                <span className="dark-status-val">⚡ Express BOPIS: Ready in 4m • PIN 4812 Handshake</span>
              </div>
            </div>

            <div className="dark-status-tag">
              <span className="dark-status-dot pulse-blue" />
              <div className="dark-status-text">
                <span className="dark-status-label">Fulfillment 02</span>
                <span className="dark-status-val">🛵 Store Delivery Staff: 180m away • Direct 500m Drop</span>
              </div>
            </div>

            <div className="dark-status-tag">
              <span className="dark-status-dot pulse-purple" />
              <div className="dark-status-text">
                <span className="dark-status-label">Fulfillment 03</span>
                <span className="dark-status-val">🤝 Open Runner Pool: Peer-to-Peer Neighborhood Delivery</span>
              </div>
            </div>

            <div className="dark-status-tag">
              <span className="dark-status-dot pulse-amber" />
              <div className="dark-status-text">
                <span className="dark-status-label">Economics</span>
                <span className="dark-status-val">🔒 0% App Markups • 100% Shelf MRP Guaranteed</span>
              </div>
            </div>
          </div>
        </div>

        {/* High-Impact Terminal CTA Card */}
        <section className="landing-container">
          <div className="landing-cta-terminal-dark">
            <div className="cta-terminal-glow" />
            
            <div className="cta-pill-badge">
              <span className="cta-beacon" />
              <span>Zero-Fleet Architecture • 0% Merchant Commission • Direct UPI Settlement</span>
            </div>

            <h2 className="cta-terminal-title">Join the Open Hyperlocal Operating System</h2>
            <p className="cta-terminal-desc">
              Whether you are a customer shopping for groceries, a merchant protecting your margin, or a technician seeking nearby jobs — Rquest connects you directly without predatory commissions.
            </p>

            <div className="cta-terminal-actions">
              <Link to={Routes.app} className="cta-btn-primary">
                <EnvironmentOutlined style={{ color: '#4f46e5' }} />
                <span>Launch Marketplace App</span>
              </Link>

              <Link to={Routes.client} className="cta-btn-secondary">
                <ShopOutlined />
                <span>Register Your Storefront (0% Fee)</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Obsidian Black Modern Footer */}
        <footer className="landing-footer-dark">
          <div className="landing-container">
            <div className="footer-columns">
              <div>
                <div className="footer-brand-title">
                  <div className="footer-logo-badge">R</div>
                  <span>Rquest</span>
                </div>
                <p className="footer-brand-desc">
                  Connect Everywhere, Everything. The open zero-fleet hyperlocal operating system empowering direct commerce between neighborhood retailers and local consumers.
                </p>

                <div className="footer-security-chips">
                  <span className="security-chip">🛡️ 0% Commission Verified</span>
                  <span className="security-chip">⚡ 4-Digit PIN Handshake</span>
                  <span className="security-chip">💳 Direct Merchant UPI QR</span>
                </div>
              </div>

              <div>
                <div className="footer-col-header">Marketplace</div>
                <ul className="footer-link-list">
                  <li><Link to={Routes.app}>Explore All Stores</Link></li>
                  <li><Link to={`${Routes.app}?category=Provision+Store`}>Groceries & Marts</Link></li>
                  <li><Link to={`${Routes.app}?category=Restaurants`}>Hot Food & Dining</Link></li>
                  <li><Link to={`${Routes.app}?category=Technicians`}>Services & Repairs</Link></li>
                  <li><Link to={`${Routes.app}?category=Dress+Shop`}>Fashion & Boutiques</Link></li>
                </ul>
              </div>

              <div>
                <div className="footer-col-header">For Merchants</div>
                <ul className="footer-link-list">
                  <li><Link to={Routes.client}>Register Storefront (₹0)</Link></li>
                  <li><Link to={Routes.client}>Manage Outlets & Catalog</Link></li>
                  <li><Link to={Routes.login}>Merchant Command Center</Link></li>
                  <li><a href="/landing.html">Static SEO Portal</a></li>
                </ul>
              </div>

              <div>
                <div className="footer-col-header">Account & Fulfillment</div>
                <ul className="footer-link-list">
                  <li><Link to={Routes.profile}>My Account Profile</Link></li>
                  <li><Link to={Routes.orders}>Order Delivery Tracking</Link></li>
                  <li><Link to={Routes.register}>Create Shopper Account</Link></li>
                  <li><Link to={Routes.login}>Sign In</Link></li>
                </ul>
              </div>
            </div>

            <div className="footer-bottom-bar">
              <div>© {new Date().getFullYear()} Rquest Technologies. Zero-Fleet Hyperlocal OS. All rights reserved.</div>
              <div className="footer-bottom-links">
                <span>Privacy Policy</span>
                <span>•</span>
                <span>Terms of Service</span>
                <span>•</span>
                <a href="/landing.html" className="footer-seo-link">SEO Portal</a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* ------------------------------------------------------------------
          7. Interactive Live Order Request & Delivery Track Island + Chat
          ------------------------------------------------------------------ */}
      {!chatDismissed && (
        <div
          className={`rquest-app-chat-overlay ${chatMinimized ? 'minimized' : ''} ${hudAutoEntered ? 'hud-auto-entered' : ''}`}
          style={{
            transform: `translate3d(0, ${Math.sin((scrollProgress || 0) * 0.12) * 6}px, 0)`,
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {chatMinimized ? (
            <div className="rquest-chat-minimized-capsule" onClick={() => setChatMinimized(false)}>
              <div className="mini-avatar">
                <span>SK</span>
                <span className="mini-badge-count">1</span>
              </div>
              <div className="mini-content">
                <div className="mini-name">Sri Krishna Provisions &amp; Dairy</div>
                <div className="mini-preview">
                  {deliveryStep === 3
                    ? '🛵 Runner Ravi is 180m away (ETA 4m)'
                    : deliveryStep === 4
                    ? '🔒 Counter PIN 4812 Verified'
                    : chatMessages[chatMessages.length - 1]?.text || '"Atta & Milk ready at counter! PIN 4812"'}
                </div>
              </div>
              <button
                type="button"
                className="mini-open-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setChatMinimized(false);
                }}
              >
                <span>Track &amp; Reply</span>
                <ArrowRightOutlined style={{ fontSize: 10 }} />
              </button>
              <div className="mobile-capsule-swipe-hint">
                <span>↑ Tap or swipe up</span>
              </div>
            </div>
          ) : (
            <div className="rquest-floating-hud-wrapper">
              {/* Mobile Drag Header Pill & Swipe Instructions */}
              <div
                className="mobile-hud-drag-header"
                onClick={() => setChatMinimized(true)}
                title="Tap or swipe down to minimize"
              >
                <div className="mobile-drag-pill-bar" />
                <div className="mobile-swipe-instruction">
                  <span>↔ Swipe sideways for Track/Chat • Swipe down to minimize</span>
                </div>
              </div>

              {/* Mobile View Switcher: [ 🛵 Order Track ] | [ 💬 Store Chat ] */}
              <div className="mobile-hud-view-switcher">
                <button
                  type="button"
                  className={`mobile-hud-view-btn ${mobileHudTab === 'tracker' ? 'active' : ''}`}
                  onClick={() => setMobileHudTab('tracker')}
                >
                  <span>🛵 Order #RQ-4812 Track</span>
                  <span className="mobile-tab-sub-pill">ETA 4m</span>
                </button>
                <button
                  type="button"
                  className={`mobile-hud-view-btn ${mobileHudTab === 'chat' ? 'active' : ''}`}
                  onClick={() => setMobileHudTab('chat')}
                >
                  <span>💬 Store Chat</span>
                  <span className="mobile-tab-unread-dot">1</span>
                </button>
              </div>

              {/* FLOATING ORDER REQUEST & DELIVERY TRACK ISLAND (ABOVE CHAT) */}
              <div className={`floating-order-tracker-island mobile-tab-view-${mobileHudTab}`}>
                <div className="tracker-island-head">
                  <div className="tracker-head-left">
                    <span className="tracker-live-pulse-dot" />
                    <span className="tracker-order-id">Order Request #RQ-4812</span>
                    <span className={`tracker-mode-badge step-${deliveryStep}`}>
                      {deliveryStep === 1 && '📝 Placed'}
                      {deliveryStep === 2 && '✓ Shelf Verified'}
                      {deliveryStep === 3 && '🛵 Runner En-Route'}
                      {deliveryStep === 4 && '🔒 Handshake Ready'}
                    </span>
                  </div>
                  <div className="tracker-head-right">
                    <span className="tracker-eta-ticker">
                      {deliveryStep === 4 ? 'Delivered' : 'ETA 4m'}
                    </span>
                    <button
                      type="button"
                      className="tracker-collapse-toggle"
                      onClick={() => setTrackerCollapsed(!trackerCollapsed)}
                      title={trackerCollapsed ? 'Expand Delivery Track' : 'Collapse Delivery Track'}
                    >
                      {trackerCollapsed ? <DownOutlined /> : <UpOutlined />}
                    </button>
                  </div>
                </div>

                {!trackerCollapsed && (
                  <div className="tracker-island-body">
                    {/* Interactive 4-Step Progress Bar */}
                    <div className="tracker-steps-line">
                      <div className="tracker-line-bg" />
                      <div
                        className="tracker-line-fill"
                        style={{ width: `${((deliveryStep - 1) / 3) * 100}%` }}
                      />
                      {DELIVERY_TRACK_STAGES.map((st) => (
                        <div
                          key={st.step}
                          className={`tracker-step-node ${deliveryStep >= st.step ? 'completed' : ''} ${deliveryStep === st.step ? 'active' : ''}`}
                          onClick={() => handleSelectDeliveryStep(st.step)}
                          title={st.desc}
                        >
                          <div className="step-circle">{deliveryStep > st.step ? '✓' : st.icon}</div>
                          <span className="step-title">{st.title}</span>
                          <span className="step-sub">{st.sub}</span>
                        </div>
                      ))}
                    </div>

                    {/* Live Runner & Handshake Status Strip */}
                    <div className="tracker-runner-strip">
                      <div className="runner-strip-left">
                        <span className="runner-avatar-icon">
                          {deliveryStep === 4 ? '🔒' : '🛵'}
                        </span>
                        <div className="runner-strip-text">
                          <div className="runner-strip-title">
                            {deliveryStep === 4
                              ? 'Counter Handshake Complete'
                              : deliveryStep === 3
                              ? 'Ravi K. (Direct Store Runner)'
                              : 'Express Counter BOPIS'}
                          </div>
                          <div className="runner-strip-sub">
                            {deliveryStep === 4
                              ? 'Instant UPI Soundbox Chime: ₹240 received'
                              : deliveryStep === 3
                              ? '180m away • Live GPS Tracking'
                              : 'Sri Krishna Provisions • 240m away'}
                          </div>
                        </div>
                      </div>
                      <div className="runner-strip-right">
                        <span className="pin-pill-label">Mutual PIN:</span>
                        <span className="pin-pill-val">4812</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* REDESIGNED IN-APP CHAT WINDOW */}
              <div className={`rquest-app-chat-window mobile-tab-view-${mobileHudTab}`}>
                {/* Conversation Header */}
                <div className="rquest-chat-header-match">
                  <div className="rquest-header-partner-info">
                    <div className="rquest-avatar-circle">
                      <span>SK</span>
                      <span className="rquest-avatar-status-dot available" />
                    </div>
                    <div className="rquest-header-title-block">
                      <div className="rquest-header-partner-name">
                        <span>Sri Krishna Provisions</span>
                        <span className="rquest-verified-inline-badge">✓</span>
                      </div>
                      <div className="rquest-header-meta-row">
                        <span className="rquest-header-store-badge">
                          <ShopOutlined style={{ fontSize: 10 }} />
                          <span>Kirana &amp; Dairy • 240m</span>
                        </span>
                        <span className="rquest-header-online-text">● Active Now</span>
                      </div>
                    </div>
                  </div>

                  <div className="rquest-header-action-group">
                    <Tooltip title="Direct Audio Call with Store Manager">
                      <button
                        type="button"
                        className="rquest-header-btn"
                        onClick={() => alert('Initiating direct secure audio call with Murugan (Sri Krishna Provisions)...')}
                        title="Audio Call"
                      >
                        <PhoneOutlined />
                      </button>
                    </Tooltip>
                    <button
                      type="button"
                      className="rquest-header-btn"
                      title="Minimize"
                      onClick={() => setChatMinimized(true)}
                    >
                      <MinusOutlined />
                    </button>
                    <button
                      type="button"
                      className="rquest-header-btn rquest-header-close-btn"
                      title="Close"
                      onClick={() => setChatDismissed(true)}
                    >
                      <CloseOutlined />
                    </button>
                  </div>
                </div>

                {/* Message List */}
                <div className="rquest-chat-messages-container" ref={chatScrollRef}>
                  <div className="rquest-msg-separator">
                    <span>Today • Direct Counter Negotiation</span>
                  </div>

                  {chatMessages.map((msg) => {
                    const isOutgoing = msg.sender === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`rquest-message-row ${isOutgoing ? 'outgoing' : 'incoming'} animate-fade-in`}
                      >
                        <div className={`rquest-message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                          {!isOutgoing && (
                            <div className="rquest-bubble-author">
                              <span className="author-shop-icon">🏪</span>
                              <span>{msg.author}</span>
                            </div>
                          )}
                          <div className="rquest-bubble-text">{msg.text}</div>

                          {/* In-Store Order Handshake Card */}
                          {msg.orderAttachment && (
                            <div className="rquest-chat-order-card">
                              <div className="rquest-order-card-head">
                                <div className="order-id-group">
                                  <span className="rquest-order-icon">📦</span>
                                  <span className="rquest-order-id">Order #{msg.orderAttachment.orderId}</span>
                                </div>
                                <span className="rquest-stock-verified-tag">✓ Shelf Stock Verified</span>
                              </div>

                              <div className="rquest-order-items-snippet">
                                <div className="order-item-bullet">• 1x Whole Wheat Atta 5kg — ₹190</div>
                                <div className="order-item-bullet">• 2x Aavin Fresh Milk 1L — ₹50</div>
                              </div>

                              <div className="rquest-order-card-foot">
                                <div className="rquest-pin-handshake-box">
                                  <span className="pin-label">⚡ Counter Handshake PIN:</span>
                                  <div className="pin-boxes-row">
                                    <span className="pin-box-char">4</span>
                                    <span className="pin-box-char">8</span>
                                    <span className="pin-box-char">1</span>
                                    <span className="pin-box-char">2</span>
                                  </div>
                                </div>
                                <div className="rquest-savings-callout">
                                  🎉 Saved ₹70 vs 25% apps
                                </div>
                              </div>
                            </div>
                          )}

                          <div className={`rquest-msg-meta ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                            <span>{msg.time}</span>
                            {isOutgoing && (
                              <span className="read-ticks" title="Seen by Sri Krishna">
                                ✓✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Real-time typing indicator */}
                  {isStoreTyping && (
                    <div className="rquest-typing-indicator-row animate-fade-in">
                      <div className="typing-avatar-mini">SK</div>
                      <div className="typing-bubble">
                        <span className="typing-label">Sri Krishna is typing</span>
                        <span className="typing-dots">
                          <span />
                          <span />
                          <span />
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Reply Chips (With Hidden Scrollbar) */}
                <div className="rquest-quick-replies-wrapper">
                  <div className="rquest-quick-replies-row">
                    <button
                      type="button"
                      className="rquest-quick-chip"
                      onClick={() => handleSendChatMessage('On my way! Reaching in 4 mins 🏃')}
                    >
                      🏃 On my way (4m)
                    </button>
                    <button
                      type="button"
                      className="rquest-quick-chip"
                      onClick={() => handleSendChatMessage('Counter PIN is 4812 🔒')}
                    >
                      🔒 Counter PIN 4812
                    </button>
                    <button
                      type="button"
                      className="rquest-quick-chip"
                      onClick={() => handleSendChatMessage('Sending neighborhood runner 🛵')}
                    >
                      🛵 Sending Runner
                    </button>
                    <button
                      type="button"
                      className="rquest-quick-chip"
                      onClick={() => handleSendChatMessage('Please keep 1 fresh curd packet (₹30) also 🥛')}
                    >
                      🥛 Add 1 Curd packet?
                    </button>
                  </div>
                </div>

                {/* In-App Chat Composer */}
                <div className="rquest-chat-composer-match">
                  <input
                    type="text"
                    className="rquest-chat-input-field"
                    placeholder="Type a message to Sri Krishna... (Press Enter)"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage(chatInputText);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={`rquest-chat-send-btn ${chatInputText.trim() ? 'active' : ''}`}
                    disabled={!chatInputText.trim()}
                    onClick={() => handleSendChatMessage(chatInputText)}
                    title="Send Message"
                  >
                    <SendOutlined />
                  </button>
                </div>

                {/* Footer App Switcher */}
                <div className="rquest-chat-footer-action">
                  <Link to={Routes.app} className="btn-chat-app-link">
                    <span>Launch Full In-App Chat in Marketplace</span>
                    <ArrowRightOutlined style={{ fontSize: 11 }} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
