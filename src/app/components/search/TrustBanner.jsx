import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Typography, Flex } from 'antd';
import {
  SafetyCertificateOutlined,
  CreditCardOutlined,
  CustomerServiceOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const TRUST_ITEMS = [
  {
    icon: <SafetyCertificateOutlined style={{ fontSize: 24, color: '#10b981' }} />,
    bg: '#ecfdf5',
    title: 'Verified Partners',
    subtitle: 'Verified & Quality Assured',
  },
  {
    icon: <CreditCardOutlined style={{ fontSize: 24, color: '#059669' }} />,
    bg: '#f0fdf4',
    title: 'Secure Orders',
    subtitle: '100% Safe & Direct',
  },
  {
    icon: <CustomerServiceOutlined style={{ fontSize: 24, color: '#6366f1' }} />,
    bg: '#eef2ff',
    title: 'Direct Support',
    subtitle: "We're here to help you",
  },
  {
    icon: <ClockCircleOutlined style={{ fontSize: 24, color: '#8b5cf6' }} />,
    bg: '#f5f3ff',
    title: 'Hyperlocal Speed',
    subtitle: 'Fast Neighborhood Delivery',
  },
];

const TrustBanner = ({ style }) => {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '16px 20px',
        marginTop: 24,
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
        ...style,
      }}
    >
      <Row gutter={[16, 16]} align="middle">
        {TRUST_ITEMS.map((item) => (
          <Col xs={12} sm={12} md={6} key={item.title}>
            <Flex align="center" gap={12}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: item.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <Flex vertical style={{ minWidth: 0 }}>
                <Text strong style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.2 }}>
                  {item.title}
                </Text>
                <Text type="secondary" style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {item.subtitle}
                </Text>
              </Flex>
            </Flex>
          </Col>
        ))}
      </Row>
    </div>
  );
};

TrustBanner.propTypes = {
  style: PropTypes.object,
};

export default TrustBanner;

