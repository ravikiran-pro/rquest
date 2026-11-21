import React, { Suspense, lazy, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Tabs, Card, Typography, Tag, Grid, Select, Skeleton, Result, Button } from 'antd';
import {
  AppstoreOutlined,
  ShopOutlined,
  SafetyCertificateOutlined,
  DatabaseOutlined,
  ShoppingOutlined,
  ControlOutlined,
} from '@ant-design/icons';
import ErrorBoundary from '../../app/components/common/ErrorBoundary';
import { useGlobalStore } from '../../app/services';
import { checkUserRole } from '../../app/utils';
import './index.css';

// Each section loads its code (and fires its API calls) only when it is opened
const Category = lazy(() => import('./category'));
const ShopsManager = lazy(() => import('./shops_manager'));
const AdminOrdersAccounts = lazy(() => import('./orders_accounts'));
const CatalogItems = lazy(() => import('./catalog_items'));
const PlatformSettings = lazy(() => import('./platform_settings'));

const { Title, Text } = Typography;

const SECTIONS = [
  {
    key: 'categories',
    label: 'Categories & forms',
    short: 'Categories',
    icon: <AppstoreOutlined />,
    description: 'Standard business categories and the product form each one asks shops to fill in.',
  },
  {
    key: 'stores',
    label: 'Stores',
    short: 'Stores',
    icon: <ShopOutlined />,
    description: 'Registered stores, and custom product forms that replace their category default.',
  },
  {
    key: 'orders',
    label: 'Orders & accounts',
    short: 'Orders',
    icon: <DatabaseOutlined />,
    description: 'Every order on the platform, platform accounts and data backups.',
  },
  {
    key: 'catalog',
    label: 'Master catalog',
    short: 'Catalog',
    icon: <ShoppingOutlined />,
    description: 'The shared product catalog merchants pick their items from.',
  },
  {
    key: 'platform',
    label: 'Platform configuration',
    short: 'Platform',
    icon: <ControlOutlined />,
    description: 'Settings that apply across the whole platform.',
  },
];

const DEFAULT_SECTION = SECTIONS[0].key;
// Links made before the sections had names used the tab index
const LEGACY_TAB_KEYS = { 1: 'categories', 2: 'stores', 3: 'orders', 4: 'catalog' };

const resolveSection = (raw) => {
  const key = LEGACY_TAB_KEYS[raw] || raw;
  return SECTIONS.some((s) => s.key === key) ? key : DEFAULT_SECTION;
};

const SectionFallback = () => (
  <div className="admin-section-loading" aria-busy="true" aria-live="polite">
    <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 6 }} />
  </div>
);

const Admin = () => {
  const history = useHistory();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const { user_data } = useGlobalStore((state) => state);
  const { isAdmin } = checkUserRole(user_data);
  // useBreakpoint is empty on the very first render: treat that as desktop
  const isPhone = screens.sm === false;
  // Full tab names need a wide screen; tablets and small laptops get the short ones
  const compactTabs = screens.xl === false;

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const activeKey = resolveSection(query.get('tab'));
  const activeSection = SECTIONS.find((s) => s.key === activeKey);

  // Every switch is a history entry, so deep links and the back button work
  const navigate = (tab) => {
    const next = new URLSearchParams();
    next.set('tab', tab);
    const search = `?${next.toString()}`;
    if (search !== location.search) history.push({ pathname: location.pathname, search });
  };

  if (!isAdmin) {
    return (
      <div className="admin-console">
        <Card className="admin-console-card">
          <Result
            status="403"
            title="Admins only"
            subTitle="The platform admin console is available to platform administrators. Sign in with an admin account to continue."
            extra={
              <Button type="primary" onClick={() => history.push('/')}>
                Go to home
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const renderSection = (key) => {
    switch (key) {
      case 'categories':
        return <Category />;
      case 'stores':
        return <ShopsManager />;
      case 'orders':
        return <AdminOrdersAccounts />;
      case 'catalog':
        return <CatalogItems />;
      case 'platform':
        return <PlatformSettings />;
      default:
        return null;
    }
  };

  const panel = (
    <div className="admin-section">
      <Text type="secondary" className="admin-section-desc">
        {activeSection.description}
      </Text>
      <ErrorBoundary key={activeKey}>
        <Suspense fallback={<SectionFallback />}>{renderSection(activeKey)}</Suspense>
      </ErrorBoundary>
    </div>
  );

  const items = SECTIONS.map((section) => ({
    key: section.key,
    label: (
      <span className="admin-tab-label" title={compactTabs ? section.label : undefined}>
        {section.icon}
        <span>{compactTabs ? section.short : section.label}</span>
      </span>
    ),
    // Only the open section is mounted, so hidden sections make no API calls
    children: section.key === activeKey ? panel : null,
  }));

  // Phones: one full-width section picker instead of a row of tabs
  const renderPhoneSwitcher = () => (
    <div className="admin-section-picker">
      <Select
        size="large"
        value={activeKey}
        onChange={(key) => navigate(key)}
        aria-label="Admin section"
        popupMatchSelectWidth
        options={SECTIONS.map((section) => ({
          value: section.key,
          label: (
            <span className="admin-tab-label">
              {section.icon}
              <span>{section.label}</span>
            </span>
          ),
        }))}
      />
    </div>
  );

  return (
    <div className="admin-console">
      <header className="admin-console-header">
        <div className="admin-console-heading">
          <Title level={1} className="admin-console-title">
            Platform admin console
          </Title>
          <Tag icon={<SafetyCertificateOutlined />} className="admin-role-tag">
            Super admin
          </Tag>
        </div>
        <Text className="admin-console-subtitle">
          Categories, stores, orders, the master catalog and platform settings in one place.
        </Text>
      </header>

      <Card className="admin-console-card admin-console-panel">
        <Tabs
          className="admin-tabs"
          activeKey={activeKey}
          onChange={(key) => navigate(key)}
          items={items}
          renderTabBar={isPhone ? renderPhoneSwitcher : undefined}
        />
      </Card>
    </div>
  );
};

export default Admin;
