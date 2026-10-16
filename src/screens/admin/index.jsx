import React, { useState } from 'react';
import Category from './category';
import { Col, Row, Tabs, Card, Typography, Tag, Flex } from 'antd';
import { AppstoreOutlined, TagsOutlined, ShoppingOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import SubCategory from './subcategory';
import Products from './products';
import './index.css';

const { Title, Text } = Typography;

const Admin = () => {
  const [activeKey, setActiveKey] = useState('1');
  const [CategoryId, setCategoryId] = useState(null);
  const [subCategoryId, setSubCategoryId] = useState(null);

  const onChange = (key) => {
    setActiveKey(key);
    setCategoryId(null);
    setSubCategoryId(null);
  };

  const handleSubCategory = (row) => {
    setCategoryId(row?.id);
    setActiveKey('2');
  };

  const handleProducts = (row) => {
    setSubCategoryId(row?.id);
    setActiveKey('3');
  };

  const items = [
    {
      key: '1',
      label: (
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          <AppstoreOutlined /> Categories & Product Form Config
        </span>
      ),
      children: <Category handleSubCategory={handleSubCategory} />,
    },
    {
      key: '2',
      label: (
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          <TagsOutlined /> Sub-Categories
        </span>
      ),
      children: <SubCategory category_id={CategoryId} handleProducts={handleProducts} />,
    },
    {
      key: '3',
      label: (
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          <ShoppingOutlined /> Master Products Library
        </span>
      ),
      children: <Products category_id={CategoryId} sub_category_id={subCategoryId} />,
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
              Configure master categories, customize dynamic product forms schemas per domain, and manage global catalog.
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