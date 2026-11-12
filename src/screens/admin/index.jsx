import React, { useState } from 'react';
import Category from './category';
import ShopsManager from './shops_manager';
import AdminOrdersAccounts from './orders_accounts';
import { Tabs, Card, Typography, Tag, Flex, Grid } from 'antd';
import {
  AppstoreOutlined,
  ShopOutlined,
  SafetyCertificateOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { colors, typography, radii } from '../../app/styles/theme';
import './index.css';

const { Title, Text } = Typography;

const Admin = () => {
  const [activeKey, setActiveKey] = useState('1');
  const screens = Grid.useBreakpoint();

  const onChange = (key) => {
    setActiveKey(key);
  };

  const items = [
    {
      key: '1',
      label: (
        <span style={{ fontWeight: 600, fontSize: 14, fontFamily: typography.fontFamily.headline }}>
          <AppstoreOutlined /> Standard Business Categories & Forms
        </span>
      ),
      children: <Category />,
    },
    {
      key: '2',
      label: (
        <span style={{ fontWeight: 600, fontSize: 14, fontFamily: typography.fontFamily.headline }}>
          <ShopOutlined /> Registered Stores & Custom Form Overrides
        </span>
      ),
      children: <ShopsManager />,
    },
    {
      key: '3',
      label: (
        <span style={{ fontWeight: 600, fontSize: 14, fontFamily: typography.fontFamily.headline }}>
          <DatabaseOutlined /> All Platform Orders, Accounts & Backup
        </span>
      ),
      children: <AdminOrdersAccounts />,
    },
  ];

  return (
    <div
      className="admin-console-container"
      style={{
        maxWidth: 1200,
        margin: screens.xs ? '14px auto' : '24px auto',
        padding: screens.xs ? '0 12px 60px 12px' : '0 20px 60px 20px',
      }}
    >
      <Card
        style={{
          borderRadius: radii.xl,
          border: `1px solid ${colors.border}`,
          marginBottom: 20,
          boxShadow: '0 4px 12px rgba(11, 45, 107, 0.04)',
          background: colors.surface,
        }}
        styles={{ body: { padding: screens.xs ? 16 : 24 } }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <div>
            <Flex align="center" gap={10} wrap="wrap">
              <Title
                level={3}
                style={{
                  margin: 0,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: colors.textMain,
                  fontFamily: typography.fontFamily.headline,
                }}
              >
                Platform Admin Console
              </Title>
              <Tag
                icon={<SafetyCertificateOutlined />}
                style={{
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: radii.full,
                  background: colors.primaryLight,
                  color: colors.primary,
                  borderColor: 'rgba(11, 45, 107, 0.2)',
                }}
              >
                SUPER ADMIN
              </Tag>
            </Flex>
            <Text style={{ fontSize: 13, marginTop: 4, display: 'block', color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
              Manage standard business categories, define default product form schemas, and configure custom form overrides for specific shops.
            </Text>
          </div>
        </Flex>
      </Card>

      <Card
        style={{
          borderRadius: radii.xl,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 2px 8px rgba(11, 45, 107, 0.03)',
          background: colors.surface,
        }}
        styles={{ body: { padding: screens.xs ? 14 : 24 } }}
      >
        <Tabs activeKey={activeKey} items={items} onChange={onChange} />
      </Card>
    </div>
  );
};

export default Admin;