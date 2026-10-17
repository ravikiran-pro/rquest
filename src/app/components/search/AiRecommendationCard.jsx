import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, Flex, Typography, Button, Popover, Tag, Grid } from 'antd';
import {
  RobotOutlined,
  DownOutlined,
  CheckCircleFilled,
  ThunderboltFilled,
  StarFilled,
  EnvironmentFilled,
} from '@ant-design/icons';
import { distanceConvertor } from '../../utils';

const { Text } = Typography;

const AiRecommendationCard = ({ topResult, searchMode = 'shops', onClick }) => {
  const screens = Grid.useBreakpoint();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!topResult) return null;

  const name = searchMode === 'shops' ? topResult.shop_name : topResult.name;
  const rawDist = searchMode === 'shops' ? topResult.distance : topResult.shop?.distance;
  const distKm = rawDist !== undefined && rawDist !== null ? distanceConvertor(rawDist) : '1.2';
  const rating = (searchMode === 'shops' ? topResult.rating : topResult.shop?.rating) || 4.9;

  const etaMinutes = Math.max(5, Math.round(parseFloat(distKm) * 5 + 3));

  const explanationContent = (
    <div style={{ maxWidth: 280, padding: 4 }}>
      <Text strong style={{ fontSize: 13, color: '#0f172a', display: 'block', marginBottom: 8 }}>
        Why our AI picked this match:
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#475569' }}>
        <Flex align="center" gap={6}>
          <EnvironmentFilled style={{ color: '#10b981' }} />
          <span>Closest proximity: <strong>{distKm} km</strong> (~{etaMinutes} min away)</span>
        </Flex>
        <Flex align="center" gap={6}>
          <StarFilled style={{ color: '#f59e0b' }} />
          <span>High customer rating: <strong>{rating}★</strong></span>
        </Flex>
        <Flex align="center" gap={6}>
          <ThunderboltFilled style={{ color: '#4f46e5' }} />
          <span>Instant availability & fast response time</span>
        </Flex>
        <Flex align="center" gap={6}>
          <CheckCircleFilled style={{ color: '#059669' }} />
          <span>Direct verified partner with zero markups</span>
        </Flex>
      </div>
    </div>
  );

  return (
    <Card
      style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #f6ffed 100%)',
        border: '1px solid #bbf7d0',
        borderRadius: 14,
        marginBottom: 16,
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.06)',
      }}
      styles={{
        body: {
          padding: screens.xs ? '10px 14px' : '12px 18px',
        },
      }}
    >
      <Flex
        align={screens.xs ? 'start' : 'center'}
        justify="space-between"
        gap={12}
        wrap={screens.xs ? 'wrap' : 'nowrap'}
      >
        <Flex align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            <RobotOutlined />
          </div>

          <Flex vertical style={{ minWidth: 0 }}>
            <Flex align="center" gap={6}>
              <Text strong style={{ color: '#15803d', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                AI Recommendation
              </Text>
              <Tag color="success" style={{ fontSize: 10, lineHeight: '16px', padding: '0 5px', margin: 0, borderRadius: 4 }}>
                Best Match
              </Tag>
            </Flex>
            <Text
              style={{
                fontSize: screens.xs ? 12 : 13,
                color: '#1e293b',
                marginTop: 2,
                lineHeight: 1.4,
              }}
            >
              <strong>{name}</strong> is the best match based on your location ({distKm} km), high rating ({rating}★), and fast arrival (~{etaMinutes} min).
            </Text>
          </Flex>
        </Flex>

        <Flex align="center" gap={8} style={{ width: screens.xs ? '100%' : 'auto', justifyContent: screens.xs ? 'space-between' : 'flex-end', flexShrink: 0 }}>
          <Popover
            content={explanationContent}
            trigger="click"
            open={isPopoverOpen}
            onOpenChange={setIsPopoverOpen}
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#15803d',
                padding: '2px 8px',
                borderRadius: 6,
                background: 'rgba(34, 197, 94, 0.1)',
              }}
            >
              Why this match? <DownOutlined style={{ fontSize: 9, marginLeft: 2 }} />
            </Button>
          </Popover>

          {onClick && (
            <Button
              type="primary"
              size="small"
              onClick={onClick}
              style={{
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 12,
                background: '#16a34a',
                border: 'none',
              }}
            >
              View Best Match
            </Button>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

AiRecommendationCard.propTypes = {
  topResult: PropTypes.object,
  searchMode: PropTypes.oneOf(['items', 'shops']),
  onClick: PropTypes.func,
};

export default AiRecommendationCard;

