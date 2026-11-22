import React, { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Form,
  AutoComplete,
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
} from 'antd';
import {
  AppstoreOutlined,
  UploadOutlined,
  PlusOutlined,
  PlusCircleOutlined,
  SaveOutlined,
  EditOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../utils';
import { subCategoryArchetype } from '../../utils/form_schema';
import { getShopSubCategoryIds } from '../../utils/shopSubCategories';
import { colors, radii, typography, shadows } from '../../styles/theme';

const { Text } = Typography;
const { Option } = Select;

/**
 * Determine the shop's domain archetype based on its category or shop type
 */
export const getShopArchetype = (shop) => {
  // The shop's sub-category says what it sells; the text guess below is for shops without one
  const fromSubCategory = subCategoryArchetype(shop);
  if (fromSubCategory) return fromSubCategory;
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
    defaultUnit: 'plate',
    unitOptions: ['plate', 'portion', 'pack', 'kg', 'piece'],
    sectionPlaceholder: 'e.g. Biryani & Rice, Starters & Fry, Gravies, Beverages',
    addTitle: 'Add Dish / Beverage to Menu',
  },
  medical: {
    label: 'Pharmacy & Healthcare Item',
    defaultUnit: 'strip',
    unitOptions: ['strip', 'bottle', 'piece', 'box', 'pack', 'tube'],
    sectionPlaceholder: 'e.g. Prescription Drugs, OTC & First Aid, Baby Care, Wellness',
    addTitle: 'Add Medicine / Healthcare Product',
  },
  product: {
    label: 'Retail / Physical Product',
    defaultUnit: 'piece',
    unitOptions: ['piece', 'kg', 'pack', 'box', 'meter', 'liter'],
    sectionPlaceholder: 'e.g. Staples & Grains, Cooking Oils, Snacks, Dairy',
    addTitle: 'Add Product to Store Catalog',
  },
  service: {
    label: 'Service Package / Visit',
    defaultUnit: 'visit',
    unitOptions: ['visit', 'service', 'session', 'hour'],
    sectionPlaceholder: 'e.g. Diagnostics & Inspection, Repair, Installation',
    addTitle: 'Add Service Package',
  },
  rental: {
    label: 'Rental Asset / Equipment',
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
  width = 'min(650px, calc(100vw - 32px))',
  onOpenImportCsv = null,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  // Master-catalog autofill (new products only)
  const [autofillText, setAutofillText] = useState('');
  const [autofillDebounced, setAutofillDebounced] = useState('');
  const [autofillOptions, setAutofillOptions] = useState([]);
  const [autofillHidden, setAutofillHidden] = useState(false);
  const autofillSeq = useRef(0);
  const [categoriesList, setCategoriesList] = useState([]);
  // The sub-category this item follows: one of the shop's own sub-categories, picked per item
  const [selectedSubId, setSelectedSubId] = useState(null);
  const shopSubIds = useMemo(() => getShopSubCategoryIds(shop), [shop]);


  // Derive default shop archetype and category
  const storeArchetype = getShopArchetype(shop);
  const defaultListingType =
    shop?.shopSubCategory?.listing_type || getListingTypeFromArchetype(storeArchetype);

  // Current active listing type
  const [currentType, setCurrentType] = useState(defaultListingType);

  // The category tree, with every sub-category's form
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

  const allSubCategories = useMemo(
    () => categoriesList.flatMap((c) => (c.sub_categories || []).map((sc) => ({ ...sc, categoryName: c.name }))),
    [categoriesList]
  );

  // The sub-category and category this item follows
  const activeSub = useMemo(() => {
    const id = selectedSubId ?? shopSubIds[0] ?? null;
    if (id === null || id === undefined) return null;
    return allSubCategories.find((sc) => sc.id === id) || (shop?.shopSubCategory?.id === id ? shop.shopSubCategory : null);
  }, [selectedSubId, shopSubIds, shop, allSubCategories]);

  const activeCategory = useMemo(() => {
    const id = activeSub?.category_id ?? shop?.category_id ?? null;
    return categoriesList.find((c) => c.id === id) || shop?.shopCategory || null;
  }, [activeSub, shop, categoriesList]);

  // Form, most specific first: the shop's own form, its sub-category's, then its category's
  const isCustomShopForm = Boolean(shop?.form_schema && Array.isArray(shop.form_schema) && shop.form_schema.length > 0);
  const dynamicFields = useMemo(() => {
    if (isCustomShopForm) return shop.form_schema;
    if (Array.isArray(activeSub?.form_schema) && activeSub.form_schema.length > 0) return activeSub.form_schema;
    if (Array.isArray(activeCategory?.form_schema)) return activeCategory.form_schema;
    return [];
  }, [shop, activeSub, activeCategory, isCustomShopForm]);

  // The item's sub-category is picked from the shop's own sub-categories, grouped by category.
  // If the category tree has not loaded yet, the active one is still offered so its name shows.
  const shopSubOptions = useMemo(() => {
    const groups = categoriesList
      .map((c) => ({
        label: c.name,
        options: (c.sub_categories || [])
          .filter((sc) => shopSubIds.includes(sc.id))
          .map((sc) => ({ value: sc.id, label: sc.name })),
      }))
      .filter((g) => g.options.length > 0);
    if (groups.length === 0 && activeSub?.id !== undefined && activeSub?.id !== null) {
      return [{ label: activeCategory?.name || 'Your store', options: [{ value: activeSub.id, label: activeSub.name }] }];
    }
    return groups;
  }, [categoriesList, shopSubIds, activeSub, activeCategory]);

  // Debounce the autofill search box
  useEffect(() => {
    const t = setTimeout(() => setAutofillDebounced(autofillText.trim()), 300);
    return () => clearTimeout(t);
  }, [autofillText]);

  // Search the master catalog for new products. A failed search hides the box quietly.
  useEffect(() => {
    if (!open || editingItem) return;
    if (autofillDebounced.length < 2) {
      autofillSeq.current += 1;
      setAutofillOptions([]);
      return;
    }
    const seq = ++autofillSeq.current;
    netWorkCall(
      // With a shop, the search covers all of the shop's sub-categories and ranks its items first
      `${apiConfig.catalog_search}?q=${encodeURIComponent(autofillDebounced)}&limit=8${
        shop?.id ? `&shop_id=${encodeURIComponent(shop.id)}` : ''
      }`,
      'GET',
      null,
      true
    )
      .then((res) => {
        if (seq !== autofillSeq.current) return;
        if (!res?.success || !Array.isArray(res.data)) {
          setAutofillHidden(true);
          setAutofillOptions([]);
          return;
        }
        setAutofillHidden(false);
        setAutofillOptions(
          res.data.map((item) => ({
            value: `${item.id}`,
            item,
            label: (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                  {item.for_your_shop && (
                    <Tag color="green" style={{ marginInlineStart: 6, fontSize: 11 }}>
                      For your shop
                    </Tag>
                  )}
                </div>
                <div style={{ fontSize: 12, color: colors.textMuted }}>
                  {[item.brand, item.quantity_label, item.category].filter(Boolean).join(' · ')}
                </div>
              </div>
            ),
          }))
        );
      })
      .catch(() => {
        if (seq !== autofillSeq.current) return;
        setAutofillHidden(true);
        setAutofillOptions([]);
      });
  }, [open, editingItem, autofillDebounced, shop]);

  // Prefill the fields this form has from a catalog item
  const applyCatalogItem = (item) => {
    const current = form.getFieldsValue(['name', 'img_url', 'description']);
    const brandLine = [item.brand && `Brand: ${item.brand}`, item.quantity_label && `Pack: ${item.quantity_label}`]
      .filter(Boolean)
      .join(' · ');
    const values = {};
    if (item.name) values.name = item.name;
    if (item.image_url) values.img_url = item.image_url;
    if (brandLine && !current.description) values.description = brandLine;
    form.setFieldsValue(values);
    setAutofillText('');
    setAutofillDebounced('');
    setAutofillOptions([]);
    message.success('Filled from master catalog. Review the details and set your price.');
  };

  // Sync form values on open/edit
  useEffect(() => {
    if (open) {
      if (editingItem) {
        const itemType = editingItem.listing_type || defaultListingType;
        setCurrentType(itemType);
        const itemSub = Number.parseInt(editingItem.metadata?.sub_category_id, 10);
        setSelectedSubId(Number.isInteger(itemSub) && shopSubIds.includes(itemSub) ? itemSub : shopSubIds[0] ?? null);

        form.setFieldsValue({
          ...editingItem,
          metadata: editingItem.metadata || {},
        });
      } else {
        form.resetFields();
        setCurrentType(defaultListingType);
        setSelectedSubId(shopSubIds[0] ?? null);

        const config = TYPE_CONFIG[storeArchetype] || TYPE_CONFIG.product;
        form.setFieldsValue({
          listing_type: defaultListingType,
          unit: config.defaultUnit,
          metadata: {
            allow_instant_order: true,
            allow_enquiry: true,
            // A category form brings its own defaults; these are for the
            // built-in fields shown when no form is configured.
            ...(dynamicFields.length > 0
              ? {}
              : {
                  food_type: 'veg',
                  min_rental_days: 1,
                  prep_time_mins: 15,
                  duration_mins: 45,
                  service_mode: 'both',
                }),
          },
        });
      }
    }
  }, [open, editingItem, shop, shopSubIds, defaultListingType, storeArchetype]);

  // Show a rejected save: the server names the custom fields that need fixing
  const showSaveError = (res, fallback) => {
    const fieldErrors = Array.isArray(res?.errors) ? res.errors.filter((e) => e?.key) : [];
    if (fieldErrors.length > 0) {
      form.setFields(
        fieldErrors.map((e) => ({ name: ['metadata', e.key], errors: [e.message] }))
      );
    }
    message.error(res?.error || fallback);
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
          // The item's own sub-category when the shop sells in more than one; a single-sub-category
          // shop lets the server fill in the ids and name
          ...((shopSubIds.length > 1 || shop?.allow_multi_category) && activeSub
            ? { sub_category_id: activeSub.id, category_id: activeSub.category_id }
            : {}),
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
          showSaveError(res, 'Failed to update listing');
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
          showSaveError(res, 'Failed to add item');
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

  const categoryDisplayName =
    activeSub?.name || activeCategory?.name || shop?.shopCategory?.name || shop?.shop_type || 'General Store';

  return (
    <Modal
      title={
        <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {editingItem ? <EditOutlined style={{ color: colors.primary }} /> : <PlusCircleOutlined style={{ color: colors.primary }} />}
          {modalTitle}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={width}
      style={{ maxWidth: 'calc(100vw - 32px)', top: 16 }}
      styles={{ body: { maxHeight: 'max(300px, calc(100vh - 150px))', overflowY: 'auto', paddingRight: 4 } }}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        style={{ marginTop: 8, fontFamily: typography.fontFamily.body }}
      >
        {/* Autofill from the master catalog (new products only) */}
        {!editingItem && !autofillHidden && (
          <div
            style={{
              background: colors.primaryLight,
              border: `1px solid ${colors.verifiedChipBorder}`,
              borderRadius: radii.lg,
              padding: '10px 14px',
              marginBottom: 16,
            }}
          >
            <Text
              strong
              style={{ display: 'block', fontSize: 13, color: colors.textMain, fontFamily: typography.fontFamily.headline, marginBottom: 6 }}
            >
              Autofill from master catalog
            </Text>
            <AutoComplete
              value={autofillText}
              options={autofillOptions}
              onChange={(v, option) => {
                // A selection also fires onChange with the option; applyCatalogItem clears the box.
                // Typed text comes with an empty option object ({}), not undefined.
                if (!option?.item) setAutofillText(typeof v === 'string' ? v : '');
              }}
              onSelect={(_, option) => applyCatalogItem(option.item)}
              style={{ width: '100%' }}
              popupMatchSelectWidth
              aria-label="Autofill from master catalog"
            >
              <Input
                prefix={<SearchOutlined style={{ color: colors.textMuted }} />}
                placeholder="Start typing a product, e.g. amul butter"
                size="large"
                style={{ borderRadius: radii.md }}
              />
            </AutoComplete>
          </div>
        )}

        {/* Store Business Category Badge */}
        <div
          style={{
            background: colors.surfaceContainerLow,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.lg,
            padding: '10px 14px',
            marginBottom: 16,
          }}
        >
          <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
            <div>
              <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
                Store Business Category
              </Text>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: colors.textMain,
                  fontFamily: typography.fontFamily.headline,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 2,
                  flexWrap: 'wrap',
                }}
              >
                <span>{categoryDisplayName}</span>
                <Tag
                  style={{
                    fontSize: 11,
                    padding: '1px 8px',
                    borderRadius: radii.xs,
                    margin: 0,
                    fontWeight: 600,
                    fontFamily: typography.fontFamily.body,
                    background:
                      storeArchetype === 'service' || storeArchetype === 'wellness'
                        ? colors.serviceChipBg
                        : colors.verifiedChipBg,
                    borderColor:
                      storeArchetype === 'service' || storeArchetype === 'wellness'
                        ? colors.serviceChipBorder
                        : colors.verifiedChipBorder,
                    color:
                      storeArchetype === 'service' || storeArchetype === 'wellness'
                        ? colors.serviceChipText
                        : colors.verifiedChipText,
                  }}
                >
                  {storeArchetype === 'service' || storeArchetype === 'wellness' ? 'Service Business' : 'Product Store'}
                </Tag>
              </div>
            </div>
            {!editingItem && onOpenImportCsv && (
              <Button
                icon={<UploadOutlined />}
                size="small"
                onClick={() => {
                  onClose();
                  onOpenImportCsv();
                }}
                style={{
                  borderRadius: radii.md,
                  fontWeight: 600,
                  fontSize: 12,
                  borderColor: colors.primary,
                  color: colors.primary,
                  fontFamily: typography.fontFamily.body,
                }}
              >
                Import via CSV
              </Button>
            )}
          </Flex>
          {shopSubOptions.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
                This item belongs to
              </Text>
              <Select
                showSearch
                optionFilterProp="label"
                value={activeSub?.id}
                options={shopSubOptions}
                onChange={(id) => setSelectedSubId(id)}
                placeholder="Choose a sub-category for this item"
                style={{ width: '100%', marginTop: 4 }}
                aria-label="Sub-category for this item"
              />
              {shopSubIds.length > 1 && (
                <Text style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                  Only the sub-categories your store sells in are listed.
                </Text>
              )}
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
              <Input placeholder="https://example.com/product-photo" />
            </Form.Item>
          </Col>
        </Row>

        {/* ========================================================================= */}
        {/* DYNAMIC SCHEMA FIELDS (Configured by Platform Admin for this Category)    */}
        {/* ========================================================================= */}
        {dynamicFields.length > 0 ? (
          <div
            style={{
              background: colors.surfaceContainerLow,
              padding: '14px 16px',
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              marginBottom: 16,
            }}
          >
            <Flex align="center" gap={6} style={{ marginBottom: 12 }}>
              <AppstoreOutlined style={{ color: colors.primary }} />
              <Text
                strong
                style={{
                  fontSize: 13,
                  color: colors.textMain,
                  fontFamily: typography.fontFamily.headline,
                }}
              >
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
                      <Radio.Button value="veg">Pure Veg</Radio.Button>
                      <Radio.Button value="non-veg">Non-Veg</Radio.Button>
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
        <div
          style={{
            background: colors.surfaceContainerLow,
            border: `1px solid ${colors.border}`,
            padding: '10px 14px',
            borderRadius: radii.md,
            marginBottom: 16,
          }}
        >
          <Text
            strong
            style={{
              fontSize: 13,
              display: 'block',
              marginBottom: 6,
              color: colors.textMain,
              fontFamily: typography.fontFamily.headline,
            }}
          >
            Customer Ordering &amp; Enquiry Settings:
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

        {/* Submit Buttons (sticky at the bottom of the scrolling body so they stay reachable on phones) */}
        <Flex
          justify="end"
          gap={10}
          wrap="wrap"
          style={{ position: 'sticky', bottom: -10, background: colors.surface, padding: '10px 0 2px', zIndex: 2 }}
        >
          <Button
            onClick={onClose}
            style={{
              borderRadius: radii.md,
              borderColor: colors.border,
              color: colors.textMain,
              fontWeight: 600,
              fontFamily: typography.fontFamily.body,
            }}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={editingItem ? <SaveOutlined /> : <PlusOutlined />}
            loading={submitting}
            style={{
              fontWeight: 700,
              background: colors.primary,
              borderColor: colors.primary,
              borderRadius: radii.md,
              boxShadow: shadows.primary,
              fontFamily: typography.fontFamily.body,
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
  onOpenImportCsv: PropTypes.func,
  shop: PropTypes.object,
  editingItem: PropTypes.object,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export default AddProductModal;
