import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  Col,
  Card,
  Button,
  Tag,
  Typography,
  Modal,
  Alert,
  Skeleton,
  Input,
  message,
  Spin,
  Empty,
  Badge,
  Flex,
  Grid,
  Segmented,
  Select,
} from 'antd';
import {
  PhoneOutlined,
  CompassOutlined,
  ShoppingCartOutlined,
  PlusOutlined,
  MinusOutlined,
  SafetyCertificateFilled,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  StarFilled,
  EditOutlined,
  ShopOutlined,
  EyeOutlined,
  CarOutlined,
} from '@ant-design/icons';
import ChatIcon from '../../app/components/common/ChatIcon';
import SubCategoryChips from '../../app/components/common/SubCategoryChips';
import {
  netWorkCall,
  apiConfig,
  resolveShopSchema,
  getAvailableFilters,
  matchesSchemaFilters,
} from '../../app/utils';
import { useGlobalStore, useChatStore, useCartStore } from '../../app/services';
import { isSellable, maxOrderQty, availabilityLabels, lowStockHint } from '../../app/utils/stock';
import { hasVariants, defaultVariant, findVariant, variantAsStock, cartLineKey, lineKeyOf } from '../../app/utils/variants';
import VariantPicker from '../../app/components/listings/VariantPicker';
import { useStorefront } from './useStorefrontSections';
import SectionChips from './SectionChips';
import SectionBlock from './SectionBlock';
import SectionGridDrawer, { PagedListingGrid } from './SectionGridDrawer';
import './storefront.css';
import Routes from '../../app/routes/routes';
import { colors, radii } from '../../app/styles/theme';

const { Title, Text, Paragraph } = Typography;

