import React, { useState, useEffect } from 'react';
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
  Segmented,
  Tag,
  Flex,
  message,
  Space,
} from 'antd';
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
    typeStr.includes('mechanic')
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
  width = 600,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [showTypeOverride, setShowTypeOverride] = useState(false);

  // Derive shop's default listing type
  const storeArchetype = getShopArchetype(shop);
  const defaultListingType = getListingTypeFromArchetype(storeArchetype);

  // Current active listing type in modal
  const [currentType, setCurrentType] = useState(defaultListingType);

  // Sync modal state when opened or editingItem changes
  useEffect(() => {
    if (open) {
      if (editingItem) {
        const itemType = editingItem.listing_type || defaultListingType;
        setCurrentType(itemType);
        form.setFieldsValue({
          ...editingItem,
          metadata: editingItem.metadata || {},
        });
        setShowTypeOverride(itemType !== defaultListingType);
      } else {
        form.resetFields();
        setCurrentType(defaultListingType);
        setShowTypeOverride(false);

        const config = TYPE_CONFIG[defaultListingType] || TYPE_CONFIG.product;
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
  }, [open, editingItem, shop]);

  const handleTypeChange = (newType) => {
    setCurrentType(newType);
    form.setFieldsValue({
      listing_type: newType,
      unit: TYPE_CONFIG[newType]?.defaultUnit || 'piece',
    });
  };

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

  const currentConfig = TYPE_CONFIG[currentType] || TYPE_CONFIG.product;
  const modalTitle = editingItem
    ? `Edit ${editingItem.name || 'Listing'}`
    : currentConfig.addTitle;

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={onClose}
      footer={null}
      width={width}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        style={{ marginTop: 12 }}
      >
        {/* Smart Category Type Section (Auto-inherited from store) */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 16,
          }}
        >
          <Flex justify="space-between" align="center">
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                Item Category Type
              </Text>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <span>
                  {currentConfig.icon} {currentConfig.label}
                </span>
                <Tag
                  color={currentType === defaultListingType ? 'cyan' : 'orange'}
                  style={{ fontSize: 10, padding: '0 6px', borderRadius: 4, margin: 0, fontWeight: 600 }}
                >
                  {currentType === defaultListingType
                    ? `Auto-set from ${shop?.shop_name || 'Store'}`
                    : 'Custom Override'}
                </Tag>
              </div>
            </div>

            <Button
              type="link"
              size="small"
              onClick={() => setShowTypeOverride(!showTypeOverride)}
              style={{ fontWeight: 600, fontSize: 12, color: '#4f46e5', padding: 0 }}
            >
              {showTypeOverride ? 'Hide Options' : 'Change Type'}
            </Button>
          </Flex>

          {showTypeOverride && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                Need to add a different item type (e.g. cross-domain offering)? Select below:
              </Text>
              <Segmented
                block
                value={currentType}
                onChange={handleTypeChange}
                options={[
                  { label: '🛒 Product', value: 'product' },
                  { label: '🍽️ Food Dish', value: 'food' },
                  { label: '🔧 Service', value: 'service' },
                  { label: '🏍️ Rental', value: 'rental' },
                ]}
              />
            </div>
          )}
        </div>

        {/* Hidden field for form binding */}
        <Form.Item name="listing_type" hidden initialValue={currentType}>
          <Input />
        </Form.Item>

        {/* Item Name */}
        <Form.Item
          name="name"
          label={
            currentType === 'food'
              ? 'Dish / Beverage Name'
              : currentType === 'service'
              ? 'Service Package Title'
              : currentType === 'rental'
              ? 'Asset / Equipment Name'
              : 'Product Name'
          }
          rules={[{ required: true, message: 'Please enter item name' }]}
        >
          <Input
            placeholder={
              currentType === 'food'
                ? 'e.g. Chicken Dum Biryani (Family Pack)'
                : currentType === 'service'
                ? 'e.g. Split AC Deep Jet Cleaning & Service'
                : currentType === 'rental'
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
        <Row gutter={12}>
          <Col span={12}>
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
          <Col span={12}>
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
        <Row gutter={12}>
          <Col span={12}>
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
          <Col span={12}>
            <Form.Item name="img_url" label="Image URL">
              <Input placeholder="https://images.unsplash.com/..." />
            </Form.Item>
          </Col>
        </Row>

        {/* Conditional Archetype-Specific Fields */}
        {currentType === 'food' && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name={['metadata', 'food_type']} label="Dietary Tag" initialValue="veg">
                <Radio.Group>
                  <Radio.Button value="veg">🟢 Pure Veg</Radio.Button>
                  <Radio.Button value="non-veg">🔴 Non-Veg</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['metadata', 'prep_time_mins']} label="Prep Time (Mins)" initialValue={15}>
                <InputNumber style={{ width: '100%' }} min={5} step={5} />
              </Form.Item>
            </Col>
          </Row>
        )}

        {currentType === 'rental' && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name={['metadata', 'security_deposit']} label="Refundable Deposit (₹)">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="1000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['metadata', 'min_rental_days']} label="Min Rental Period (Days)" initialValue={1}>
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>
        )}

        {currentType === 'service' && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name={['metadata', 'duration_mins']} label="Typical Duration (Mins)" initialValue={45}>
                <InputNumber style={{ width: '100%' }} min={15} step={15} />
              </Form.Item>
            </Col>
            <Col span={12}>
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

        {/* Description / Scope */}
        <Form.Item name="description" label="Description / Details">
          <Input.TextArea
            rows={2}
            placeholder={
              currentType === 'food'
                ? 'Portion size, ingredients, allergen info...'
                : currentType === 'service'
                ? 'Scope of service, warranty, parts included...'
                : currentType === 'rental'
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
              <Checkbox>Allow Quote Requests & Direct Negotiation via Chat</Checkbox>
            </Form.Item>
          </Space>
        </div>

        {/* Action Buttons */}
        <Flex justify="flex-end" gap={8}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            style={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              border: 'none',
            }}
          >
            {editingItem ? 'Update Listing' : 'Save to Catalog'}
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

