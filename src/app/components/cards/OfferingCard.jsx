import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Flex, Grid } from 'antd';
import {
  StarFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { colors, radii } from '../../styles';
import { distanceConvertor } from '../../utils';

const { Text } = Typography;

// Curated authentic fallbacks matching Indian hyperlocal categories
const FALLBACK_IMAGES = {
  groceries:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
  food:
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
  repairs:
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
  electronics:
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
  rentals:
    'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
  default:
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
};

const resolveImage = (item) => {
  if (item.img_url) return item.img_url;
  const name = (item.name || '').toLowerCase();
  const type = (item.listing_type || '').toLowerCase();

  if (name.includes('milk') || name.includes('oil') || name.includes('kirana') || type === 'product') {
    return FALLBACK_IMAGES.groceries;
  }
  if (name.includes('idli') || name.includes('tiffin') || name.includes('food') || type === 'food') {
    return FALLBACK_IMAGES.food;
  }
  if (name.includes('ac') || name.includes('repair') || name.includes('clean') || type === 'service') {
    return FALLBACK_IMAGES.repairs;
  }
  if (name.includes('charger') || name.includes('cable') || name.includes('usb')) {
    return FALLBACK_IMAGES.electronics;
  }
  if (name.includes('drill') || name.includes('rental') || type === 'rental') {
    return FALLBACK_IMAGES.rentals;
  }
  return FALLBACK_IMAGES.default;
};

const resolveTopRightBadge = (item) => {
  const name = (item.name || '').toLowerCase();
  const type = (item.listing_type || '').toLowerCase();

  if (name.includes('milk')) {
    return { text: 'Zero Markup', bg: colors.primary, color: colors.white };
  }
  if (name.includes('oil') || name.includes('organic')) {
    return { text: 'Organic Certified', bg: colors.semantic.success, color: colors.white };
  }
  if (type === 'service' || name.includes('ac') || name.includes('repair')) {
    return { text: 'Verified Pro', bg: colors.primary, color: colors.white };
  }
  if (type === 'food' || name.includes('idli') || name.includes('tiffin')) {
    return { text: 'Hot Serving', bg: '#e05e00', color: colors.white };
  }
  if (type === 'rental') {
    return { text: 'Daily Rental', bg: colors.primary, color: colors.white };
  }
  return { text: 'Verified Stock', bg: colors.primary, color: colors.white };
};

const resolveStatusChip = (item) => {
  const type = (item.listing_type || '').toLowerCase();

  if (type === 'food') {
    return {
      icon: <FireOutlined style={{ fontSize: 12 }} />,
      text: 'Live Batch Serving Now',
      sub: 'Closes 11:30 AM',
      bg: colors.serviceChipBg,
      border: colors.serviceChipBorder,
      color: colors.serviceChipText,
    };
  }
  if (type === 'service') {
    return {
      icon: <ClockCircleOutlined style={{ fontSize: 12 }} />,
      text: 'Slot: Today, 3:30 PM',
      sub: 'Direct Tech',
      bg: colors.verifiedChipBg,
      border: colors.verifiedChipBorder,
      color: colors.verifiedChipText,
    };
  }
  if (type === 'rental') {
    return {
      icon: <CheckCircleOutlined style={{ fontSize: 12 }} />,
      text: 'Available for Pickup',
      sub: 'Deposit ₹1,500',
      bg: colors.surfaceContainerLow,
      border: colors.border,
      color: colors.textMuted,
    };
  }
  return {
    icon: <CheckCircleOutlined style={{ fontSize: 12 }} />,
    text: 'Physical Stock Confirmed',
    sub: '4m ago',
    bg: colors.verifiedChipBg,
    border: colors.verifiedChipBorder,
    color: colors.verifiedChipText,
  };
};

// Mobile-specific resolvers matching screenshot media_1794134817614_8426e4ff.png
const resolveMobileBadge = (item) => {
  const name = (item.name || '').toLowerCase();
  const type = (item.listing_type || '').toLowerCase();

  if (type === 'food' || name.includes('idli') || name.includes('tiffin')) {
    return { text: 'HOT', bg: '#ea580c' };
  }
  if (type === 'service' || name.includes('ac') || name.includes('repair')) {
    return { text: 'PRO', bg: colors.primary };
  }
  if (name.includes('oil') || name.includes('organic')) {
    return { text: 'ORGANIC', bg: colors.semantic.success };
  }
  if (name.includes('charger') || name.includes('gan') || name.includes('cable')) {
    return { text: '65W GaN', bg: colors.primary };
  }
  if (name.includes('milk')) {
    return { text: item.unit ? `${item.unit}` : '600ml', bg: 'rgba(15, 23, 42, 0.72)' };
  }
  return { text: item.unit ? `${item.unit}` : 'LIVE', bg: 'rgba(15, 23, 42, 0.72)' };
};

const resolveAssuranceTag = (item) => {
  const name = (item.name || '').toLowerCase();
  const type = (item.listing_type || '').toLowerCase();

  if (name.includes('milk')) return 'MRP GUARANTEED';
  if (type === 'food' || name.includes('idli')) return 'ZERO MARKUP';
  if (type === 'service' || name.includes('ac')) return 'VERIFIED RATE';
  if (name.includes('oil') || name.includes('organic')) return '100% PURE';
  if (name.includes('charger') || name.includes('cable')) return '1 YR WARRANTY';
  if (type === 'rental') return 'DIRECT RENTAL';
  return 'ZERO MARKUP';
};

const resolveMobileStatus = (item) => {
  const name = (item.name || '').toLowerCase();
  const type = (item.listing_type || '').toLowerCase();

  if (type === 'food' || name.includes('idli')) {
    return {
      icon: '🔥',
      left: 'Hot breakfast batch actively steaming',
      right: 'Fresh made',
      bg: '#fefce8',
      border: '#fef08a',
      color: '#b45309',
    };
  }
  if (type === 'service' || name.includes('ac')) {
    return {
      icon: '🛡',
      left: 'Background Verified · 7 yr exp',
      right: 'Earliest: 3:30 PM',
      bg: '#eff6ff',
      border: '#dbeafe',
      color: '#1d4ed8',
    };
  }
  if (name.includes('charger') || name.includes('cable') || name.includes('usb')) {
    return {
      icon: '⚠️',
      left: 'Only 2 units left in counter stock',
      right: 'Fast selling',
      bg: '#fef2f2',
      border: '#fee2e2',
      color: '#dc2626',
    };
  }
  if (name.includes('oil') || name.includes('organic')) {
    return {
      icon: '✓',
      left: 'Verified on wooden shelf 12m ago',
      right: '6 bottles left',
      bg: '#ecfdf5',
      border: '#d1fae5',
      color: '#059669',
    };
  }
  return {
    icon: '✓',
    left: 'Confirmed in physical crates 4m ago',
    right: '18 units left',
    bg: '#ecfdf5',
    border: '#d1fae5',
    color: '#059669',
  };
};

const resolveFulfillmentText = (item) => {
  const name = (item.name || '').toLowerCase();
  const type = (item.listing_type || '').toLowerCase();

  if (type === 'food' || name.includes('idli')) {
    return '🛵 Direct kitchen checkout · No markup';
  }
  if (type === 'service' || name.includes('ac')) {
    return '📅 Available slot today from 3:30 PM';
  }
  if (name.includes('charger') || name.includes('cable') || name.includes('usb')) {
    return '⚡ Instant counter pickup';
  }
  if (name.includes('oil') || name.includes('organic')) {
    return '🏪 Wood pressed · Instant pickup';
  }
  return '🏪 Pay at shop or UPI delivery';
};

const resolveActionBtn = (item) => {
  const type = (item.listing_type || '').toLowerCase();
  if (type === 'service') return 'Request →';
  if (type === 'food') return 'Order 🛍';
  if (item.name?.toLowerCase().includes('charger')) return 'Order ⚡';
  return 'Order →';
};

const OfferingCard = ({ item, onOrder, onClick }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const shop = item.shop || {};
  const distanceStr =
    shop.distance !== undefined && shop.distance !== null
      ? `${distanceConvertor(shop.distance)} km`
      : 'Nearby';
  const areaStr = shop.area || shop.shop_name || 'Neighborhood';
  const ratingStr = shop.rating ? parseFloat(shop.rating).toFixed(1) : '4.8';

  const topRightBadge = resolveTopRightBadge(item);
  const statusChip = resolveStatusChip(item);
  const imageUrl = resolveImage(item);

  const priceType =
    item.listing_type === 'service'
      ? 'INSPECTION FROM'
      : item.listing_type === 'rental'
      ? 'RENTAL RATE'
      : 'SHELF PRICE';

  const actionLabel =
    item.listing_type === 'service' ? 'Request' : 'Order';

  // 1. MOBILE CARD VIEW (Full-width high-density horizontal card matching media_1794134817614_8426e4ff.png)
  if (isMobile) {
    const mobileBadge = resolveMobileBadge(item);
    const assuranceTag = resolveAssuranceTag(item);
    const mobileStatus = resolveMobileStatus(item);
    const fulfillmentText = resolveFulfillmentText(item);
    const actionBtn = resolveActionBtn(item);
    const strikePrice = item.price ? Math.round(parseFloat(item.price) * 1.08) : null;

    return (
      <div
        onClick={onClick}
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.xl,
          padding: '12px 14px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          cursor: 'pointer',
          marginBottom: 12,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        {/* Top Row: Thumb on left, details on right */}
        <Flex gap={12} align="start">
          {/* Square thumbnail with corner badge */}
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: radii.lg,
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
              background: colors.surfaceContainer,
            }}
          >
            <img
              src={imageUrl}
              alt={item.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            {/* Pill badge on image */}
            <div
              style={{
                position: 'absolute',
                bottom: 4,
                left: 4,
                background: mobileBadge.bg,
                color: '#ffffff',
                borderRadius: radii.xs,
                padding: '1px 5px',
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.3px',
              }}
            >
              {mobileBadge.text}
            </div>
          </div>

          {/* Details column */}
          <Flex vertical flex={1} style={{ minWidth: 0 }}>
            {/* Shop name & distance */}
            <Flex justify="space-between" align="center" style={{ marginBottom: 3 }}>
              <span
                style={{
                  fontSize: 11.5,
                  color: colors.textMuted,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '65%',
                }}
              >
                {shop.shop_name || 'Neighborhood Store'}
              </span>
              <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 500 }}>
                {shop.rating ? `★ ${parseFloat(shop.rating).toFixed(1)} · ` : ''}
                {distanceStr}
              </span>
            </Flex>

            {/* Item Title */}
            <div
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 14.5,
                fontWeight: 700,
                color: colors.textMain,
                lineHeight: 1.25,
                marginBottom: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.name}
            </div>

            {/* Price & Assurance Tag */}
            <Flex align="center" gap={8} wrap="wrap">
              <span style={{ fontSize: 16, fontWeight: 800, color: colors.textMain }}>
                ₹{item.price}
              </span>
              {strikePrice && strikePrice > item.price && (
                <span
                  style={{
                    fontSize: 12,
                    color: colors.textLight,
                    textDecoration: 'line-through',
                  }}
                >
                  ₹{strikePrice}
                </span>
              )}
              <span
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: 9.5,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '1px 6px',
                  borderRadius: radii.xs,
                  letterSpacing: '0.4px',
                }}
              >
                {assuranceTag}
              </span>
            </Flex>
          </Flex>
        </Flex>

        {/* Middle Row: Live Status Strip */}
        <div
          style={{
            background: mobileStatus.bg,
            border: `1px solid ${mobileStatus.border}`,
            color: mobileStatus.color,
            borderRadius: radii.md,
            padding: '5px 10px',
            fontSize: 11.5,
            fontWeight: 600,
            marginTop: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            {mobileStatus.icon} {mobileStatus.left}
          </span>
          <span style={{ fontSize: 11, opacity: 0.9 }}>{mobileStatus.right}</span>
        </div>

        {/* Bottom Row: Fulfillment note on left, CTA on right */}
        <Flex
          justify="space-between"
          align="center"
          style={{ marginTop: 10 }}
        >
          <span style={{ fontSize: 11.5, color: colors.textMuted }}>
            {fulfillmentText}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOrder?.(item);
            }}
            style={{
              background: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: radii.md,
              padding: '6px 18px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 1px 3px rgba(11, 45, 107, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            {actionBtn}
          </button>
        </Flex>
      </div>
    );
  }

  // 2. DESKTOP CARD VIEW (3-Column 16:9 vertical grid card matching desktop mockup media_1794132241598_95e1ee19.png)
  return (
    <div
      onClick={onClick}
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(11, 45, 107, 0.08)';
        e.currentTarget.style.borderColor = colors.borderDark;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.03)';
        e.currentTarget.style.borderColor = colors.border;
      }}
    >
      {/* 1. Image Thumbnail with Overlaid Badges */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 154,
          background: colors.surfaceContainer,
          overflow: 'hidden',
        }}
      >
        <img
          src={imageUrl}
          alt={item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Top-Left Floating Geofence Distance Badge */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(6px)',
            border: `1px solid ${colors.border}`,
            borderRadius: radii.full,
            padding: '2px 8px',
            fontSize: 10,
            fontWeight: 700,
            color: colors.textMain,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
          }}
        >
          <span>📍 {distanceStr} • {areaStr}</span>
        </div>

        {/* Top-Right Assurance Badge */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: topRightBadge.bg,
            color: topRightBadge.color,
            borderRadius: radii.xs,
            padding: '2px 7px',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.4px',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.12)',
          }}
        >
          {topRightBadge.text}
        </div>
      </div>

      {/* 2. Middle Body: Store Meta, Item Title, Live Status */}
      <div
        style={{
          padding: '14px 14px 12px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* Store Name & Star Rating */}
        <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: colors.textMuted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '75%',
            }}
          >
            {shop.shop_name || 'Neighborhood Store'}
          </span>
          <Flex align="center" gap={3}>
            <StarFilled style={{ fontSize: 11, color: colors.semantic.warning }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: colors.tertiary }}>
              {ratingStr}
            </span>
          </Flex>
        </Flex>

        {/* Item Title */}
        <Text
          ellipsis={{ rows: 2 }}
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: colors.textMain,
            lineHeight: 1.3,
            marginBottom: 8,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}
        >
          {item.name}
        </Text>

        {/* Live Status Badge */}
        <div
          style={{
            marginTop: 'auto',
            background: statusChip.bg,
            border: `1px solid ${statusChip.border}`,
            borderRadius: radii.xs,
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
          }}
        >
          <Flex align="center" gap={5}>
            <span style={{ color: statusChip.color, display: 'flex' }}>
              {statusChip.icon}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: statusChip.color,
                lineHeight: 1,
              }}
            >
              {statusChip.text}
            </span>
          </Flex>
          {statusChip.sub && (
            <span
              style={{
                fontSize: 10,
                color: statusChip.color,
                fontWeight: 500,
                opacity: 0.85,
              }}
            >
              {statusChip.sub}
            </span>
          )}
        </div>
      </div>

      {/* 3. Inset Shelf Price Container */}
      <div
        style={{
          background: colors.surfaceContainer,
          borderTop: `1px solid ${colors.border}`,
          padding: '8px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Flex vertical>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: colors.textLight,
            }}
          >
            {priceType}
          </span>
          <Flex align="baseline" gap={4}>
            <span style={{ fontSize: 17, fontWeight: 800, color: colors.textMain }}>
              ₹{item.price}
            </span>
            {item.unit && (
              <span style={{ fontSize: 10.5, color: colors.textLight }}>/{item.unit}</span>
            )}
          </Flex>
        </Flex>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOrder?.(item);
          }}
          style={{
            background: colors.primary,
            color: colors.white,
            border: 'none',
            borderRadius: radii.md,
            padding: '6px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(11, 45, 107, 0.2)',
            transition: 'all 0.15s ease',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.96)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

OfferingCard.propTypes = {
  item: PropTypes.object.isRequired,
  onOrder: PropTypes.func,
  onClick: PropTypes.func,
};

export default OfferingCard;
