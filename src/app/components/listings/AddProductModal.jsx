import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
  Row,
  Col,
  Button,
  Radio,
  Checkbox,
  Switch,
  Tag,
  Flex,
  message,
  Space,
  Divider,
} from 'antd';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../utils';

const { Text } = Typography;
const { Option } = Select;

/**
 * Determine the shop's domain archetype based on its category or shop type
 */
export const getShopArchetype = (shop) => {
  const typeStr = (
    (shop?.shop_type || '') +
    ' ' +
    (shop?.shopCategory?.name || '') +
    ' ' +
    (shop?.shopSubCategory?.name || '')
  ).toLowerCase();

  if (
    typeStr.includes('health') ||
    typeStr.includes('med') ||
    typeStr.includes('pharm') ||
    typeStr.includes('clinic') ||
    typeStr.includes('doctor')
  ) {
    return 'medical';
  }
  if (
    typeStr.includes('restaurant') ||
    typeStr.includes('food') ||
    typeStr.includes('bakery') ||
    typeStr.includes('cafe') ||
    typeStr.includes('biri') ||
    typeStr.includes('tiffin') ||
    typeStr.includes('hotel') ||
    typeStr.includes('eatery')
  ) {
    return 'food';
  }
  if (
    typeStr.includes('electric') ||
    typeStr.includes('hardware') ||
    typeStr.includes('technician') ||
    typeStr.includes('plumb') ||
    typeStr.includes('service') ||
    typeStr.includes('laundry') ||
    typeStr.includes('repair') ||
    typeStr.includes('clean') ||
    typeStr.includes('mechanic') ||
    typeStr.includes('contractor')
  ) {
    return 'service';
  }
  if (
    typeStr.includes('salon') ||
    typeStr.includes('spa') ||
    typeStr.includes('massage') ||
    typeStr.includes('beauty') ||
    typeStr.includes('barber')
  ) {
    return 'wellness';
  }
  if (
    typeStr.includes('rental') ||
    typeStr.includes('bike') ||
    typeStr.includes('audio') ||
    typeStr.includes('sport') ||
    typeStr.includes('turf') ||
    typeStr.includes('vehicle') ||
    typeStr.includes('car rental')
  ) {
    return 'rental';
  }
  return 'product';
};

/**
 * Map shop archetype to database listing_type
 */
export const getListingTypeFromArchetype = (archetype) => {
  if (archetype === 'food') return 'food';
  if (archetype === 'service' || archetype === 'wellness') return 'service';
  if (archetype === 'rental') return 'rental';
  return 'product';
};

const TYPE_CONFIG = {
  food: {
    label: 'Food Dish / Menu Item',
    icon: '🍽️',
    defaultUnit: 'plate',
    unitOptions: ['plate', 'portion', 'pack', 'kg', 'piece'],
    sectionPlaceholder: 'e.g. Biryani & Rice, Starters & Fry, Gravies, Beverages',
    addTitle: 'Add Dish / Beverage to Menu',
  },
  medical: {
    label: 'Pharmacy & Healthcare Item',
    icon: '💊',
    defaultUnit: 'strip',
    unitOptions: ['strip', 'bottle', 'piece', 'box', 'pack', 'tube'],
    sectionPlaceholder: 'e.g. Prescription Drugs, OTC & First Aid, Baby Care, Wellness',
    addTitle: 'Add Medicine / Healthcare Product',
  },
  product: {
    label: 'Retail / Physical Product',
    icon: '🛒',
    defaultUnit: 'piece',
    unitOptions: ['piece', 'kg', 'pack', 'box', 'meter', 'liter'],
    sectionPlaceholder: 'e.g. Staples & Grains, Cooking Oils, Snacks, Dairy',
    addTitle: 'Add Product to Store Catalog',
  },
  service: {
    label: 'Service Package / Visit',
    icon: '🔧',
    defaultUnit: 'visit',
    unitOptions: ['visit', 'service', 'session', 'hour'],
    sectionPlaceholder: 'e.g. Diagnostics & Inspection, Repair, Installation',
    addTitle: 'Add Service Package',
  },
  rental: {
    label: 'Rental Asset / Equipment',
    icon: '🏍️',
    defaultUnit: 'day',
    unitOptions: ['day', 'hour', 'week', 'month'],
    sectionPlaceholder: 'e.g. Bikes & Scooters, DJ & Audio Equipment, Event Lighting',
    addTitle: 'Add Rental Asset',
  },
};

/**
 * Reusable Add / Edit Product Component
 */
