import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Button,
  Input,
  Radio,
  Typography,
  Divider,
  Space,
  Tag,
  message,
  Card,
  Empty,
  Flex,
  Modal,
  Row,
  Col,
  Form,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  ShoppingCartOutlined,
  CheckCircleFilled,
  ShopOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  AimOutlined,
  UserOutlined,
  PhoneOutlined,
  LockOutlined,
  ThunderboltFilled,
  MessageOutlined,
} from '@ant-design/icons';
import { useCartStore, useGlobalStore, useChatStore, subscribeToPushNotifications, requestPushPermission } from '../../services';
import { netWorkCall, apiConfig, getPreciseUserLocation, getLocationName, storageKeys, SOCKET } from '../../utils';
import { useHistory } from 'react-router-dom';
import Routes from '../../routes/routes';
import { AddressModal } from '../profile';
import { colors, radii, typography, shadows } from '../../styles/theme';

const { Text, Title } = Typography;

const PREBUILT_QUERIES = [
  {
    icon: '📦',
    label: 'In stock & fresh?',
    text: 'Hi! Is this item available in stock and fresh for immediate dispatch / pickup?',
  },
  {
    icon: '⏱️',
    label: 'Preparation time?',
    text: 'Hi! How long will it take to prepare and pack this order?',
  },
  {
    icon: '📍',
    label: 'Delivery feasibility?',
    text: 'Can you deliver to my location landmark? What is the delivery timeline?',
  },
  {
    icon: '💳',
    label: 'Pay UPI on counter?',
    text: 'Can I pay directly via GPay / PhonePe UPI QR code upon arrival / pickup?',
  },
  {
    icon: '🛠️',
    label: 'Service inspection / Quote?',
    text: 'Hi, I need an inspection or quote estimate before confirming this service booking.',
  },
];

