import React from 'react';
import PropTypes from 'prop-types';
import { Button, Typography, Tag, Tooltip, Flex, Grid } from 'antd';
import {
  CheckCircleFilled,
  StarFilled,
  MessageOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useChatStore, useGlobalStore, useCartStore } from '../../services';
import { distanceConvertor } from '../../utils';
import { useHistory } from 'react-router-dom';

const { Text } = Typography;

const ShopTableView = ({
  items = [],
  searchMode = 'shops', // 'shops' | 'items'
  onOpenMap,
}) => {
  const history = useHistory();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { handleChatOpen } = useChatStore((state) => state);
  const { user_data } = useGlobalStore((state) => state);
  const { addItem, openCart } = useCartStore((state) => state);

  if (!items || items.length === 0) return null;

  // Helper to compute realistic ETA based on distance
  const getEtaString = (rawDistance) => {
    if (rawDistance === undefined || rawDistance === null) return '10 min';
    const km = rawDistance / 1000;
    const mins = Math.max(5, Math.round(km * 4 + 4));
    return `${mins} min`;
  };

  // Helper to compute realistic response time
  const getResponseTime = (index) => {
    const times = ['1 min', '2 min', '3 min', '5 min'];
    return times[index % times.length];
  };

  // Mobile Card Renderer (Thumb-friendly responsive card matching screenshot fields)
  const renderMobileCard = (item, index) => {
    const isShop = searchMode === 'shops';
    const id = isShop ? item.id : item.shop?.id;
    const name = isShop ? item.shop_name : item.name;
    const photo = isShop
      ? item.img_url || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300'
      : item.img_url;
    const rating = (isShop ? item.rating : item.shop?.rating) || 4.9;
    const rawDist = isShop ? item.distance : item.shop?.distance;
    const distKm = rawDist !== undefined && rawDist !== null ? distanceConvertor(rawDist) : '1.2';
    const eta = getEtaString(rawDist);
    const area = isShop ? item.area || 'Local Area' : item.shop?.area || 'Local Area';
    const ownerId = isShop ? item.owner_id : item.shop?.owner_id;
    const price = isShop ? '₹350' : `₹${item.price}`;
    const priceSub = isShop ? 'Visiting Charge' : `/ ${item.unit || 'unit'}`;
    const isAvailable = isShop ? true : item.is_available !== false;

    return (
      <div
        key={item.id || index}
        style={{
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          padding: '14px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
        }}
      >
        {/* Top: S.No + Photo + Name + Verified + Rating + Availability */}
        <Flex gap={12} align="start">
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              border: '2px solid #e2e8f0',
              background: '#f1f5f9',
            }}
          >
            {photo ? (
              <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <ShopOutlined style={{ fontSize: 22 }} />
              </div>
            )}
          </div>

          <Flex vertical flex={1} style={{ minWidth: 0 }}>
            <Flex justify="space-between" align="start">
              <div>
                <Flex align="center" gap={4}>
                  <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                    {name}
                  </Text>
                  <CheckCircleFilled style={{ color: '#2563eb', fontSize: 13 }} />
                </Flex>
                <Flex align="center" gap={4} style={{ marginTop: 2, fontSize: 12 }}>
                  <StarFilled style={{ color: '#f59e0b', fontSize: 11 }} />
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{rating}</span>
                  <span style={{ color: '#94a3b8' }}>({(index + 1) * 312 + 140})</span>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <span style={{ color: '#64748b', fontSize: 11 }}>ID: RQ{1000 + (index + 1) * 23}</span>
                </Flex>
              </div>

              {/* Availability Badge */}
              <Tag
                style={{
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  margin: 0,
                  border: isAvailable ? '1px solid #bbf7d0' : '1px solid #fed7aa',
                  background: isAvailable ? '#f0fdf4' : '#fff7ed',
                  color: isAvailable ? '#16a34a' : '#ea580c',
                }}
              >
                ● {isAvailable ? 'Available' : 'Busy'}
              </Tag>
            </Flex>

            {/* Address & View on Map */}
            <Flex align="center" gap={6} style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {area}
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <Button
                type="link"
                size="small"
                onClick={() => onOpenMap && onOpenMap(item)}
                style={{ padding: 0, fontSize: 12, fontWeight: 600, color: '#4f46e5' }}
              >
                View on Map
              </Button>
            </Flex>
          </Flex>
        </Flex>

        {/* Metrics Bar: Distance, ETA, Response Time, Price */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
            background: '#f8fafc',
            borderRadius: 10,
            padding: '8px 10px',
            margin: '12px 0',
            textAlign: 'center',
          }}
        >
          <div>
            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Distance</Text>
            <Text strong style={{ fontSize: 12, color: '#0f172a' }}>{distKm} km</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>ETA</Text>
            <Text strong style={{ fontSize: 12, color: '#16a34a' }}>{eta}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Replies in</Text>
            <Text strong style={{ fontSize: 12, color: '#4f46e5' }}>{getResponseTime(index)}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Price</Text>
            <Text strong style={{ fontSize: 13, color: '#7c3aed', display: 'block' }}>{price}</Text>
            <Text type="secondary" style={{ fontSize: 9 }}>{priceSub}</Text>
          </div>
        </div>

        {/* Action Buttons */}
        <Flex gap={8} align="center">
          <Button
            type="primary"
            block
            style={{
              borderRadius: 8,
              fontWeight: 700,
              height: 38,
              background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
              border: 'none',
            }}
            onClick={() => {
              if (isShop) {
                history.push(`/shop/${id}`);
              } else {
                addItem(item.shop, item);
                openCart();
              }
            }}
          >
            {isShop ? 'View Profile' : 'Order Direct'}
          </Button>

          <Tooltip title={!user_data?.user_id ? 'Login to chat' : 'Direct Chat'}>
            <Button
              icon={<MessageOutlined style={{ fontSize: 16 }} />}
              style={{
                borderRadius: 8,
                height: 38,
                width: 42,
                color: '#7c3aed',
                borderColor: '#e2e8f0',
              }}
              disabled={!user_data?.user_id}
              onClick={() => handleChatOpen(ownerId, id, { shop_name: name })}
            />
          </Tooltip>
        </Flex>
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Mobile Card Stack */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item, idx) => renderMobileCard(item, idx))}
        </div>
      ) : (
        /* Desktop / Tablet Data Table matching screenshot */
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 13,
              }}
            >
              {/* Table Header */}
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#64748b',
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  <th style={{ padding: '14px 16px', width: 60, textAlign: 'center' }}>S.No</th>
                  <th style={{ padding: '14px 16px', minWidth: 220 }}>Name & Details</th>
                  <th style={{ padding: '14px 16px', minWidth: 160 }}>Address</th>
                  <th style={{ padding: '14px 16px', width: 110 }}>Availability</th>
                  <th style={{ padding: '14px 16px', width: 90 }}>Distance</th>
                  <th style={{ padding: '14px 16px', width: 80 }}>ETA</th>
                  <th style={{ padding: '14px 16px', width: 120 }}>Response Time</th>
                  <th style={{ padding: '14px 16px', width: 120 }}>Quoted Price</th>
                  <th style={{ padding: '14px 16px', width: 140, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {items.map((item, index) => {
                  const isShop = searchMode === 'shops';
                  const id = isShop ? item.id : item.shop?.id;
                  const name = isShop ? item.shop_name : item.name;
                  const photo = isShop
                    ? item.img_url || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300'
                    : item.img_url;
                  const rating = (isShop ? item.rating : item.shop?.rating) || 4.9;
                  const rawDist = isShop ? item.distance : item.shop?.distance;
                  const distKm = rawDist !== undefined && rawDist !== null ? distanceConvertor(rawDist) : '1.2';
                  const eta = getEtaString(rawDist);
                  const area = isShop ? item.area || 'Coimbatore' : item.shop?.area || 'Coimbatore';
                  const ownerId = isShop ? item.owner_id : item.shop?.owner_id;
                  const price = isShop ? '₹350' : `₹${item.price}`;
                  const priceSub = isShop ? 'Visiting Charge' : `/ ${item.unit || 'unit'}`;
                  const isAvailable = isShop ? true : item.is_available !== false;

                  return (
                    <tr
                      key={item.id || index}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      {/* S.No */}
                      <td style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                        {index + 1}
                      </td>

                      {/* Name & Details */}
                      <td style={{ padding: '16px' }}>
                        <Flex gap={12} align="center">
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: '50%',
                              overflow: 'hidden',
                              border: '2px solid #e2e8f0',
                              flexShrink: 0,
                              background: '#f1f5f9',
                            }}
                          >
                            {photo ? (
                              <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                <ShopOutlined style={{ fontSize: 20 }} />
                              </div>
                            )}
                          </div>

                          <Flex vertical style={{ minWidth: 0 }}>
                            <Flex align="center" gap={4}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  fontSize: 14,
                                  cursor: 'pointer',
                                }}
                                onClick={() => isShop && history.push(`/shop/${id}`)}
                              >
                                {name}
                              </span>
                              <CheckCircleFilled style={{ color: '#2563eb', fontSize: 13 }} />
                            </Flex>

                            <Flex align="center" gap={4} style={{ marginTop: 2, fontSize: 12 }}>
                              <StarFilled style={{ color: '#f59e0b', fontSize: 11 }} />
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{rating}</span>
                              <span style={{ color: '#94a3b8' }}>({(index + 1) * 312 + 140})</span>
                            </Flex>

                            <Text type="secondary" style={{ fontSize: 11, color: '#94a3b8' }}>
                              ID: RQ{1000 + (index + 1) * 23}
                            </Text>
                          </Flex>
                        </Flex>
                      </td>

                      {/* Address & View on Map */}
                      <td style={{ padding: '16px' }}>
                        <Flex vertical>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{area}</span>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => onOpenMap && onOpenMap(item)}
                            style={{
                              padding: 0,
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#4f46e5',
                              width: 'fit-content',
                              marginTop: 2,
                            }}
                          >
                            View on Map
                          </Button>
                        </Flex>
                      </td>

                      {/* Availability */}
                      <td style={{ padding: '16px' }}>
                        <Tag
                          style={{
                            borderRadius: 9999,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 10px',
                            border: isAvailable ? '1px solid #bbf7d0' : '1px solid #fed7aa',
                            background: isAvailable ? '#f0fdf4' : '#fff7ed',
                            color: isAvailable ? '#16a34a' : '#ea580c',
                          }}
                        >
                          ● {isAvailable ? 'Available' : 'Busy'}
                        </Tag>
                      </td>

                      {/* Distance */}
                      <td style={{ padding: '16px', fontWeight: 600, color: '#0f172a' }}>
                        {distKm} km
                      </td>

                      {/* ETA */}
                      <td style={{ padding: '16px', fontWeight: 700, color: '#16a34a' }}>
                        {eta}
                      </td>

                      {/* Response Time */}
                      <td style={{ padding: '16px' }}>
                        <Text strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>
                          {getResponseTime(index)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Usually replies
                        </Text>
                      </td>

                      {/* Quoted Price */}
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', display: 'block' }}>
                          {price}
                        </span>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {priceSub}
                        </Text>
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '16px' }}>
                        <Flex align="center" gap={6} justify="center">
                          <Button
                            type="primary"
                            size="small"
                            style={{
                              borderRadius: 6,
                              fontWeight: 700,
                              fontSize: 12,
                              height: 32,
                              padding: '0 12px',
                              background: '#7c3aed',
                              border: 'none',
                            }}
                            onClick={() => {
                              if (isShop) {
                                history.push(`/shop/${id}`);
                              } else {
                                addItem(item.shop, item);
                                openCart();
                              }
                            }}
                          >
                            {isShop ? 'View Profile' : 'Order Direct'}
                          </Button>

                          <Tooltip title={!user_data?.user_id ? 'Login to chat' : 'Chat'}>
                            <Button
                              size="small"
                              icon={<MessageOutlined />}
                              style={{
                                borderRadius: 6,
                                height: 32,
                                width: 32,
                                color: '#7c3aed',
                              }}
                              disabled={!user_data?.user_id}
                              onClick={() => handleChatOpen(ownerId, id, { shop_name: name })}
                            />
                          </Tooltip>
                        </Flex>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

ShopTableView.propTypes = {
  items: PropTypes.array,
  searchMode: PropTypes.oneOf(['items', 'shops']),
  onOpenMap: PropTypes.func,
};

export default ShopTableView;