const StorefrontScreen = () => {
  const { shop_id } = useParams();
  const history = useHistory();
  const screens = Grid.useBreakpoint();

  const { user_data } = useGlobalStore((state) => state);
  const { handleChatOpen } = useChatStore((state) => state);
  const { cart, addItem, updateQuantity, openCart } = useCartStore((state) => state);

  const [shop, setShop] = useState(null);
  // Chosen options per listing with variants: { [listing_id]: { axis: value } }
  const [variantPicks, setVariantPicks] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [seeAllSection, setSeeAllSection] = useState(null);
  const [foodFilter, setFoodFilter] = useState('all'); // 'all', 'veg', 'non-veg'
  const [fieldFilters, setFieldFilters] = useState({}); // custom-field filters: { fieldKey: value }

  // Quote Request Modal State
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [quoteItem, setQuoteItem] = useState(null);
  const [quoteDesc, setQuoteDesc] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchShopData = async () => {
      setLoading(true);
      try {
        const shopRes = await netWorkCall(`${apiConfig.shop_details}/${shop_id}/details`, 'GET', null, false);
        if (isMounted && shopRes?.data) setShop(shopRes.data);
      } catch (err) {
        console.error('Error fetching storefront:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchShopData();
    return () => {
      isMounted = false;
    };
  }, [shop_id]);

  // Sections with their first items; the rest load as the customer scrolls (spec §F9)
  const storefront = useStorefront(shop_id);
  const visibleSections = storefront.sections;
  const loadedItems = useMemo(() => visibleSections.flatMap((s) => s.items || []), [visibleSections]);
  const listings = loadedItems;

  // Search in the store is server-side and paged
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().slice(0, 100)), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const isSearching = debouncedQuery.length > 0;

  // The chip of the section in view is the active one
  const sectionKey = visibleSections.map((s) => s.id).join(',');
  useEffect(() => {
    if (isSearching || typeof IntersectionObserver === 'undefined') return undefined;
    const blocks = Array.from(document.querySelectorAll('[data-section-id]'));
    if (blocks.length === 0) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSectionId(visible[0].target.getAttribute('data-section-id'));
      },
      { rootMargin: '-170px 0px -55% 0px' }
    );
    blocks.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, [sectionKey, isSearching, storefront.status, loading]);

  const jumpToSection = useCallback(
    (id) => {
      setActiveSectionId(String(id));
      storefront.loadSection(id);
      const el = document.getElementById(`sf-sec-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    // loadSection is stable for a shop
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storefront.loadSection]
  );

  // Determine store archetype based on shop_type, category, or listings
  const storeArchetype = useMemo(() => {
    const typeStr = (
      (shop?.shop_type || '') +
      ' ' +
      (shop?.shopCategory?.name || '')
    ).toLowerCase();

    if (
      typeStr.includes('restaurant') ||
      typeStr.includes('food') ||
      typeStr.includes('bakery') ||
      typeStr.includes('cafe') ||
      typeStr.includes('biri') ||
      typeStr.includes('tiffin') ||
      typeStr.includes('ice cream')
    ) {
      return 'food';
    }
    if (
      typeStr.includes('provision') ||
      typeStr.includes('supermarket') ||
      typeStr.includes('grocer') ||
      typeStr.includes('shoe') ||
      typeStr.includes('store') ||
      typeStr.includes('boutique') ||
      typeStr.includes('medical')
    ) {
      return 'product';
    }
    if (
      typeStr.includes('electric') ||
      typeStr.includes('hardware') ||
      typeStr.includes('technician') ||
      typeStr.includes('plumb') ||
      typeStr.includes('gas') ||
      typeStr.includes('laundry')
    ) {
      return 'service';
    }
    if (
      typeStr.includes('salon') ||
      typeStr.includes('spa') ||
      typeStr.includes('massage') ||
      typeStr.includes('beauty')
    ) {
      return 'wellness';
    }
    if (
      typeStr.includes('rental') ||
      typeStr.includes('bike') ||
      typeStr.includes('audio') ||
      typeStr.includes('sport') ||
      typeStr.includes('turf') ||
      typeStr.includes('mahal')
    ) {
      return 'rental';
    }

    // Fallback: check majority of listings
    const foodCount = listings.filter((i) => i.listing_type === 'food').length;
    const serviceCount = listings.filter((i) => i.listing_type === 'service').length;
    const rentalCount = listings.filter((i) => i.listing_type === 'rental').length;
    if (foodCount > 0 && foodCount >= serviceCount) return 'food';
    if (serviceCount > 0) return 'service';
    if (rentalCount > 0) return 'rental';
    return 'product';
  }, [shop, listings]);

  // Filters run on the items on screen (dietary switch and filterable form fields)
  const filterItem = useCallback(
    (item) => {
      if (foodFilter !== 'all' && item.listing_type === 'food') {
        const itemFoodType = item.metadata?.food_type;
        if (foodFilter === 'veg' && itemFoodType !== 'veg') return false;
        if (foodFilter === 'non-veg' && itemFoodType !== 'non-veg') return false;
      }
      return matchesSchemaFilters(item, fieldFilters);
    },
    [foodFilter, fieldFilters]
  );

  const hasFoodItems = listings.some((i) => i.listing_type === 'food');

  // Filters built from the form fields the admin marked as filterable. The
  // dietary tag is left out when the veg / non-veg switch already covers it.
  const schemaFilters = useMemo(
    () =>
      getAvailableFilters(
        storefront.filterFields.length > 0 ? storefront.filterFields : resolveShopSchema(shop),
        listings
      ).filter((field) => !(hasFoodItems && field.key === 'food_type')),
    [shop, listings, hasFoodItems, storefront.filterFields]
  );
  const hasActiveFieldFilters = Object.values(fieldFilters).some(
    (value) => value !== undefined && value !== null && value !== ''
  );
  const setFieldFilter = (key, value) =>
    setFieldFilters((prev) => ({ ...prev, [key]: value }));

  const isOwnStore = Boolean(user_data?.user_id && shop?.owner_id && user_data.user_id === shop.owner_id);

  const handleOpenQuote = (item) => {
    if (!user_data?.user_id) {
      message.info('Please login to request a quote');
      history.push(Routes.login);
      return;
    }
    if (isOwnStore) {
      message.info('You are viewing your own store. Open Manage Store to edit listings.');
      return;
    }
    setQuoteItem(item);
    setQuoteDesc(`I would like an estimate for: ${item.name}`);
    setQuoteModalVisible(true);
  };

  // The cart refuses items that are out of stock, or more than the counted stock
  const handleAddToCart = (item, variant = null) => {
    if (isOwnStore) {
      message.info('You are viewing your own store. Open Manage Store to edit listings.');
      return false;
    }
    const result = addItem(shop, item, variant);
    if (result && result.ok === false) {
      const name = variant ? `${item.name} (${variant.label})` : item.name;
      message.warning(
        result.reason === 'max'
          ? `Only ${result.max} in stock`
          : result.reason === 'variant'
          ? `Choose an option for ${item.name}`
          : `${name} is ${availabilityLabels(item.listing_type).off.toLowerCase()}`
      );
      return false;
    }
    return true;
  };

  const submitQuote = async () => {
    if (!quoteDesc.trim()) {
      message.error('Please describe your requirement');
      return;
    }

    setQuoteLoading(true);
    try {
      const payload = {
        shop_id,
        service_title: quoteItem?.name || 'Service Request',
        service_description: quoteDesc,
        estimated_amount: quoteItem?.price || 0,
      };

      const res = await netWorkCall(
        apiConfig.quotes_create,
        'POST',
        JSON.stringify(payload)
      );

      if (res?.data) {
        message.success('Quote request sent to merchant!');
        setQuoteModalVisible(false);
        setQuoteDesc('');
      } else {
        message.error(res?.error || "Couldn't send your request. Try again.");
      }
    } catch (err) {
      console.error(err);
      message.error('Error submitting quote');
    } finally {
      setQuoteLoading(false);
    }
  };

  const cartItemsForThisShop =
    cart.shop_id === shop_id
      ? cart.items.reduce((acc, it) => acc + (it.quantity || 1), 0)
      : 0;
  const cartSubtotal =
    cart.shop_id === shop_id
      ? cart.items.reduce((acc, it) => acc + it.unit_price * it.quantity, 0)
      : 0;

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '60vh' }}>
        <Spin size="large" tip="Loading Storefront..." />
      </Flex>
    );
  }

  if (!shop) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Empty description="Shop not found" />
        <Button type="primary" onClick={() => history.push(Routes.home)} style={{ marginTop: 16 }}>
          Back to Explore
        </Button>
      </div>
    );
  }

  const gridGutter = screens.xs ? [12, 12] : [16, 16];

  // One item card. Out-of-stock items are greyed with their label and can't be added.
  const renderItem = (item) => {
            // Variants: the chosen option set (default: cheapest available) drives price and stock
            const variantMode = hasVariants(item);
            const selection = variantMode ? variantPicks[item.id] || defaultVariant(item)?.option_values : null;
            const variant = variantMode ? findVariant(item, selection) : null;
            const stockView = variantMode ? variantAsStock(item, variant) : item;
            const shownPrice = variant ? variant.price : item.price;
            const shownMrp = variant ? variant.mrp : item.mrp;
            const lineKey = cartLineKey(item.id, variant?.id);
            const inCartItem = cart.items.find((i) => lineKeyOf(i) === lineKey);
            const qty = inCartItem?.quantity || 0;
            const isFood = item.listing_type === 'food';
            const isService = item.listing_type === 'service';
            const isRental = item.listing_type === 'rental';
            const foodType = item.metadata?.food_type;
            const durationMins = item.metadata?.duration_mins;
            const deposit = item.metadata?.security_deposit;
            const sellable = variantMode ? Boolean(variant) && isSellable(stockView) : isSellable(item);
            const offLabel = availabilityLabels(item.listing_type).off;
            const lowHint = sellable ? lowStockHint(stockView) : null;
            const cap = maxOrderQty(stockView);
            const addThis = () => handleAddToCart(item, variant);

            return (
              <Col xs={24} sm={12} md={8} key={item.id}>
                <Card
                  hoverable={sellable}
                  className={`sf-card ${sellable ? '' : 'is-out'}`}
                  aria-label={sellable ? undefined : `${item.name}, ${offLabel.toLowerCase()}`}
                  style={{
                    height: '100%',
                    borderRadius: 16,
                    border: `1px solid ${colors.border}`,
                    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                    transition: 'all 0.2s ease',
                  }}
                  bodyStyle={{
                    padding: screens.xs ? 14 : 16,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <Flex gap={12} align="start" className="sf-card-dim" style={{ marginBottom: 10 }}>
                    {item.img_url ? (
                      <img
                        src={item.img_url}
                        alt={item.name}
                        style={{
                          width: screens.xs ? 76 : 84,
                          height: screens.xs ? 76 : 84,
                          borderRadius: 12,
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: `1px solid ${colors.borderLight}`,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: screens.xs ? 76 : 84,
                          height: screens.xs ? 76 : 84,
                          borderRadius: 12,
                          background: colors.surfaceContainerLow,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: colors.textLight,
                          fontSize: 26,
                          flexShrink: 0,
                          border: `1px solid ${colors.borderLight}`,
                        }}
                      >
                        <FileTextOutlined />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Section & Indicator Badges */}
                      <Flex align="center" gap={6} wrap="wrap" style={{ marginBottom: 4 }}>
                        {isFood && foodType && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 14,
                              height: 14,
                              border: `1.5px solid ${foodType === 'veg' ? colors.semantic.success : colors.semantic.error}`,
                              borderRadius: 3,
                              padding: 2,
                            }}
                            title={foodType === 'veg' ? 'Pure Veg' : 'Non-Veg'}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: foodType === 'veg' ? '50%' : 0,
                                backgroundColor: foodType === 'veg' ? colors.semantic.success : colors.semantic.error,
                              }}
                            />
                          </span>
                        )}


                        {durationMins && (
                          <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>
                            <ClockCircleOutlined /> {durationMins}m
                          </Tag>
                        )}

                        {item.metadata?.prescription_required && (
                          <Tag color="error" style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0, fontWeight: 700 }}>
                            Rx Required
                          </Tag>
                        )}

                        {item.metadata?.dosage_form && (
                          <Tag color="cyan" style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>
                            Dosage: {item.metadata.dosage_form}
                          </Tag>
                        )}

                        {item.metadata?.expiry_date && (
                          <Tag color="orange" style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>
                            Exp: {item.metadata.expiry_date}
                          </Tag>
                        )}

                        {(item.metadata?.warranty_period || item.metadata?.warranty_months) && (
                          <Tag color="green" icon={<SafetyCertificateFilled style={{ fontSize: 10 }} />} style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>
                            {item.metadata.warranty_period || item.metadata.warranty_months}m Warranty
                          </Tag>
                        )}

                        {item.metadata?.vehicle_type && (
                          <Tag color="geekblue" icon={<CarOutlined style={{ fontSize: 10 }} />} style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>
                            {item.metadata.vehicle_type}
                          </Tag>
                        )}

                        {item.metadata?.category_name && (
                          <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>
                            {item.metadata.category_name}
                          </Tag>
                        )}
                      </Flex>

                      <Title
                        level={5}
                        ellipsis={{ rows: 2 }}
                        style={{
                          margin: '0 0 6px 0',
                          fontWeight: 700,
                          fontSize: screens.xs ? 14 : 15,
                          color: colors.textMain,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.name}
                      </Title>

                      <Flex align="baseline" gap={6}>
                        <span style={{ fontSize: 17, fontWeight: 800, color: colors.primary }}>
                          ₹{shownPrice}
                        </span>
                        {shownMrp && shownMrp > shownPrice && (
                          <span
                            style={{
                              fontSize: 12,
                              color: colors.textLight,
                              textDecoration: 'line-through',
                            }}
                          >
                            ₹{shownMrp}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: colors.textLight }}>
                          / {item.unit || 'unit'}
                        </span>
                      </Flex>
                    </div>
                  </Flex>

                  {/* Description & Metadata */}
                  {item.description && (
                    <Paragraph
                      type="secondary"
                      className="sf-card-dim"
                      ellipsis={{ rows: 2 }}
                      style={{
                        fontSize: 12,
                        color: colors.textLight,
                        marginBottom: 12,
                        minHeight: 34,
                        lineHeight: '17px',
                      }}
                    >
                      {item.description}
                    </Paragraph>
                  )}

                  {/* Deposit notice for rentals */}
                  {isRental && deposit && (
                    <div
                      style={{
                        background: colors.semantic.successLight,
                        border: `1px solid ${colors.semantic.successBorder}`,
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 11,
                        color: colors.semantic.successHover,
                        fontWeight: 600,
                        marginBottom: 10,
                      }}
                    >
                      <SafetyCertificateFilled style={{ marginRight: 6, color: colors.semantic.successHover }} /> Refundable Deposit: ₹{deposit}
                    </div>
                  )}

                  {/* Options of a product with variants */}
                  {variantMode && (
                    <VariantPicker
                      listing={item}
                      selection={selection}
                      onChange={(next) => setVariantPicks((prev) => ({ ...prev, [item.id]: next }))}
                    />
                  )}

                  {/* Stock state */}
                  {!sellable && <span className="sf-stock-label">{offLabel}</span>}
                  {lowHint && <span className="sf-low-label">{lowHint}</span>}

                  {/* Archetype Action Buttons */}
                  <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                    {isService ? (
                      <Flex gap={8}>
                        <Button
                          block
                          style={{ borderRadius: 8, fontWeight: 600, height: 38 }}
                          onClick={() => handleOpenQuote(item)}
                        >
                          Request Quote
                        </Button>
                        <Button
                          type="primary"
                          block
                          style={{
                            borderRadius: radii.md,
                            fontWeight: 700,
                            height: 38,
                            background: colors.primary,
                            borderColor: colors.primary,
                          }}
                          disabled={!sellable}
                          onClick={() => addThis()}
                        >
                          {sellable ? 'Book Visit' : offLabel}
                        </Button>
                      </Flex>
                    ) : isRental ? (
                      <Flex gap={8}>
                        <Button
                          block
                          style={{ borderRadius: 8, fontWeight: 600, height: 38 }}
                          onClick={() => {
                            if (isOwnStore) {
                              message.info('You are viewing your own store. Open Manage Store to edit listings.');
                              return;
                            }
                            handleChatOpen(shop.owner_id, shop.id, { shop_name: shop.shop_name });
                          }}
                        >
                          Inquire
                        </Button>
                        <Button
                          type="primary"
                          block
                          icon={<ShoppingCartOutlined />}
                          style={{
                            borderRadius: radii.md,
                            fontWeight: 700,
                            height: 38,
                            background: colors.primary,
                            borderColor: colors.primary,
                          }}
                          disabled={!sellable}
                          onClick={() => {
                            if (addThis()) openCart();
                          }}
                        >
                          {sellable ? 'Reserve' : offLabel}
                        </Button>
                      </Flex>
                    ) : qty > 0 ? (
                      <Flex
                        align="center"
                        justify="space-between"
                        style={{
                          background: colors.surfaceContainerLow,
                          border: `1px solid ${colors.borderDark}`,
                          borderRadius: 8,
                          padding: '2px 8px',
                          height: 38,
                        }}
                      >
                        <Button
                          type="text"
                          icon={<MinusOutlined />}
                          aria-label={`Remove one ${item.name}`}
                          onClick={() => updateQuantity(lineKey, -1)}
                        />
                        <span style={{ fontWeight: 800, color: colors.textMain, fontSize: 13 }}>
                          {qty} in Cart
                        </span>
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          disabled={cap !== null && qty >= cap}
                          aria-label={`Add one more ${item.name}`}
                          onClick={() => updateQuantity(lineKey, 1)}
                        />
                      </Flex>
                    ) : (
                      <Button
                        type="primary"
                        block
                        icon={<ShoppingCartOutlined />}
                        style={{
                          borderRadius: radii.md,
                          fontWeight: 700,
                          height: 38,
                          background: colors.primary,
                          borderColor: colors.primary,
                        }}
                        disabled={!sellable}
                        onClick={() => addThis()}
                      >
                        {!sellable ? offLabel : isFood ? 'Add to Order' : 'Add to Cart'}
                      </Button>
                    )}
                  </div>
                </Card>
              </Col>
            );
  };

  const directionsUrl =
    shop.directions ||
    (shop.latitude && shop.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`
      : shop.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${shop.shop_name} ${shop.address}`
        )}`
      : null);

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: screens.xs ? '12px 10px 100px 10px' : '20px 16px 80px 16px' }}>
      {/* Back button & Owner Quick Shortcut */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 14 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push(Routes.home)}
          style={{
            fontWeight: 600,
            color: colors.textMuted,
            padding: '4px 8px',
            borderRadius: 8,
            transition: 'all 0.2s ease',
          }}
        >
          Back to Local Market
        </Button>

        {isOwnStore && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            style={{
              background: colors.semantic.success,
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
            }}
            onClick={() => history.push(`/client_register?shop_id=${shop.id}`)}
          >
            Manage Store
          </Button>
        )}
      </Flex>

      {isOwnStore && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 14,
            background: colors.semantic.successLight,
            border: `1px solid ${colors.semantic.successBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Flex align="center" gap={10}>
            <ShopOutlined style={{ fontSize: 22, color: colors.semantic.successHover }} />
            <div>
              <div style={{ fontWeight: 700, color: '#065f46', fontSize: 13 }}>
                Storefront Preview Mode
              </div>
              <div style={{ color: colors.semantic.successHover, fontSize: 12 }}>
                This is your live storefront as seen by customers. To edit listings, stock, or prices, open Manage Store.
              </div>
            </div>
          </Flex>
          <Button
            size="small"
            style={{
              borderColor: colors.semantic.success,
              color: colors.semantic.success,
              fontWeight: 600,
              borderRadius: 6,
            }}
            onClick={() => history.push(`/client_register?shop_id=${shop.id}`)}
          >
            Edit in Manage Store
          </Button>
        </div>
      )}

      {/* Hero Storefront Card - High Contrast & Modern Clean Header */}
      <Card
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          marginBottom: 24,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06)',
          background: colors.white,
        }}
        bodyStyle={{ padding: 0 }}
      >
        {/* Cover Graphic Banner */}
        <div
          style={{
            height: screens.xs ? 130 : 160,
            position: 'relative',
            overflow: 'hidden',
            background: colors.primaryGradient,
          }}
        >
          {shop.img_url ? (
            <>
              <div
                style={{
                  position: 'absolute',
                  inset: -16,
                  backgroundImage: `url(${shop.img_url})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                  filter: 'blur(20px) brightness(0.6) saturate(1.25)',
                  transform: 'scale(1.15)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0.72) 100%)',
                }}
              />
            </>
          ) : null}

          {/* Badges on Banner */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: screens.xs ? 12 : 16,
              right: screens.xs ? 12 : 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 9999,
                background: 'rgba(15, 23, 42, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: colors.white,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.2px',
              }}
            >
              <ShopOutlined style={{ color: '#fbbf24' }} />
              Direct Local Store • 0% Commission
            </div>

            {isOwnStore ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 9999,
                  background: 'rgba(5, 150, 105, 0.85)',
                  border: '1px solid rgba(167, 243, 208, 0.4)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: colors.white,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <EyeOutlined /> Owner Preview Mode
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 9999,
                  background: 'rgba(6, 78, 59, 0.6)',
                  border: '1px solid rgba(52, 211, 153, 0.35)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: '#34d399',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: colors.semantic.success,
                    boxShadow: `0 0 6px ${colors.semantic.success}`,
                    display: 'inline-block',
                  }}
                />
                Open for Orders
              </div>
            )}
          </div>
        </div>

        {/* Store Profile Details */}
        <div style={{ padding: screens.xs ? '0 14px 18px 14px' : '0 24px 22px 24px' }}>
          {screens.xs ? (
            /* Mobile Layout */
            <div>
              {/* Avatar + Title Row */}
              <Flex gap={12} align="start" style={{ marginTop: -38, marginBottom: 12 }}>
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 16,
                    background: colors.white,
                    padding: 3,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.16)',
                    border: `3px solid ${colors.white}`,
                    overflow: 'hidden',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <img
                    src={
                      shop.img_url ||
                      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300'
                    }
                    alt={shop.shop_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0, paddingTop: 42, paddingBottom: 2 }}>
                  <Flex align="center" gap={6} wrap="wrap">
                    <Title
                      level={3}
                      style={{
                        margin: 0,
                        fontWeight: 800,
                        color: colors.textMain,
                        fontSize: 19,
                        letterSpacing: '-0.3px',
                        lineHeight: 1.2,
                      }}
                    >
                      {shop.shop_name}
                    </Title>
                    <SafetyCertificateFilled
                      style={{ color: colors.primary, fontSize: 18 }}
                      title="Verified Local Merchant"
                    />
                    {isOwnStore && (
                      <Tag
                        color="green"
                        style={{ fontWeight: 700, margin: 0, borderRadius: 6, fontSize: 11 }}
                      >
                        My Store
                      </Tag>
                    )}
                  </Flex>
                  <Flex gap={6} align="center" wrap="wrap" style={{ marginTop: 4 }}>
                    <SubCategoryChips shop={shop} fallback="Store" size="sm" />
                    <Flex
                      align="center"
                      gap={3}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#b45309',
                        background: colors.semantic.warningLight,
                        padding: '1px 6px',
                        borderRadius: 6,
                        border: `1px solid ${colors.semantic.warningBorder}`,
                      }}
                    >
                      <StarFilled style={{ fontSize: 11, color: colors.semantic.warning }} />
                      <span>{shop.rating || 5}.0</span>
                    </Flex>
                  </Flex>
                </div>
              </Flex>

              {/* Area & Address & Open Status */}
              <div style={{ marginBottom: 12 }}>
                {shop.area && (
                  <Tag
                    style={{
                      marginBottom: 6,
                      borderRadius: 6,
                      fontSize: 11,
                      background: colors.borderLight,
                      color: colors.textMuted,
                      border: `1px solid ${colors.border}`,
                      fontWeight: 600,
                    }}
                  >
                    <EnvironmentOutlined style={{ color: colors.primary }} /> {shop.area}
                  </Tag>
                )}
                <Paragraph
                  type="secondary"
                  style={{
                    margin: '4px 0 6px 0',
                    fontSize: 12,
                    color: colors.textLight,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                    lineHeight: '18px',
                  }}
                >
                  <EnvironmentOutlined style={{ color: colors.primary, marginTop: 3, flexShrink: 0 }} />
                  <span>{shop.address}</span>
                </Paragraph>
                <Flex align="center" gap={6} style={{ fontSize: 12, color: colors.semantic.success, fontWeight: 600 }}>
                  <ClockCircleOutlined style={{ color: colors.semantic.success }} />
                  <span>Open for direct orders • Instant confirmation</span>
                </Flex>
              </div>

              {/* Mobile Action Buttons */}
              <Flex gap={8} align="center" wrap="wrap" style={{ width: '100%', marginTop: 14 }}>
                {shop.mobile_number && (
                  <Button
                    icon={<PhoneOutlined />}
                    href={`tel:${shop.mobile_number}`}
                    style={{
                      flex: '1 1 auto',
                      height: 42,
                      borderRadius: 10,
                      fontWeight: 700,
                      borderColor: colors.borderDark,
                    }}
                  >
                    Call
                  </Button>
                )}
                {directionsUrl && (
                  <Button
                    icon={<CompassOutlined />}
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: '1 1 auto',
                      height: 42,
                      borderRadius: 10,
                      fontWeight: 700,
                      borderColor: colors.borderDark,
                    }}
                  >
                    Directions
                  </Button>
                )}
                {isOwnStore ? (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => history.push(`/client_register?shop_id=${shop.id}`)}
                    style={{
                      flex: '2 1 auto',
                      height: 42,
                      borderRadius: 10,
                      fontWeight: 700,
                      background: colors.semantic.success,
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.28)',
                      border: 'none',
                    }}
                  >
                    Manage My Store
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<ChatIcon />}
                    onClick={() => {
                      if (!user_data?.user_id) {
                        message.info('Please log in to chat with the store owner');
                        history.push(Routes.login);
                      } else {
                        handleChatOpen(shop.owner_id, shop.id, { shop_name: shop.shop_name });
                      }
                    }}
                    style={{
                      flex: '2 1 auto',
                      height: 42,
                      borderRadius: radii.md,
                      fontWeight: 700,
                      background: colors.primary,
                      borderColor: colors.primary,
                      boxShadow: '0 4px 14px rgba(11, 45, 107, 0.28)',
                    }}
                  >
                    Chat with Owner
                  </Button>
                )}
              </Flex>
            </div>
          ) : (
            /* Desktop / Tablet Layout */
            <Flex
              justify="space-between"
              align="start"
              gap={24}
              wrap="wrap"
            >
              {/* Left Column: Avatar + Full Info Group in one row */}
              <Flex gap={20} align="start" wrap="wrap" style={{ flex: '1 1 340px', minWidth: 0 }}>
                {/* Avatar */}
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 18,
                    background: colors.white,
                    padding: 3,
                    boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.16)',
                    border: `3px solid ${colors.white}`,
                    overflow: 'hidden',
                    flexShrink: 0,
                    marginTop: -48,
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <img
                    src={
                      shop.img_url ||
                      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300'
                    }
                    alt={shop.shop_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }}
                  />
                </div>

                {/* Details Column */}
                <Flex vertical gap={6} style={{ flex: 1, minWidth: 0, paddingTop: 10 }}>
                  {/* Shop Title + Verified */}
                  <Flex align="center" gap={8} wrap="wrap">
                    <Title
                      level={2}
                      style={{
                        margin: 0,
                        fontWeight: 800,
                        color: colors.textMain,
                        fontSize: 24,
                        letterSpacing: '-0.5px',
                        lineHeight: 1.2,
                      }}
                    >
                      {shop.shop_name}
                    </Title>
                    <SafetyCertificateFilled
                      style={{ color: colors.primary, fontSize: 20 }}
                      title="Verified Local Merchant"
                    />
                    {isOwnStore && (
                      <Tag
                        color="green"
                        style={{ fontWeight: 700, margin: 0, borderRadius: 6, fontSize: 12, padding: '1px 8px' }}
                      >
                        My Store
                      </Tag>
                    )}
                  </Flex>

                  {/* Badges: Category, Area, Rating */}
                  <Flex gap={8} align="center" wrap="wrap">
                    <SubCategoryChips shop={shop} fallback="Store" size="md" />

                    {shop.area && (
                      <Tag
                        style={{
                          margin: 0,
                          borderRadius: 6,
                          fontSize: 12,
                          padding: '1px 8px',
                          background: colors.borderLight,
                          color: colors.textMuted,
                          border: `1px solid ${colors.border}`,
                          fontWeight: 500,
                        }}
                      >
                        <EnvironmentOutlined style={{ color: colors.primary }} /> {shop.area}
                      </Tag>
                    )}

                    <Flex
                      align="center"
                      gap={4}
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#b45309',
                        background: colors.semantic.warningLight,
                        padding: '1px 8px',
                        borderRadius: 6,
                        border: `1px solid ${colors.semantic.warningBorder}`,
                      }}
                    >
                      <StarFilled style={{ fontSize: 12, color: colors.semantic.warning }} />
                      <span>{shop.rating || 5}.0</span>
                    </Flex>
                  </Flex>

                  {/* Address */}
                  <Paragraph
                    type="secondary"
                    style={{
                      margin: '2px 0 0 0',
                      fontSize: 13,
                      color: colors.textLight,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                    }}
                  >
                    <EnvironmentOutlined style={{ color: colors.primary, marginTop: 3, flexShrink: 0 }} />
                    <span>{shop.address}</span>
                  </Paragraph>

                  {/* Status line */}
                  <Flex align="center" gap={6} style={{ fontSize: 12, color: colors.semantic.success, fontWeight: 600, marginTop: 2 }}>
                    <ClockCircleOutlined style={{ color: colors.semantic.success }} />
                    <span>Open for direct orders • Instant confirmation • 0% Commission</span>
                  </Flex>
                </Flex>
              </Flex>

              {/* Right Column: Actions */}
              <Flex
                gap={10}
                align="center"
                style={{
                  paddingTop: 12,
                  flexShrink: 0,
                }}
              >
                {shop.mobile_number && (
                  <Button
                    icon={<PhoneOutlined />}
                    href={`tel:${shop.mobile_number}`}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      fontWeight: 600,
                      borderColor: colors.borderDark,
                      color: colors.textMuted,
                    }}
                  >
                    Call
                  </Button>
                )}

                {directionsUrl && (
                  <Button
                    icon={<CompassOutlined />}
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      height: 40,
                      borderRadius: 10,
                      fontWeight: 600,
                      borderColor: colors.borderDark,
                      color: colors.textMuted,
                    }}
                  >
                    Directions
                  </Button>
                )}

                {isOwnStore ? (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => history.push(`/client_register?shop_id=${shop.id}`)}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      fontWeight: 700,
                      padding: '0 18px',
                      background: colors.semantic.success,
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.28)',
                      border: 'none',
                    }}
                  >
                    Manage My Store
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<ChatIcon />}
                    onClick={() => {
                      if (!user_data?.user_id) {
                        message.info('Please log in to chat with the store owner');
                        history.push(Routes.login);
                      } else {
                        handleChatOpen(shop.owner_id, shop.id, { shop_name: shop.shop_name });
                      }
                    }}
                    style={{
                      height: 40,
                      borderRadius: radii.md,
                      fontWeight: 700,
                      padding: '0 18px',
                      background: colors.primary,
                      borderColor: colors.primary,
                      boxShadow: '0 4px 14px rgba(11, 45, 107, 0.28)',
                    }}
                  >
                    Chat with Owner
                  </Button>
                )}
              </Flex>
            </Flex>
          )}
        </div>
      </Card>

      {/* Catalog & Menu Offerings Section */}
      <div style={{ marginBottom: 24 }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 12 }}>
          <div>
            <Title level={4} style={{ fontWeight: 800, color: colors.textMain, margin: 0, letterSpacing: '-0.3px' }}>
              {storeArchetype === 'food'
                ? 'Menu & Dishes'
                : storeArchetype === 'service'
                ? 'Service Packages & Rate Card'
                : storeArchetype === 'wellness'
                ? 'Spa Treatments & Sessions'
                : storeArchetype === 'rental'
                ? 'Rental Fleet & Equipment'
                : 'Products & Offerings'}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Direct prices with 0% aggregator markups
            </Text>
          </div>
        </Flex>

        {/* Dietary Veg/Non-Veg Filter (Only shown if restaurant/food items exist) */}
        {hasFoodItems && (
          <Flex gap={8} align="center" style={{ marginBottom: 14 }}>
            <Segmented
              value={foodFilter}
              onChange={setFoodFilter}
              options={[
                { label: 'All Items', value: 'all' },
                { label: 'Pure Veg', value: 'veg' },
                { label: 'Non-Veg', value: 'non-veg' },
              ]}
              style={{ fontWeight: 700, padding: 3, background: colors.borderLight }}
            />
          </Flex>
        )}

        {/* Filters from the category's custom form fields */}
        {schemaFilters.length > 0 && (
          <Flex gap={8} align="center" wrap="wrap" style={{ marginBottom: 14 }}>
            {schemaFilters.map((field) =>
              field.type === 'boolean' ? (
                <Tag.CheckableTag
                  key={field.key}
                  checked={fieldFilters[field.key] === true}
                  onChange={(checked) => setFieldFilter(field.key, checked ? true : undefined)}
                  style={{
                    padding: '3px 12px',
                    borderRadius: 16,
                    fontWeight: 600,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {field.label}
                </Tag.CheckableTag>
              ) : (
                <Select
                  key={field.key}
                  allowClear
                  size="small"
                  className="sf-filter-select"
                  placeholder={field.label}
                  aria-label={`Filter by ${field.label}`}
                  value={fieldFilters[field.key]}
                  onChange={(value) => setFieldFilter(field.key, value)}
                  options={field.values.map((opt) => ({ label: opt, value: opt }))}
                  style={{ minWidth: 150 }}
                />
              )
            )}
            {hasActiveFieldFilters && (
              <Button type="link" size="small" onClick={() => setFieldFilters({})}>
                Clear filters
              </Button>
            )}
          </Flex>
        )}
      </div>

      {/* Sticky search + section chips */}
      <SectionChips
        sections={visibleSections}
        activeId={activeSectionId}
        onJump={jumpToSection}
        search={searchQuery}
        onSearch={setSearchQuery}
        placeholder="Search items in this store"
        showChips={!isSearching}
      />

      {isSearching ? (
        <PagedListingGrid
          key={debouncedQuery}
          shopId={shop_id}
          q={debouncedQuery}
          renderItem={renderItem}
          filterItem={filterItem}
          gutter={gridGutter}
          emptyText={`No items match "${debouncedQuery}"`}
          header={(n) => (
            <div className="sf-results-head" aria-live="polite">
              {n} {n === 1 ? 'result' : 'results'} for &quot;{debouncedQuery}&quot;
            </div>
          )}
        />
      ) : storefront.status === 'loading' ? (
        <div aria-busy="true">
          <Flex gap={8} style={{ marginBottom: 16 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton.Button key={i} active size="small" shape="round" />
            ))}
          </Flex>
          {[0, 1].map((i) => (
            <div key={i} className="sf-block">
              <Skeleton active title={{ width: 160 }} paragraph={false} />
              <div className="sf-block-skeleton">
                <Skeleton active avatar={{ shape: 'square', size: 76 }} paragraph={{ rows: 2 }} />
                <Skeleton active avatar={{ shape: 'square', size: 76 }} paragraph={{ rows: 2 }} />
              </div>
            </div>
          ))}
        </div>
      ) : storefront.status === 'error' ? (
        <Alert
          type="error"
          showIcon
          message="This store's items didn't load"
          description={storefront.error}
          action={
            <Button size="small" onClick={storefront.reload}>
              Retry
            </Button>
          }
        />
      ) : visibleSections.length === 0 ? (
        <div className="sf-empty-store">This store hasn&apos;t added products yet.</div>
      ) : (
        visibleSections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            renderItem={renderItem}
            filterItem={filterItem}
            onNeedItems={storefront.loadSection}
            onSeeAll={setSeeAllSection}
            gutter={gridGutter}
          />
        ))
      )}

      <SectionGridDrawer
        shopId={shop_id}
        section={seeAllSection}
        onClose={() => setSeeAllSection(null)}
        renderItem={renderItem}
        filterItem={filterItem}
        gutter={gridGutter}
      />

      {/* Floating Bottom Cart Bar */}
      {cartItemsForThisShop > 0 && (
        <div className="cart-floating-badge" onClick={openCart}>
          <Flex align="center" gap={8}>
            <Badge count={cartItemsForThisShop} color={colors.primary} />
            <span style={{ fontWeight: 700 }}>
              {cartItemsForThisShop} {cartItemsForThisShop === 1 ? 'item' : 'items'} in Direct Cart
            </span>
          </Flex>
          <Flex align="center" gap={12}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>
              ₹{cartSubtotal.toFixed(2)}
            </span>
            <Button
              type="primary"
              size="small"
              style={{
                borderRadius: 9999,
                fontWeight: 700,
                background: colors.primary,
                borderColor: colors.primary,
              }}
            >
              View Cart & Checkout
            </Button>
          </Flex>
        </div>
      )}

      {/* Quote Request Modal */}
      <Modal
        title={`Request a quote: ${quoteItem?.name || ''}`}
        open={quoteModalVisible}
        onCancel={() => setQuoteModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setQuoteModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={quoteLoading}
            onClick={submitQuote}
            style={{ background: colors.primary, borderColor: colors.primary, fontWeight: 700, borderRadius: radii.md }}
          >
            Send Quote Request
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Describe your requirement (model, problem details, preferred visit time, or site photos).
            The store owner will reply directly in your Quotes & Orders tab.
          </Text>
          <Input.TextArea
            rows={4}
            value={quoteDesc}
            onChange={(e) => setQuoteDesc(e.target.value)}
            placeholder="e.g. 1.5 Ton Split AC is blowing room temperature air. Need gas pressure check and repair on Saturday morning."
          />
        </div>
        <div style={{ background: colors.surfaceContainerLow, padding: 12, borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
          <Text type="secondary">Base Service / Inspection Rate:</Text>
          <div style={{ fontSize: 18, fontWeight: 800, color: colors.primary }}>
            ₹{quoteItem?.price || 0}{' '}
            <span style={{ fontSize: 12, color: colors.textLight, fontWeight: 400 }}>
              / {quoteItem?.unit || 'visit'}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StorefrontScreen;