const AddProductModal = ({
  open,
  onClose,
  onSuccess,
  shop,
  editingItem = null,
  width = 650,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);


  // Derive default shop archetype and category
  const storeArchetype = getShopArchetype(shop);
  const defaultListingType = getListingTypeFromArchetype(storeArchetype);

  // Current active listing type
  const [currentType, setCurrentType] = useState(defaultListingType);

  // Fetch all categories with form_schema if multi-category is allowed
  useEffect(() => {
    if (open) {
      netWorkCall(apiConfig.my_categories, 'GET', null, false)
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setCategoriesList(res.data);
          }
        })
        .catch(() => {});
    }
  }, [open]);

  // Determine active category record
  const activeCategory = useMemo(() => {
    if (selectedCategoryId) {
      const found = categoriesList.find((c) => c.id === selectedCategoryId);
      if (found) return found;
    }
    if (shop?.shopCategory) {
      // Find full category with schema if present in categoriesList
      const matchInList = categoriesList.find((c) => c.id === shop.shopCategory.id);
      return matchInList || shop.shopCategory;
    }
    return null;
  }, [selectedCategoryId, shop, categoriesList]);

  // Form schema: prioritize specific shop override, then fall back to standard category schema
  const isCustomShopForm = Boolean(shop?.form_schema && Array.isArray(shop.form_schema) && shop.form_schema.length > 0);
  const dynamicFields = useMemo(() => {
    if (isCustomShopForm) {
      return shop.form_schema;
    }
    if (activeCategory?.form_schema && Array.isArray(activeCategory.form_schema)) {
      return activeCategory.form_schema;
    }
    return [];
  }, [shop, activeCategory, isCustomShopForm]);

  // Sync form values on open/edit
  useEffect(() => {
    if (open) {
      if (editingItem) {
        const itemType = editingItem.listing_type || defaultListingType;
        setCurrentType(itemType);
        setSelectedCategoryId(editingItem.metadata?.category_id || shop?.category_id || null);

        form.setFieldsValue({
          ...editingItem,
          metadata: editingItem.metadata || {},
        });
      } else {
        form.resetFields();
        setCurrentType(defaultListingType);
        setSelectedCategoryId(shop?.category_id || null);

        const config = TYPE_CONFIG[storeArchetype] || TYPE_CONFIG.product;
        form.setFieldsValue({
          listing_type: defaultListingType,
          unit: config.defaultUnit,
          metadata: {
            allow_instant_order: true,
            allow_enquiry: true,
            food_type: 'veg',
            min_rental_days: 1,
            prep_time_mins: 15,
            duration_mins: 45,
            service_mode: 'both',
          },
        });
      }
    }
  }, [open, editingItem, shop, defaultListingType, storeArchetype]);

  const handleFinish = async (values) => {
    if (!shop?.id) {
      message.error('No shop selected');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...values,
        shop_id: shop.id,
        listing_type: currentType,
        metadata: {
          ...(editingItem?.metadata || {}),
          ...(values.metadata || {}),
          category_id: selectedCategoryId || shop?.category_id || null,
          category_name: activeCategory?.name || shop?.shopCategory?.name || null,
        },
      };

      if (editingItem?.id) {
        // Update existing listing
        const res = await netWorkCall(
          `${apiConfig.listings_update}/${editingItem.id}`,
          'PUT',
          JSON.stringify(payload)
        );
        if (res?.success) {
          message.success('Listing updated successfully');
          onSuccess?.(res.data);
          onClose();
        } else {
          message.error(res?.error || 'Failed to update listing');
        }
      } else {
        // Create new listing
        const res = await netWorkCall(
          apiConfig.listings_create,
          'POST',
          JSON.stringify(payload)
        );
        if (res?.success) {
          message.success('Item added to catalog');
          onSuccess?.(res.data);
          onClose();
        } else {
          message.error(res?.error || 'Failed to add item');
        }
      }
    } catch (err) {
      console.error('Error saving listing:', err);
      message.error('An unexpected error occurred while saving');
    } finally {
      setSubmitting(false);
    }
  };

  const currentConfig = TYPE_CONFIG[storeArchetype] || TYPE_CONFIG.product;
  const modalTitle = editingItem
    ? `Edit ${editingItem.name || 'Listing'}`
    : `Add Item — ${shop?.shop_name || 'Store'}`;

  const categoryDisplayName = activeCategory?.name || shop?.shopCategory?.name || shop?.shop_type || 'General Store';

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={onClose}
      footer={null}
      width={width}
      style={{ maxWidth: 'calc(100vw - 24px)', top: 20 }}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        style={{ marginTop: 8 }}
      >
        {/* Store Business Category Badge */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 16,
          }}
        >
          <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                Store Business Category
              </Text>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 2,
                }}
              >
                <span>{categoryDisplayName}</span>
                <Tag
                  color={storeArchetype === 'service' || storeArchetype === 'wellness' ? 'blue' : 'green'}
                  style={{ fontSize: 11, padding: '1px 8px', borderRadius: 6, margin: 0, fontWeight: 600 }}
                >
                  {storeArchetype === 'service' || storeArchetype === 'wellness' ? 'Service Business' : 'Product Store'}
                </Tag>
              </div>
            </div>
          </Flex>
        </div>

        {/* Hidden field for form binding */}
        <Form.Item name="listing_type" hidden initialValue={currentType}>
          <Input />
        </Form.Item>

        {/* Item Name */}
        <Form.Item
          name="name"
          label={
            storeArchetype === 'food'
              ? 'Dish / Beverage Name'
              : storeArchetype === 'service'
              ? 'Service Package Title'
              : storeArchetype === 'rental'
              ? 'Asset / Equipment Name'
              : storeArchetype === 'medical'
              ? 'Medicine / Healthcare Product Name'
              : 'Product Name'
          }
          rules={[{ required: true, message: 'Please enter item name' }]}
        >
          <Input
            placeholder={
              storeArchetype === 'medical'
                ? 'e.g. Paracetamol 500mg (Strip of 10 Tablets)'
                : storeArchetype === 'food'
                ? 'e.g. Chicken Dum Biryani (Family Pack)'
                : storeArchetype === 'service'
                ? 'e.g. Split AC Deep Jet Cleaning & Service'
                : storeArchetype === 'rental'
                ? 'e.g. Royal Enfield Hunter 350 (Daily)'
                : 'e.g. India Gate Basmati Rice 5kg'
            }
          />
        </Form.Item>

        {/* Store Section / Subcategory */}
        <Form.Item
          name={['metadata', 'section']}
          label="Store Section / Category Tab"
          tooltip="Groups items neatly into menu tabs on your public storefront"
        >
          <Input placeholder={currentConfig.sectionPlaceholder} />
        </Form.Item>

        {/* Price & MRP */}
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="price"
              label="Selling Price (₹)"
              rules={[{ required: true, message: 'Please enter price' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder="250"
                precision={2}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="mrp" label="Standard Rate / MRP (₹)">
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder="299"
                precision={2}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Unit & Image */}
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12}>
            <Form.Item name="unit" label="Unit / Basis" rules={[{ required: true }]}>
              <Select>
                {currentConfig.unitOptions.map((opt) => (
                  <Option key={opt} value={opt}>
                    {opt}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="img_url" label="Image URL">
              <Input placeholder="https://images.unsplash.com/..." />
            </Form.Item>
          </Col>
        </Row>

        {/* ========================================================================= */}
        {/* DYNAMIC SCHEMA FIELDS (Configured by Platform Admin for this Category)    */}
        {/* ========================================================================= */}
        {dynamicFields.length > 0 ? (
          <div
            style={{
              background: '#f8fafc',
              padding: '14px 16px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              marginBottom: 16,
            }}
          >
            <Flex align="center" gap={6} style={{ marginBottom: 12 }}>
              <AppstoreOutlined style={{ color: '#4f46e5' }} />
              <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
                {isCustomShopForm ? `${shop?.shop_name || 'Store'} Custom Specifications` : `${categoryDisplayName} Specifications`}
              </Text>
            </Flex>

            <Row gutter={[12, 0]}>
              {dynamicFields.map((field) => {
                const rules = field.required
                  ? [{ required: true, message: `Please provide ${field.label}` }]
                  : [];

                return (
                  <Col
                    xs={24}
                    sm={field.type === 'textarea' ? 24 : 12}
                    key={field.key}
                  >
                    {field.type === 'select' && (
                      <Form.Item
                        name={['metadata', field.key]}
                        label={field.label}
                        rules={rules}
                        initialValue={field.defaultValue || (field.options?.[0] || undefined)}
                      >
                        <Select placeholder={`Select ${field.label}`}>
                          {field.options?.map((opt) => (
                            <Option key={opt} value={opt}>
                              {opt}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    )}

                    {field.type === 'radio' && (
                      <Form.Item
                        name={['metadata', field.key]}
                        label={field.label}
                        rules={rules}
                        initialValue={field.defaultValue || field.options?.[0]}
                      >
                        <Radio.Group>
                          {field.options?.map((opt) => (
                            <Radio.Button key={opt} value={opt}>
                              {opt}
                            </Radio.Button>
                          ))}
                        </Radio.Group>
                      </Form.Item>
                    )}

                    {field.type === 'boolean' && (
                      <Form.Item
                        name={['metadata', field.key]}
                        label={field.label}
                        valuePropName="checked"
                        initialValue={Boolean(field.defaultValue)}
                      >
                        <Switch checkedChildren="Yes" unCheckedChildren="No" />
                      </Form.Item>
                    )}

                    {field.type === 'number' && (
                      <Form.Item
                        name={['metadata', field.key]}
                        label={field.label}
                        rules={rules}
                        initialValue={field.defaultValue}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          placeholder={field.placeholder || `Enter ${field.label}`}
                        />
                      </Form.Item>
                    )}

                    {field.type === 'date' && (
                      <Form.Item
                        name={['metadata', field.key]}
                        label={field.label}
                        rules={rules}
                      >
                        <Input type="date" style={{ width: '100%' }} />
                      </Form.Item>
                    )}

                    {field.type === 'textarea' && (
                      <Form.Item
                        name={['metadata', field.key]}
                        label={field.label}
                        rules={rules}
                      >
                        <Input.TextArea
                          rows={2}
                          placeholder={field.placeholder || `Enter ${field.label}`}
                        />
                      </Form.Item>
                    )}

                    {(!field.type || field.type === 'text') && (
                      <Form.Item
                        name={['metadata', field.key]}
                        label={field.label}
                        rules={rules}
                      >
                        <Input
                          placeholder={field.placeholder || `Enter ${field.label}`}
                        />
                      </Form.Item>
                    )}
                  </Col>
                );
              })}
            </Row>
          </div>
        ) : (
          /* Backward-compatibility fallback for classic types when schema not yet generated */
          <>
            {currentType === 'food' && (
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <Form.Item name={['metadata', 'food_type']} label="Dietary Tag" initialValue="veg">
                    <Radio.Group>
                      <Radio.Button value="veg">🟢 Pure Veg</Radio.Button>
                      <Radio.Button value="non-veg">🔴 Non-Veg</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name={['metadata', 'prep_time_mins']} label="Prep Time (Mins)" initialValue={15}>
                    <InputNumber style={{ width: '100%' }} min={5} step={5} />
                  </Form.Item>
                </Col>
              </Row>
            )}

            {currentType === 'rental' && (
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <Form.Item name={['metadata', 'security_deposit']} label="Refundable Deposit (₹)">
                    <InputNumber style={{ width: '100%' }} min={0} placeholder="1000" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name={['metadata', 'min_rental_days']} label="Min Rental Period (Days)" initialValue={1}>
                    <InputNumber style={{ width: '100%' }} min={1} />
                  </Form.Item>
                </Col>
              </Row>
            )}

            {currentType === 'service' && (
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <Form.Item name={['metadata', 'duration_mins']} label="Typical Duration (Mins)" initialValue={45}>
                    <InputNumber style={{ width: '100%' }} min={15} step={15} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name={['metadata', 'service_mode']} label="Service Mode" initialValue="both">
                    <Select>
                      <Option value="both">Both Available</Option>
                      <Option value="doorstep">Doorstep / Home Visit</Option>
                      <Option value="at_center">At Center / Shop</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            )}
          </>
        )}

        {/* Description / Scope */}
        <Form.Item name="description" label="Description / Details">
          <Input.TextArea
            rows={2}
            placeholder={
              storeArchetype === 'medical'
                ? 'Usage directions, storage instructions, precautions...'
                : storeArchetype === 'food'
                ? 'Portion size, ingredients, allergen info...'
                : storeArchetype === 'service'
                ? 'Scope of service, warranty, parts included...'
                : storeArchetype === 'rental'
                ? 'Rental terms, included accessories, fuel policy...'
                : 'Specifications, brand, volume or packaging details...'
            }
          />
        </Form.Item>

        {/* Customer Interaction Settings */}
        <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
            Customer Ordering & Enquiry Settings:
          </Text>
          <Space direction="vertical">
            <Form.Item
              name={['metadata', 'allow_instant_order']}
              valuePropName="checked"
              initialValue={true}
              noStyle
            >
              <Checkbox>Allow Direct Ordering / Cart Checkout</Checkbox>
            </Form.Item>
            <Form.Item
              name={['metadata', 'allow_enquiry']}
              valuePropName="checked"
              initialValue={true}
              noStyle
            >
              <Checkbox>Allow Direct Chat Enquiry / Quote Request</Checkbox>
            </Form.Item>
          </Space>
        </div>

        {/* Submit Buttons */}
        <Flex justify="end" gap={10}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            style={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              borderColor: 'transparent',
            }}
          >
            {editingItem ? 'Save Changes' : 'Add to Store Catalog'}
          </Button>
        </Flex>
      </Form>
    </Modal>
  );
};

AddProductModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  shop: PropTypes.object,
  editingItem: PropTypes.object,
  width: PropTypes.number,
};

export default AddProductModal;