const CartDrawer = () => {
  const history = useHistory();
  const { cart, isCartOpen, closeCart, updateQuantity, removeItem, clearCart } =
    useCartStore((state) => state);
  const { user_data, update_user_data } = useGlobalStore((state) => state);
  const { handleChatOpen } = useChatStore((state) => state);

  const [orderType, setOrderType] = useState('delivery');
  const [paymentMode, setPaymentMode] = useState('direct_upi');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(user_data?.mobile || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Pre-built query / Chat with owner states
  const [querySending, setQuerySending] = useState(false);
  const [showCustomQuery, setShowCustomQuery] = useState(false);
  const [customQueryText, setCustomQueryText] = useState('');

  // Authentication modal state for guest checkout
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authLoading, setAuthLoading] = useState(false);

  // Address integration state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressMode, setAddressMode] = useState('saved'); // 'saved' | 'manual'
  const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  const fetchSavedAddresses = async () => {
    if (!user_data?.user_id) return;
    try {
      const res = await netWorkCall(apiConfig.user_addresses, 'GET', null, true);
      if (res?.data && res.data.length > 0) {
        setSavedAddresses(res.data);
        const def = res.data.find((a) => a.is_default) || res.data[0];
        if (def && (!address || addressMode === 'saved')) {
          setSelectedAddressId(def.id);
          const formatted =
            def.formatted_address ||
            [def.house_flat_floor, def.street_area, def.landmark, def.city, def.pincode]
              .filter(Boolean)
              .join(', ');
          setAddress(formatted);
          if (def.recipient_phone) {
            setPhone(def.recipient_phone);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching addresses in cart:', err);
    }
  };

  useEffect(() => {
    if (isCartOpen && user_data?.user_id) {
      fetchSavedAddresses();
      if (!phone && user_data?.mobile) {
        setPhone(user_data.mobile);
      }
    }
  }, [isCartOpen, user_data?.user_id]);

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setAddressMode('saved');
    const formatted =
      addr.formatted_address ||
      [addr.house_flat_floor, addr.street_area, addr.landmark, addr.city, addr.pincode]
        .filter(Boolean)
        .join(', ');
    setAddress(formatted);
    if (addr.recipient_phone) {
      setPhone(addr.recipient_phone);
    }
  };

  const handleUseLiveGpsInCart = async () => {
    setDetectingGps(true);
    try {
      const coords = await getPreciseUserLocation(true);
      const name = await getLocationName(coords[0], coords[1]);
      if (name) {
        setSelectedAddressId(null);
        setAddressMode('manual');
        setAddress(name);
        message.success('Live GPS location detected and filled');
      }
    } catch (err) {
      console.warn('GPS in cart error:', err);
      message.warning('Could not detect exact location. Please select or enter an address.');
    } finally {
      setDetectingGps(false);
    }
  };

  const handleNewAddressCreated = (newAddr) => {
    fetchSavedAddresses();
    if (newAddr) {
      handleSelectSavedAddress(newAddr);
    }
  };

  const itemsTotal = cart.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const deliveryFee = orderType === 'delivery' ? 30.0 : 0.0;
  const platformFee = 0.0; // 0% commission direct commerce
  const finalTotal = itemsTotal + deliveryFee;

  const handleLoginSubmit = async (values) => {
    setAuthLoading(true);
    try {
      const identifier = (values.identifier || values.username || values.mobile || '').trim();
      const res = await netWorkCall(
        apiConfig.login,
        'POST',
        JSON.stringify({
          identifier,
          mobile: identifier,
          username: identifier,
          password: values.password?.trim(),
        })
      );
      if (res?.success === true) {
        sessionStorage.setItem(storageKeys.auth_token, res.token);
        localStorage.setItem(storageKeys.auth_token, res.token);
        update_user_data(res.user_data);
        SOCKET.emit('connect_user', res.user_data);

        // Auto-subscribe to push notifications if permission already granted
        if ('Notification' in window && Notification.permission === 'granted') {
          subscribeToPushNotifications(res.user_data).catch(() => {});
        }

        message.success('Logged in successfully!');
        setIsOnboardingModalOpen(false);
        setPhone(res.user_data.mobile || identifier);
        fetchSavedAddresses();
      } else {
        message.error(res?.message || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      message.error('An error occurred during login. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (values) => {
    setAuthLoading(true);
    try {
      const res = await netWorkCall(
        apiConfig.register,
        'POST',
        JSON.stringify({
          username: values.username?.trim(),
          mobile: values.mobile?.trim(),
          password: values.password?.trim(),
          userRole: 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d',
        })
      );
      if (res?.success === true) {
        sessionStorage.setItem(storageKeys.auth_token, res.token);
        localStorage.setItem(storageKeys.auth_token, res.token);
        update_user_data(res.user_data);
        SOCKET.emit('connect_user', res.user_data);

        // Request push notification permission upon registration
        if ('Notification' in window) {
          requestPushPermission(res.user_data).catch(() => {});
        }

        message.success('Account created!');
        setIsOnboardingModalOpen(false);
        setPhone(res.user_data.mobile || values.mobile);
        fetchSavedAddresses();
      } else {
        message.error(res?.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      message.error('An error occurred during registration. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user_data?.user_id) {
      setIsOnboardingModalOpen(true);
      return;
    }

    if (orderType === 'delivery') {
      if (savedAddresses.length === 0 || (!selectedAddressId && !address.trim())) {
        message.warning('Please add a delivery address to complete your order');
        setIsAddAddressModalOpen(true);
        return;
      }
      if (!address.trim()) {
        message.error('Please enter delivery address');
        return;
      }
    }

    if (!phone.trim()) {
      message.error('Please provide a contact phone number');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        shop_id: cart.shop_id,
        order_type: orderType,
        payment_mode: paymentMode,
        delivery_address: orderType === 'pickup' ? 'Store Self-Pickup' : address,
        customer_phone: phone,
        notes: notes,
        platform_fee: platformFee,
        delivery_fee: deliveryFee,
        items: cart.items.map((i) => ({
          listing_id: i.listing_id,
          item_name: i.item_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          subtotal: i.unit_price * i.quantity,
          listing_type: i.listing_type || 'product',
        })),
      };

      const res = await netWorkCall(
        apiConfig.orders_create,
        'POST',
        JSON.stringify(payload),
        true
      );

      if (res?.data) {
        setOrderSuccess(res.data);
        clearCart();
        message.success('Order placed successfully!');
      } else {
        message.error(res?.error || res?.message || 'Failed to place order');
      }
    } catch (err) {
      console.error('Error placing order:', err);
      message.error('Failed to submit order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPrebuiltInquiry = async (queryText) => {
    if (!queryText || !queryText.trim()) {
      message.error('Please enter or select a question');
      return;
    }

    if (!user_data?.user_id) {
      message.info('Please log in to chat directly with the store owner');
      setIsOnboardingModalOpen(true);
      return;
    }

    let targetOwnerId = cart.owner_id;
    if (!targetOwnerId && cart.shop_id) {
      try {
        const shopDetails = await netWorkCall(`${apiConfig.shops}/${cart.shop_id}/details`, 'GET', null, false);
        targetOwnerId = shopDetails?.data?.owner_id;
      } catch (err) {
        console.error('Error fetching shop details for chat:', err);
      }
    }

    if (!targetOwnerId) {
      message.warning('Store owner details unavailable. You can place the order directly!');
      return;
    }

    setQuerySending(queryText === customQueryText ? 'custom' : queryText);
    try {
      const itemsSummary = cart.items.map((i) => `${i.quantity}x ${i.item_name}`).join(', ');
      const messageContent = itemsSummary
        ? `💬 Customer Pre-order Inquiry regarding [${itemsSummary}]:\n\n"${queryText.trim()}"`
        : `💬 Customer Pre-order Inquiry:\n\n"${queryText.trim()}"`;

      await netWorkCall(
        apiConfig.chat_create,
        'POST',
        JSON.stringify({
          sender_id: user_data.user_id,
          receiver_id: targetOwnerId,
          shop_id: cart.shop_id,
          message: messageContent,
          username: user_data.username || 'Customer',
        }),
        true
      );

      message.success('Inquiry sent to store owner!');
      setShowCustomQuery(false);
      setCustomQueryText('');
      closeCart();
      handleChatOpen(targetOwnerId, cart.shop_id, { shop_name: cart.shop_name });
    } catch (err) {
      console.error('Failed to send inquiry to chat:', err);
      closeCart();
      handleChatOpen(targetOwnerId, cart.shop_id, { shop_name: cart.shop_name });
    } finally {
      setQuerySending(false);
    }
  };

  const handleClose = () => {
    setOrderSuccess(null);
    closeCart();
  };

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 767 : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <Drawer
        title={
          <Flex align="center" gap={10}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: radii.md,
                background: colors.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShoppingCartOutlined style={{ color: colors.primary, fontSize: 18 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: typography.fontFamily.headline,
                  fontWeight: 700,
                  fontSize: 16,
                  color: colors.textMain,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                Your Cart
              </div>
              {cart.shop_name && (
                <div
                  style={{
                    fontSize: 12,
                    color: colors.textMuted,
                    fontFamily: typography.fontFamily.body,
                    fontWeight: 500,
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 240,
                  }}
                  title={cart.shop_name}
                >
                  From: <span style={{ color: colors.textMain, fontWeight: 600 }}>{cart.shop_name}</span>
                </div>
              )}
            </div>
          </Flex>
        }
        extra={
          <Button
            type="text"
            shape="circle"
            icon={<CloseOutlined style={{ fontSize: 14, color: colors.textMuted }} />}
            onClick={handleClose}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              background: colors.surfaceContainerLow,
            }}
            aria-label="Close cart"
          />
        }
        placement={isMobile ? 'bottom' : 'right'}
        height={isMobile ? '92dvh' : undefined}
        width={isMobile ? '100vw' : 440}
        onClose={handleClose}
        open={isCartOpen}
        zIndex={1200}
        styles={{
          body: {
            padding: isMobile ? '16px 14px' : '20px 24px',
            background: colors.surface,
            paddingBottom: isMobile
              ? 'calc(24px + env(safe-area-inset-bottom, 0px))'
              : '24px',
          },
          header: {
            padding: isMobile ? '14px 16px' : '16px 24px',
            borderBottom: `1px solid ${colors.border}`,
            background: colors.surface,
          },
        }}
        closable={false}
      >
      {orderSuccess ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <CheckCircleFilled style={{ fontSize: 64, color: colors.semantic.success, marginBottom: 16 }} />
          <Title
            level={3}
            style={{
              marginBottom: 8,
              fontFamily: typography.fontFamily.headline,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: colors.textMain,
            }}
          >
            Order Confirmed!
          </Title>
          <Text
            style={{
              display: 'block',
              marginBottom: 20,
              fontFamily: typography.fontFamily.body,
              color: colors.textMuted,
              fontSize: 13,
            }}
          >
            Order #{orderSuccess.order_number} has been sent directly to{' '}
            <strong style={{ color: colors.textMain }}>{orderSuccess.shop?.shop_name || 'the merchant'}</strong>.
          </Text>

          <Card
            style={{
              textAlign: 'left',
              background: colors.surfaceContainerLow,
              marginBottom: 24,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontFamily: typography.fontFamily.body, fontSize: 13 }}>
              <Text style={{ color: colors.textMuted }}>Total Amount:</Text>
              <Text strong style={{ color: colors.textMain, fontWeight: 700 }}>₹{orderSuccess.total_amount?.toFixed(2)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontFamily: typography.fontFamily.body, fontSize: 13 }}>
              <Text style={{ color: colors.textMuted }}>Payment Mode:</Text>
              <Tag
                style={{
                  background: colors.primaryLight,
                  color: colors.primary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.xs,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {orderSuccess.payment_mode}
              </Tag>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: typography.fontFamily.body, fontSize: 13 }}>
              <Text style={{ color: colors.textMuted }}>Status:</Text>
              <Tag
                style={{
                  background: colors.liveBadgeBg,
                  color: colors.liveBadgeText,
                  border: 'none',
                  borderRadius: radii.xs,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                Pending Acceptance
              </Tag>
            </div>
          </Card>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              block
              size="large"
              onClick={() => {
                handleClose();
                history.push(Routes.orders);
              }}
              style={{
                height: 44,
                borderRadius: radii.md,
                background: colors.primary,
                borderColor: colors.primary,
                fontFamily: typography.fontFamily.body,
                fontWeight: 700,
                boxShadow: shadows.primary,
              }}
            >
              View Order Details
            </Button>
            <Button
              block
              onClick={handleClose}
              style={{
                height: 44,
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                background: colors.surface,
                color: colors.textMain,
                fontFamily: typography.fontFamily.body,
                fontWeight: 600,
              }}
            >
              Continue Browsing
            </Button>
          </Space>
        </div>
      ) : cart.items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, fontSize: 16, color: colors.textMain, letterSpacing: '-0.02em' }}>
              Your cart is empty
            </span>
          }
          style={{ marginTop: 80, fontFamily: typography.fontFamily.body }}
        >
          <Text style={{ display: 'block', marginBottom: 16, color: colors.textMuted, fontFamily: typography.fontFamily.body, fontSize: 13 }}>
            Browse nearby shops, foods, or services to add items.
          </Text>
          <Button
            type="primary"
            onClick={closeCart}
            style={{
              background: colors.primary,
              borderColor: colors.primary,
              borderRadius: radii.md,
              fontWeight: 600,
              fontFamily: typography.fontFamily.body,
              height: 40,
              padding: '0 20px',
              boxShadow: shadows.primary,
            }}
          >
            Explore Market
          </Button>
        </Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Items List */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            {cart.items.map((item) => (
              <div
                key={item.listing_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: colors.surfaceContainerLow,
                  borderRadius: radii.lg,
                  marginBottom: 10,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  {item.img_url ? (
                    <img
                      src={item.img_url}
                      alt={item.item_name}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: radii.md,
                        objectFit: 'cover',
                        border: `1px solid ${colors.borderLight}`,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: radii.md,
                        background: colors.surfaceContainer,
                        border: `1px solid ${colors.borderLight}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.textMuted,
                      }}
                    >
                      <ShopOutlined style={{ fontSize: 20 }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: typography.fontFamily.headline,
                        fontWeight: 700,
                        fontSize: 14,
                        color: colors.textMain,
                        letterSpacing: '-0.01em',
                        maxWidth: 180,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.3,
                      }}
                    >
                      {item.item_name}
                    </div>
                    <div style={{ fontSize: 13, color: colors.primary, fontWeight: 700, fontFamily: typography.fontFamily.body, marginTop: 2 }}>
                      ₹{item.unit_price}{' '}
                      <span style={{ fontSize: 11, color: colors.textLight, fontWeight: 400 }}>
                        / {item.unit}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: colors.surface,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.md,
                      overflow: 'hidden',
                      boxShadow: shadows.sm,
                    }}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<MinusOutlined style={{ fontSize: 10, color: colors.textMain }} />}
                      onClick={() => updateQuantity(item.listing_id, -1)}
                      style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      aria-label="Decrease quantity"
                    />
                    <span
                      style={{
                        padding: '0 8px',
                        fontWeight: 700,
                        fontSize: 13,
                        color: colors.textMain,
                        fontFamily: typography.fontFamily.body,
                        minWidth: 20,
                        textAlign: 'center',
                      }}
                    >
                      {item.quantity}
                    </span>
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined style={{ fontSize: 10, color: colors.textMain }} />}
                      onClick={() => updateQuantity(item.listing_id, 1)}
                      style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      aria-label="Increase quantity"
                    />
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined style={{ fontSize: 14 }} />}
                    onClick={() => removeItem(item.listing_id)}
                    style={{
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: radii.md,
                    }}
                    aria-label="Remove item"
                  />
                </div>
              </div>
            ))}

            <Divider style={{ margin: '16px 0', borderColor: colors.borderLight }} />

            {/* Order Fulfillment Type */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontFamily: typography.fontFamily.headline,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  fontSize: 13,
                  marginBottom: 8,
                  color: colors.textMain,
                }}
              >
                Fulfillment Mode
              </div>
              <Row gutter={[10, 10]}>
                <Col span={12}>
                  <div
                    onClick={() => setOrderType('pickup')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: radii.lg,
                      border: orderType === 'pickup' ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                      background: orderType === 'pickup' ? colors.primaryLight : colors.surface,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: orderType === 'pickup' ? '0 2px 8px rgba(11, 45, 107, 0.08)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>🏬</div>
                    <div
                      style={{
                        fontFamily: typography.fontFamily.body,
                        fontWeight: 700,
                        fontSize: 13,
                        color: orderType === 'pickup' ? colors.primary : colors.textMain,
                      }}
                    >
                      Self-Pickup
                    </div>
                    <div style={{ fontSize: 11, color: colors.semantic.success, fontWeight: 600, marginTop: 2, fontFamily: typography.fontFamily.body }}>
                      Free
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    onClick={() => setOrderType('delivery')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: radii.lg,
                      border: orderType === 'delivery' ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                      background: orderType === 'delivery' ? colors.primaryLight : colors.surface,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: orderType === 'delivery' ? '0 2px 8px rgba(11, 45, 107, 0.08)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>🛵</div>
                    <div
                      style={{
                        fontFamily: typography.fontFamily.body,
                        fontWeight: 700,
                        fontSize: 13,
                        color: orderType === 'delivery' ? colors.primary : colors.textMain,
                      }}
                    >
                      Delivery
                    </div>
                    <div style={{ fontSize: 11, color: colors.secondary, fontWeight: 600, marginTop: 2, fontFamily: typography.fontFamily.body }}>
                      ₹30
                    </div>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Contact & Delivery Details */}
            {orderType !== 'pickup' && (
              <div style={{ marginBottom: 14 }}>
                <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      fontFamily: typography.fontFamily.headline,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      fontSize: 13,
                      color: colors.textMain,
                    }}
                  >
                    Delivery Destination
                  </div>
                  <Flex gap={8}>
                    {savedAddresses.length > 0 && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => setAddressMode(addressMode === 'saved' ? 'manual' : 'saved')}
                        style={{ padding: 0, fontSize: 12, fontWeight: 600, color: colors.secondary, fontFamily: typography.fontFamily.body }}
                      >
                        {addressMode === 'saved' ? 'Enter Manually' : 'Use Saved Address'}
                      </Button>
                    )}
                    <Button
                      type="link"
                      size="small"
                      icon={<AimOutlined />}
                      loading={detectingGps}
                      onClick={handleUseLiveGpsInCart}
                      style={{ padding: 0, fontSize: 12, fontWeight: 600, color: colors.secondary, fontFamily: typography.fontFamily.body }}
                    >
                      Use GPS
                    </Button>
                  </Flex>
                </Flex>

                {/* If user is logged in and has saved addresses and in 'saved' mode */}
                {addressMode === 'saved' && savedAddresses.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      const formatted =
                        addr.formatted_address ||
                        [addr.house_flat_floor, addr.street_area, addr.landmark, addr.city, addr.pincode]
                          .filter(Boolean)
                          .join(', ');

                      return (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectSavedAddress(addr)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: radii.md,
                            border: isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                            background: isSelected ? colors.primaryLight : colors.surface,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Flex align="center" gap={6} style={{ marginBottom: 2 }}>
                              <Tag
                                style={{
                                  borderRadius: radii.xs,
                                  fontWeight: 700,
                                  fontSize: 10,
                                  margin: 0,
                                  padding: '0 6px',
                                  background:
                                    (addr.label || '').toLowerCase() === 'home'
                                      ? colors.verifiedChipBg
                                      : (addr.label || '').toLowerCase() === 'work'
                                      ? colors.serviceChipBg
                                      : colors.surfaceContainer,
                                  color:
                                    (addr.label || '').toLowerCase() === 'home'
                                      ? colors.verifiedChipText
                                      : (addr.label || '').toLowerCase() === 'work'
                                      ? colors.serviceChipText
                                      : colors.textMuted,
                                  border:
                                    (addr.label || '').toLowerCase() === 'home'
                                      ? `1px solid ${colors.verifiedChipBorder}`
                                      : (addr.label || '').toLowerCase() === 'work'
                                      ? `1px solid ${colors.serviceChipBorder}`
                                      : `1px solid ${colors.border}`,
                                }}
                              >
                                {addr.label}
                              </Tag>
                              {addr.recipient_name && (
                                <Text strong style={{ fontSize: 12, color: colors.textMain, fontFamily: typography.fontFamily.body }}>
                                  {addr.recipient_name}
                                </Text>
                              )}
                            </Flex>
                            <div
                              style={{
                                fontSize: 11,
                                color: colors.textMuted,
                                fontFamily: typography.fontFamily.body,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={formatted}
                            >
                              {formatted}
                            </div>
                          </div>

                          {isSelected && <CheckCircleFilled style={{ color: colors.primary, fontSize: 16 }} />}
                        </div>
                      );
                    })}

                    <Button
                      type="dashed"
                      size="small"
                      onClick={() => setIsAddAddressModalOpen(true)}
                      style={{
                        borderRadius: radii.md,
                        color: colors.primary,
                        borderColor: colors.borderDark,
                        fontWeight: 600,
                        marginTop: 4,
                        width: '100%',
                        fontFamily: typography.fontFamily.body,
                      }}
                    >
                      + Add New Delivery Address
                    </Button>
                  </div>
                ) : (
                  <div>
                    {savedAddresses.length === 0 ? (
                      <div
                        style={{
                          padding: '16px 14px',
                          background: colors.surfaceContainerLow,
                          borderRadius: radii.lg,
                          border: `1.5px dashed ${colors.borderDark}`,
                          textAlign: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <EnvironmentOutlined style={{ fontSize: 24, color: colors.primary, marginBottom: 6 }} />
                        <div
                          style={{
                            fontFamily: typography.fontFamily.headline,
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                            fontSize: 13,
                            color: colors.textMain,
                            marginBottom: 4,
                          }}
                        >
                          Default Delivery Address Required
                        </div>
                        <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fontFamily.body, marginBottom: 12 }}>
                          Please add your delivery address to proceed with order checkout.
                        </div>
                        <Button
                          type="primary"
                          onClick={() => setIsAddAddressModalOpen(true)}
                          style={{
                            background: colors.primary,
                            borderColor: colors.primary,
                            fontWeight: 700,
                            borderRadius: radii.md,
                            fontSize: 13,
                            fontFamily: typography.fontFamily.body,
                            boxShadow: shadows.primary,
                          }}
                        >
                          + Create Default Address
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Input.TextArea
                          rows={2}
                          placeholder="Street address, house no, landmark, locality..."
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          style={{
                            borderRadius: radii.md,
                            fontSize: 13,
                            border: `1px solid ${colors.border}`,
                            fontFamily: typography.fontFamily.body,
                          }}
                        />
                        <Flex justify="space-between" align="center" style={{ marginTop: 4 }}>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => setIsAddAddressModalOpen(true)}
                            style={{ padding: 0, fontSize: 11, fontWeight: 600, color: colors.secondary, fontFamily: typography.fontFamily.body }}
                          >
                            + Save this address to profile
                          </Button>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => setAddressMode('saved')}
                            style={{ padding: 0, fontSize: 11, color: colors.textMuted, fontFamily: typography.fontFamily.body }}
                          >
                            Choose from saved
                          </Button>
                        </Flex>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontFamily: typography.fontFamily.headline,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  fontSize: 13,
                  marginBottom: 4,
                  color: colors.textMain,
                }}
              >
                Contact Phone
              </div>
              <Input
                prefix={<PhoneOutlined style={{ color: colors.textLight }} />}
                placeholder="Mobile number for delivery coordination"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontFamily: typography.fontFamily.body,
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontFamily: typography.fontFamily.headline,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  fontSize: 13,
                  marginBottom: 4,
                  color: colors.textMain,
                }}
              >
                Order Instructions / Notes (Optional)
              </div>
              <Input
                placeholder="e.g. Ring the bell, deliver by 4 PM, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontFamily: typography.fontFamily.body,
                }}
              />
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontFamily: typography.fontFamily.headline,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  fontSize: 13,
                  marginBottom: 8,
                  color: colors.textMain,
                }}
              >
                Payment Method
              </div>
              <Radio.Group
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: typography.fontFamily.body }}
              >
                <Radio value="direct_upi">
                  <span style={{ fontWeight: 600, color: colors.textMain }}>Direct UPI</span>{' '}
                  <span style={{ color: colors.textMuted }}>
                    (Pay directly to merchant via GPay/PhonePe upon {orderType === 'delivery' ? 'delivery' : 'pickup'})
                  </span>
                </Radio>
                <Radio value="cod">
                  <span style={{ fontWeight: 600, color: colors.textMain }}>Cash on Delivery</span>{' '}
                  <span style={{ color: colors.textMuted }}>/ Pay at store</span>
                </Radio>
              </Radio.Group>
            </div>

            {/* Payment Notification Banner */}
            <div
              style={{
                background: colors.semantic.successLight,
                padding: '12px 14px',
                borderRadius: radii.lg,
                border: `1px solid ${colors.semantic.successBorder}`,
                marginBottom: 14,
              }}
            >
              <Flex gap={8} align="flex-start">
                <ThunderboltFilled style={{ color: colors.semantic.success, fontSize: 15, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: colors.semantic.successHover, fontFamily: typography.fontFamily.body }}>
                    Payment on Order Confirmation
                  </div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, fontFamily: typography.fontFamily.body }}>
                    The shop will confirm and pack your order first. Pay via UPI QR or cash upon {orderType === 'delivery' ? 'delivery' : 'pickup'}.
                  </div>
                </div>
              </Flex>
            </div>

            {/* Bill Summary */}
            <div
              style={{
                background: colors.surfaceContainerLow,
                padding: '14px',
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: typography.fontFamily.headline,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  fontSize: 13,
                  marginBottom: 10,
                  color: colors.textMain,
                }}
              >
                Bill Summary
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontSize: 13,
                  fontFamily: typography.fontFamily.body,
                }}
              >
                <Text style={{ color: colors.textMuted }}>Subtotal</Text>
                <Text strong style={{ color: colors.textMain }}>₹{itemsTotal.toFixed(2)}</Text>
              </div>

              {orderType === 'delivery' && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                    fontSize: 13,
                    fontFamily: typography.fontFamily.body,
                  }}
                >
                  <Text style={{ color: colors.textMuted }}>Delivery Fee</Text>
                  <Text strong style={{ color: colors.textMain }}>₹{deliveryFee.toFixed(2)}</Text>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontSize: 13,
                  fontFamily: typography.fontFamily.body,
                }}
              >
                <Text style={{ color: colors.textMuted }}>Platform Fee (Direct Commerce)</Text>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: colors.verifiedChipText,
                    background: colors.verifiedChipBg,
                    padding: '1px 6px',
                    borderRadius: radii.xs,
                    border: `1px solid ${colors.verifiedChipBorder}`,
                  }}
                >
                  ₹0 (Zero Markup)
                </span>
              </div>

              <Divider style={{ margin: '8px 0', borderColor: colors.borderLight }} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 16,
                  fontFamily: typography.fontFamily.headline,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                }}
              >
                <span style={{ color: colors.textMain }}>Total Amount</span>
                <span style={{ color: colors.primary, fontSize: 18 }}>₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Quick Inquiry / Chat Instead of Immediate Order */}
            <div
              style={{
                background: colors.surfaceContainerLow,
                padding: '14px',
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageOutlined style={{ color: colors.secondary, fontSize: 15 }} />
                  <span
                    style={{
                      fontFamily: typography.fontFamily.headline,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      fontSize: 13,
                      color: colors.textMain,
                    }}
                  >
                    Have a Query Before Ordering?
                  </span>
                </div>
                <Tag
                  style={{
                    borderRadius: radii.xs,
                    fontWeight: 700,
                    margin: 0,
                    fontSize: 10,
                    background: colors.verifiedChipBg,
                    color: colors.verifiedChipText,
                    border: `1px solid ${colors.verifiedChipBorder}`,
                  }}
                >
                  Pre-built Chat
                </Tag>
              </div>

              <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8, fontFamily: typography.fontFamily.body }}>
                Select a 1-tap question or send a quick inquiry directly to the store owner:
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {PREBUILT_QUERIES.map((q, idx) => (
                  <Button
                    key={idx}
                    size="small"
                    loading={querySending === q.text}
                    disabled={loading || !!querySending}
                    onClick={() => handleSendPrebuiltInquiry(q.text)}
                    style={{
                      borderRadius: radii.full,
                      fontSize: 11,
                      fontWeight: 600,
                      background: colors.surface,
                      borderColor: colors.border,
                      color: colors.textMain,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: shadows.sm,
                      fontFamily: typography.fontFamily.body,
                    }}
                  >
                    <span>{q.icon}</span>
                    <span>{q.label}</span>
                  </Button>
                ))}
              </div>

              {showCustomQuery ? (
                <div style={{ marginTop: 8 }}>
                  <Input.TextArea
                    rows={2}
                    placeholder="Type your question for the store owner..."
                    value={customQueryText}
                    onChange={(e) => setCustomQueryText(e.target.value)}
                    style={{
                      borderRadius: radii.md,
                      fontSize: 12,
                      marginBottom: 6,
                      border: `1px solid ${colors.border}`,
                      fontFamily: typography.fontFamily.body,
                    }}
                  />
                  <Flex gap={8} justify="flex-end">
                    <Button
                      size="small"
                      onClick={() => setShowCustomQuery(false)}
                      style={{
                        borderRadius: radii.md,
                        border: `1px solid ${colors.border}`,
                        color: colors.textMuted,
                        fontFamily: typography.fontFamily.body,
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      loading={querySending === 'custom'}
                      onClick={() => handleSendPrebuiltInquiry(customQueryText)}
                      style={{
                        background: colors.secondary,
                        borderColor: colors.secondary,
                        borderRadius: radii.md,
                        fontWeight: 600,
                        fontFamily: typography.fontFamily.body,
                      }}
                    >
                      Send Query
                    </Button>
                  </Flex>
                </div>
              ) : (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setShowCustomQuery(true)}
                  style={{ padding: 0, fontSize: 11, color: colors.secondary, fontWeight: 600, fontFamily: typography.fontFamily.body }}
                >
                  ✏️ Type a custom question for this store...
                </Button>
              )}
            </div>
          </div>

          {/* Place Order CTA & Quick Chat */}
          <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 14 }}>
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handlePlaceOrder}
              style={{
                height: 48,
                fontSize: 15,
                fontWeight: 700,
                background: colors.primary,
                borderColor: colors.primary,
                borderRadius: radii.lg,
                marginBottom: 8,
                boxShadow: shadows.primary,
                fontFamily: typography.fontFamily.body,
                letterSpacing: '-0.01em',
              }}
            >
              Place Order (₹{finalTotal.toFixed(0)})
            </Button>
            <Button
              block
              icon={<MessageOutlined style={{ color: colors.secondary }} />}
              onClick={() => handleSendPrebuiltInquiry(PREBUILT_QUERIES[0].text)}
              style={{
                height: 42,
                borderRadius: radii.lg,
                fontSize: 13,
                fontWeight: 600,
                color: colors.secondary,
                borderColor: colors.border,
                background: colors.surfaceContainerLow,
                fontFamily: typography.fontFamily.body,
              }}
            >
              💬 Inquire with Store Owner Instead
            </Button>
          </div>
        </div>
      )}
    </Drawer>

      {/* Login / Register Modal for Guest Checkout */}
      <Modal
        title={
          <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 4 }}>
            <Typography.Title
              level={4}
              style={{
                margin: 0,
                fontFamily: typography.fontFamily.headline,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: colors.textMain,
              }}
            >
              {authMode === 'login' ? 'Login' : 'Create an Account'}
            </Typography.Title>
          </div>
        }
        open={isOnboardingModalOpen}
        onCancel={() => setIsOnboardingModalOpen(false)}
        footer={null}
        width={400}
        destroyOnClose
        centered
        zIndex={1400}
      >
        {authMode === 'login' ? (
          <Form onFinish={handleLoginSubmit} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item
              name="mobile"
              label={<span style={{ fontFamily: typography.fontFamily.body, fontWeight: 600, color: colors.textMain }}>Mobile Number or Username</span>}
              rules={[{ required: true, message: 'Please enter your mobile number or username' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: colors.textLight }} />}
                placeholder="Mobile number or username"
                size="large"
                style={{ borderRadius: radii.md, border: `1px solid ${colors.border}`, fontFamily: typography.fontFamily.body }}
              />
            </Form.Item>
            <Form.Item
              name="password"
              label={<span style={{ fontFamily: typography.fontFamily.body, fontWeight: 600, color: colors.textMain }}>Password</span>}
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: colors.textLight }} />}
                placeholder="Password"
                size="large"
                style={{ borderRadius: radii.md, border: `1px solid ${colors.border}`, fontFamily: typography.fontFamily.body }}
              />
            </Form.Item>
            <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={authLoading}
                size="large"
                block
                style={{
                  height: 44,
                  borderRadius: radii.md,
                  background: colors.primary,
                  borderColor: colors.primary,
                  boxShadow: shadows.primary,
                  fontWeight: 700,
                  fontFamily: typography.fontFamily.body,
                }}
              >
                Log in
              </Button>
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, fontFamily: typography.fontFamily.body }}>
              <span style={{ color: colors.textMuted }}>Don&apos;t have an account? </span>
              <a
                onClick={() => setAuthMode('register')}
                style={{ marginLeft: 6, color: colors.secondary, fontWeight: 600, cursor: 'pointer' }}
              >
                Register Here
              </a>
            </div>
          </Form>
        ) : (
          <Form
            onFinish={handleRegisterSubmit}
            layout="vertical"
            style={{ marginTop: 16 }}
            initialValues={{ userRole: 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d' }}
          >
            <Form.Item
              name="username"
              label={<span style={{ fontFamily: typography.fontFamily.body, fontWeight: 600, color: colors.textMain }}>Username</span>}
              rules={[{ required: true, message: 'Please enter your username' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: colors.textLight }} />}
                placeholder="Username"
                size="large"
                style={{ borderRadius: radii.md, border: `1px solid ${colors.border}`, fontFamily: typography.fontFamily.body }}
              />
            </Form.Item>
            <Form.Item
              name="mobile"
              label={<span style={{ fontFamily: typography.fontFamily.body, fontWeight: 600, color: colors.textMain }}>Mobile Number</span>}
              rules={[{ required: true, message: 'Please enter your mobile number' }]}
            >
              <Input
                prefix={<PhoneOutlined style={{ color: colors.textLight }} />}
                placeholder="Mobile number"
                size="large"
                style={{ borderRadius: radii.md, border: `1px solid ${colors.border}`, fontFamily: typography.fontFamily.body }}
              />
            </Form.Item>
            <Form.Item
              name="password"
              label={<span style={{ fontFamily: typography.fontFamily.body, fontWeight: 600, color: colors.textMain }}>Password</span>}
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: colors.textLight }} />}
                placeholder="Password"
                size="large"
                style={{ borderRadius: radii.md, border: `1px solid ${colors.border}`, fontFamily: typography.fontFamily.body }}
              />
            </Form.Item>
            <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={authLoading}
                size="large"
                block
                style={{
                  height: 44,
                  borderRadius: radii.md,
                  background: colors.primary,
                  borderColor: colors.primary,
                  boxShadow: shadows.primary,
                  fontWeight: 700,
                  fontFamily: typography.fontFamily.body,
                }}
              >
                Register
              </Button>
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, fontFamily: typography.fontFamily.body }}>
              <span style={{ color: colors.textMuted }}>Already have an account? </span>
              <a
                onClick={() => setAuthMode('login')}
                style={{ marginLeft: 6, color: colors.secondary, fontWeight: 600, cursor: 'pointer' }}
              >
                Login Here
              </a>
            </div>
          </Form>
        )}
      </Modal>

      {isAddAddressModalOpen && (
        <AddressModal
          open={isAddAddressModalOpen}
          onClose={() => setIsAddAddressModalOpen(false)}
          onSuccess={handleNewAddressCreated}
          userProfile={user_data}
        />
      )}
    </>
  );
};

export default CartDrawer;

