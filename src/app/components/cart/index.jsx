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
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  ShoppingCartOutlined,
  SafetyCertificateOutlined,
  CheckCircleFilled,
  ShopOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  AimOutlined,
  UserOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useCartStore, useGlobalStore } from '../../services';
import { netWorkCall, apiConfig, getPreciseUserLocation, getLocationName } from '../../utils';
import { useHistory } from 'react-router-dom';
import Routes from '../../routes/routes';
import { AddressModal } from '../profile';

const { Text, Title } = Typography;

const CartDrawer = () => {
  const history = useHistory();
  const { cart, isCartOpen, closeCart, updateQuantity, removeItem, clearCart } =
    useCartStore((state) => state);
  const { user_data } = useGlobalStore((state) => state);

  const [orderType, setOrderType] = useState('delivery');
  const [paymentMode, setPaymentMode] = useState('direct_upi');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(user_data?.mobile || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

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
  const platformFee = cart.items.length > 0 ? 5.0 : 0;
  const finalTotal = itemsTotal + platformFee;

  const handlePlaceOrder = async () => {
    if (!user_data?.user_id) {
      message.warning('Please log in to place an order');
      closeCart();
      history.push(Routes.login);
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
        delivery_address: address,
        customer_phone: phone,
        notes: notes,
        platform_fee: platformFee,
        items: cart.items.map((i) => ({
          listing_id: i.listing_id,
          item_name: i.item_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          subtotal: i.unit_price * i.quantity,
        })),
      };

      const res = await netWorkCall(
        apiConfig.orders_create,
        'POST',
        JSON.stringify(payload)
      );

      if (res?.data) {
        setOrderSuccess(res.data);
        clearCart();
        message.success('Order placed directly with merchant!');
      } else {
        message.error(res?.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Error placing order:', err);
      message.error('Failed to submit order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOrderSuccess(null);
    closeCart();
  };

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 576 : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 576);
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
                borderRadius: 10,
                background: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShoppingCartOutlined style={{ color: '#4f46e5', fontSize: 18 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', lineHeight: 1.2 }}>
                Your Direct Cart
              </div>
              {cart.shop_name && (
                <div
                  style={{
                    fontSize: 12,
                    color: '#64748b',
                    fontWeight: 500,
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 240,
                  }}
                  title={cart.shop_name}
                >
                  From: <span style={{ color: '#0f172a', fontWeight: 600 }}>{cart.shop_name}</span>
                </div>
              )}
            </div>
          </Flex>
        }
        extra={
          <Button
            type="text"
            shape="circle"
            icon={<CloseOutlined style={{ fontSize: 15, color: '#64748b' }} />}
            onClick={handleClose}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid #f1f5f9',
              background: '#f8fafc',
            }}
            aria-label="Close cart"
          />
        }
        placement={isMobile ? 'bottom' : 'right'}
        height={isMobile ? '90vh' : undefined}
        width={isMobile ? '100%' : 440}
        onClose={handleClose}
        open={isCartOpen}
        styles={{
          body: { padding: isMobile ? '16px 14px' : '20px 24px' },
          header: { padding: isMobile ? '14px 16px' : '16px 24px', borderBottom: '1px solid #f1f5f9' },
        }}
        closable={false}
      >
      {orderSuccess ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <CheckCircleFilled style={{ fontSize: 64, color: '#10b981', marginBottom: 16 }} />
          <Title level={3} style={{ marginBottom: 8 }}>
            Order Confirmed!
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
            Order #{orderSuccess.order_number} has been sent directly to{' '}
            <strong>{orderSuccess.shop?.shop_name || 'the merchant'}</strong>.
          </Text>

          <Card
            style={{
              textAlign: 'left',
              background: '#f8fafc',
              marginBottom: 24,
              borderRadius: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">Total Amount:</Text>
              <Text strong>₹{orderSuccess.total_amount?.toFixed(2)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">Payment Mode:</Text>
              <Tag color="blue">{orderSuccess.payment_mode}</Tag>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Status:</Text>
              <Tag color="orange">Pending Acceptance</Tag>
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
            >
              View Order Details
            </Button>
            <Button block onClick={handleClose}>
              Continue Browsing
            </Button>
          </Space>
        </div>
      ) : cart.items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Your cart is empty"
          style={{ marginTop: 80 }}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Browse nearby shops, foods, or services to add items.
          </Text>
          <Button type="primary" onClick={closeCart}>
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
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: 12,
                  marginBottom: 10,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {item.img_url ? (
                    <img
                      src={item.img_url}
                      alt={item.item_name}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                      }}
                    >
                      <ShopOutlined />
                    </div>
                  )}
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: '#0f172a',
                        maxWidth: 180,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.item_name}
                    </div>
                    <div style={{ fontSize: 13, color: '#4f46e5', fontWeight: 700 }}>
                      ₹{item.unit_price}{' '}
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>
                        / {item.unit}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#fff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<MinusOutlined style={{ fontSize: 10 }} />}
                      onClick={() => updateQuantity(item.listing_id, -1)}
                      style={{ width: 26, height: 26 }}
                    />
                    <span style={{ padding: '0 8px', fontWeight: 700, fontSize: 13 }}>
                      {item.quantity}
                    </span>
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined style={{ fontSize: 10 }} />}
                      onClick={() => updateQuantity(item.listing_id, 1)}
                      style={{ width: 26, height: 26 }}
                    />
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeItem(item.listing_id)}
                  />
                </div>
              </div>
            ))}

            <Divider style={{ margin: '16px 0' }} />

            {/* Order Fulfillment Type */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#334155' }}>
                Fulfillment Mode
              </div>
              <Radio.Group
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                buttonStyle="solid"
                style={{ width: '100%', display: 'flex' }}
              >
                <Radio.Button value="delivery" style={{ flex: 1, textAlign: 'center' }}>
                  Delivery
                </Radio.Button>
                <Radio.Button value="pickup" style={{ flex: 1, textAlign: 'center' }}>
                  Store Pickup
                </Radio.Button>
                <Radio.Button value="service_visit" style={{ flex: 1, textAlign: 'center' }}>
                  Service Visit
                </Radio.Button>
              </Radio.Group>
            </div>

            {/* Contact & Delivery Details */}
            {orderType !== 'pickup' && (
              <div style={{ marginBottom: 14 }}>
                <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>
                    Delivery Destination
                  </div>
                  <Flex gap={8}>
                    {savedAddresses.length > 0 && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => setAddressMode(addressMode === 'saved' ? 'manual' : 'saved')}
                        style={{ padding: 0, fontSize: 12, fontWeight: 600 }}
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
                      style={{ padding: 0, fontSize: 12, fontWeight: 600 }}
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
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                            background: isSelected ? '#faf5ff' : '#ffffff',
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
                                color={
                                  (addr.label || '').toLowerCase() === 'home'
                                    ? 'blue'
                                    : (addr.label || '').toLowerCase() === 'work'
                                    ? 'purple'
                                    : 'default'
                                }
                                style={{ borderRadius: 4, fontWeight: 700, fontSize: 10, margin: 0, padding: '0 4px' }}
                              >
                                {addr.label}
                              </Tag>
                              {addr.recipient_name && (
                                <Text strong style={{ fontSize: 12, color: '#334155' }}>
                                  {addr.recipient_name}
                                </Text>
                              )}
                            </Flex>
                            <div
                              style={{
                                fontSize: 11,
                                color: '#64748b',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={formatted}
                            >
                              {formatted}
                            </div>
                          </div>

                          {isSelected && <CheckCircleFilled style={{ color: '#4f46e5', fontSize: 16 }} />}
                        </div>
                      );
                    })}

                    <Button
                      type="dashed"
                      size="small"
                      onClick={() => setIsAddAddressModalOpen(true)}
                      style={{ borderRadius: 6, color: '#4f46e5', fontWeight: 600, marginTop: 4, width: '100%' }}
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
                          background: '#f8fafc',
                          borderRadius: 10,
                          border: '1.5px dashed #cbd5e1',
                          textAlign: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <EnvironmentOutlined style={{ fontSize: 24, color: '#4f46e5', marginBottom: 6 }} />
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>
                          Default Delivery Address Required
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                          Please add your delivery address to proceed with order checkout.
                        </div>
                        <Button
                          type="primary"
                          onClick={() => setIsAddAddressModalOpen(true)}
                          style={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            border: 'none',
                            fontWeight: 700,
                            borderRadius: 8,
                            fontSize: 13,
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
                          style={{ borderRadius: 8, fontSize: 13 }}
                        />
                        <Flex justify="space-between" align="center" style={{ marginTop: 4 }}>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => setIsAddAddressModalOpen(true)}
                            style={{ padding: 0, fontSize: 11, fontWeight: 600 }}
                          >
                            + Save this address to profile
                          </Button>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => setAddressMode('saved')}
                            style={{ padding: 0, fontSize: 11 }}
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
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#334155' }}>
                Contact Phone
              </div>
              <Input
                prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Mobile number for delivery coordination"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#334155' }}>
                Payment Method
              </div>
              <Radio.Group
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <Radio value="direct_upi">
                  <span style={{ fontWeight: 600 }}>Direct UPI</span> (Pay directly to merchant via
                  GPay/PhonePe upon delivery)
                </Radio>
                <Radio value="cod">
                  <span style={{ fontWeight: 600 }}>Cash on Delivery</span> / Pay at store
                </Radio>
              </Radio.Group>
            </div>

            {/* Bill Summary */}
            <div
              style={{
                background: '#f8fafc',
                padding: '14px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                <Text type="secondary">Items Subtotal</Text>
                <Text>₹{itemsTotal.toFixed(2)}</Text>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                <span>
                  <Text type="secondary">Rquest Platform Fee</Text>{' '}
                  <Tag color="green" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>
                    0% Commission
                  </Tag>
                </span>
                <Text>₹{platformFee.toFixed(2)}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                <span>Total Payable</span>
                <span style={{ color: '#4f46e5' }}>₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Place Order CTA */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handlePlaceOrder}
              style={{
                height: 48,
                fontSize: 16,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              }}
            >
              Place Direct Order (₹{finalTotal.toFixed(2)})
            </Button>
            <div
              style={{
                textAlign: 'center',
                marginTop: 8,
                fontSize: 11,
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <SafetyCertificateOutlined /> Direct connection • No middleman markups
            </div>
          </div>
        </div>
      )}
    </Drawer>
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

