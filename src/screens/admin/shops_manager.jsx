import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Tag,
  Select,
  Flex,
  Avatar,
} from 'antd';
import {
  ShopOutlined,
  SettingOutlined,
  ReloadOutlined,
  BuildOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { apiConfig, netWorkCall } from '../../app/utils';
import { colors, radii, typography } from '../../app/styles/theme';
import FormSchemaBuilderModal from './form_schema_builder';

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
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Store Name
        </span>
      ),
      key: 'shop_name',
      render: (_, record) => (
        <Flex align="center" gap={10}>
          <Avatar
            shape="square"
            size={40}
            src={record.img_url}
            icon={<ShopOutlined />}
            style={{ borderRadius: radii.md, background: colors.primaryLight, color: colors.primary }}
          />
          <div>
            <div style={{ fontWeight: 700, color: colors.textMain, fontSize: 14, fontFamily: typography.fontFamily.headline }}>
              {record.shop_name}
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
              <EnvironmentOutlined style={{ marginRight: 4, color: colors.tertiary }} />
              {record.area || record.address || 'Location not specified'}
            </div>
          </div>
        </Flex>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Category / Archetype
        </span>
      ),
      key: 'category',
      render: (_, record) => {
        const catName = record.shopCategory?.name || record.shop_type || 'General Store';
        return (
          <Tag
            style={{
              fontWeight: 600,
              borderRadius: radii.full,
              padding: '2px 10px',
              background: colors.serviceChipBg,
              borderColor: colors.serviceChipBorder,
              color: colors.serviceChipText,
              fontSize: 12,
              fontFamily: typography.fontFamily.body,
            }}
          >
            {catName}
          </Tag>
        );
      },
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Owner & Contact
        </span>
      ),
      key: 'owner',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: colors.textMain, fontFamily: typography.fontFamily.body }}>
            {record.owner?.username || 'Owner'}
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
            <PhoneOutlined style={{ marginRight: 4, color: colors.secondary }} />
            {record.mobile_number || record.owner?.mobile || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Active Form Engine
        </span>
      ),
      key: 'form_schema',
      render: (_, record) => {
        const customCount = Array.isArray(record.form_schema) ? record.form_schema.length : 0;
        const hasCustom = customCount > 0;
        return (
          <div>
            {hasCustom ? (
              <Tag
                style={{
                  fontWeight: 700,
                  borderRadius: radii.full,
                  padding: '2px 10px',
                  background: colors.secondaryLight,
                  borderColor: 'rgba(1, 89, 197, 0.25)',
                  color: colors.secondary,
                  fontSize: 12,
                  fontFamily: typography.fontFamily.body,
                }}
              >
                <BuildOutlined style={{ marginRight: 4 }} />
                Custom Override ({customCount} fields)
              </Tag>
            ) : (
              <Tag
                style={{
                  fontWeight: 500,
                  borderRadius: radii.full,
                  padding: '2px 10px',
                  background: colors.surfaceContainerLow,
                  borderColor: colors.border,
                  color: colors.textMuted,
                  fontSize: 12,
                  fontFamily: typography.fontFamily.body,
                }}
              >
                Standard Category Form
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: (
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
          Action
        </span>
      ),
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
              borderRadius: radii.md,
              fontWeight: 600,
              fontFamily: typography.fontFamily.body,
              background: hasCustom ? colors.primary : colors.surface,
              borderColor: hasCustom ? colors.primary : colors.border,
              color: hasCustom ? colors.surface : colors.primary,
              boxShadow: hasCustom ? '0 2px 6px rgba(11, 45, 107, 0.16)' : 'none',
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
        <Flex wrap="wrap" gap={10} style={{ flex: '1 1 280px', minWidth: 0 }}>
          <Input.Search
            placeholder="Search stores by name, area, or mobile..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            style={{ width: '100%', maxWidth: 280, borderRadius: radii.md }}
          />

          <Select
            value={selectedCategory}
            onChange={handleCategoryFilter}
            style={{ width: '100%', maxWidth: 220, borderRadius: radii.md }}
          >
            <Select.Option value="all">All Category Types</Select.Option>
            {categories.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.name}
              </Select.Option>
            ))}
          </Select>
        </Flex>

        <Button
          icon={<ReloadOutlined />}
          onClick={() => fetchShops(pagination.current)}
          loading={loading}
          style={{
            borderRadius: radii.md,
            borderColor: colors.border,
            color: colors.textMain,
            fontWeight: 600,
            fontFamily: typography.fontFamily.body,
          }}
        >
          Refresh
        </Button>
      </Flex>

      {/* Stores Table */}
      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          overflow: 'hidden',
          background: colors.surface,
        }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={shopsList}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            ...pagination,
            onChange: (page) => fetchShops(page),
          }}
        />
      </div>

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

