import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Tag,
  Space,
  Select,
  Typography,
  Card,
  Flex,
  Tooltip,
  Avatar,
  Badge,
} from 'antd';
import {
  ShopOutlined,
  SearchOutlined,
  SettingOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  BuildOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { apiConfig, netWorkCall } from '../../app/utils';
import FormSchemaBuilderModal from './form_schema_builder';

const { Text } = Typography;

const ShopsManager = () => {
  const [shopsList, setShopsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 8, total: 0 });
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  // Modal state for custom form builder
  const [selectedShopForSchema, setSelectedShopForSchema] = useState(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);

  // Fetch all categories for filter dropdown
  useEffect(() => {
    netWorkCall(apiConfig.my_categories, 'GET', null, false)
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setCategories(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch shops
  const fetchShops = async (page = 1, search = searchText, cat = selectedCategory) => {
    setLoading(true);
    try {
      const res = await netWorkCall(
        apiConfig.master_shops,
        'POST',
        JSON.stringify({
          limit: pagination.pageSize,
          offset: (page - 1) * pagination.pageSize,
          search: search || '',
          category_id: cat !== 'all' ? cat : undefined,
        }),
        true
      );

      if (res?.success) {
        setShopsList(res.data || []);
        setPagination((prev) => ({
          ...prev,
          current: page,
          total: res.count || 0,
        }));
      }
    } catch (err) {
      console.error('Error fetching master shops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops(1);
  }, []);

  const handleSearch = () => {
    fetchShops(1, searchText, selectedCategory);
  };

  const handleCategoryFilter = (catId) => {
    setSelectedCategory(catId);
    fetchShops(1, searchText, catId);
  };

  const handleOpenFormBuilder = (shopRecord) => {
    setSelectedShopForSchema(shopRecord);
    setIsSchemaModalOpen(true);
  };

  const handleSchemaSuccess = () => {
    fetchShops(pagination.current);
  };

  const columns = [
    {
      title: 'Store Name',
      key: 'shop_name',
      render: (_, record) => (
        <Flex align="center" gap={10}>
          <Avatar
            shape="square"
            size={40}
            src={record.img_url}
            icon={<ShopOutlined />}
            style={{ borderRadius: 8, background: '#e0e7ff', color: '#4f46e5' }}
          />
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>
              {record.shop_name}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              <EnvironmentOutlined style={{ marginRight: 4 }} />
              {record.area || record.address || 'Location not specified'}
            </div>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Category / Archetype',
      key: 'category',
      render: (_, record) => {
        const catName = record.shopCategory?.name || record.shop_type || 'General Store';
        return (
          <Tag color="geekblue" style={{ fontWeight: 600, borderRadius: 6 }}>
            {catName}
          </Tag>
        );
      },
    },
    {
      title: 'Owner & Contact',
      key: 'owner',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
            {record.owner?.username || 'Owner'}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            <PhoneOutlined style={{ marginRight: 4 }} />
            {record.mobile_number || record.owner?.mobile || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Active Form Engine',
      key: 'form_schema',
      render: (_, record) => {
        const customCount = Array.isArray(record.form_schema) ? record.form_schema.length : 0;
        const hasCustom = customCount > 0;
        return (
          <div>
            {hasCustom ? (
              <Tag color="purple" style={{ fontWeight: 700, borderRadius: 6 }}>
                <BuildOutlined style={{ marginRight: 4 }} />
                Custom Override ({customCount} fields)
              </Tag>
            ) : (
              <Tag color="default" style={{ color: '#64748b', borderRadius: 6 }}>
                Standard Category Form
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => {
        const customCount = Array.isArray(record.form_schema) ? record.form_schema.length : 0;
        const hasCustom = customCount > 0;
        return (
          <Button
            type={hasCustom ? 'primary' : 'default'}
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleOpenFormBuilder(record)}
            style={{
              borderRadius: 6,
              fontWeight: 600,
              background: hasCustom ? '#7c3aed' : undefined,
              borderColor: hasCustom ? '#7c3aed' : undefined,
              color: hasCustom ? '#fff' : undefined,
            }}
          >
            {hasCustom ? 'Edit Custom Form' : '+ Configure Custom Form'}
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      {/* Control Bar: Search & Category Filter */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="Search stores by name, area, or mobile..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 280 }}
          />

          <Select
            value={selectedCategory}
            onChange={handleCategoryFilter}
            style={{ width: 220 }}
          >
            <Select.Option value="all">All Category Types</Select.Option>
            {categories.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.name}
              </Select.Option>
            ))}
          </Select>
        </Space>

        <Button
          icon={<ReloadOutlined />}
          onClick={() => fetchShops(pagination.current)}
          loading={loading}
        >
          Refresh
        </Button>
      </Flex>

      {/* Stores Table */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={shopsList}
        loading={loading}
        pagination={{
          ...pagination,
          onChange: (page) => fetchShops(page),
        }}
        bordered
        style={{ borderRadius: 12, overflow: 'hidden' }}
      />

      {/* Specific Shop Form Builder Modal */}
      <FormSchemaBuilderModal
        open={isSchemaModalOpen}
        onClose={() => {
          setIsSchemaModalOpen(false);
          setSelectedShopForSchema(null);
        }}
        shop={selectedShopForSchema}
        onSuccess={handleSchemaSuccess}
      />
    </div>
  );
};

export default ShopsManager;

