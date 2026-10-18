import React, { useState } from 'react';
import Category from './category';
import ShopsManager from './shops_manager';
import { Col, Row, Tabs, Card, Typography, Tag, Flex } from 'antd';
import { AppstoreOutlined, ShopOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import './index.css';

const { Title, Text } = Typography;

const Admin = () => {
  const [activeKey, setActiveKey] = useState('1');

  const onChange = (key) => {
    setActiveKey(key);
  };

  const items = [
    {
      key: '1',
      label: (
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          <AppstoreOutlined /> Standard Business Categories & Forms
        </span>
      ),
      children: <Category />,
    },
    {
      key: '2',
      label: (
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          <ShopOutlined /> Registered Stores & Custom Form Overrides
        </span>
      ),
      children: <ShopsManager />,
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 20px 60px 20px' }}>
      <Card
        style={{
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          marginBottom: 20,
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <div>
            <Flex align="center" gap={10}>
              <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                Platform Admin Console
              </Title>
              <Tag color="purple" icon={<SafetyCertificateOutlined />} style={{ fontWeight: 700, padding: '2px 8px' }}>
                SUPER ADMIN
              </Tag>
            </Flex>
            <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
              Manage standard business categories, define default product form schemas, and configure custom form overrides for specific shops.
            </Text>
          </div>
        </Flex>
      </Card>

      <Card
        style={{
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Tabs activeKey={activeKey} items={items} onChange={onChange} />
      </Card>
    </div>
  );
};

export default Admin;