import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Drawer,
  Button,
  Input,
  Radio,
  Segmented,
  Result,
  Descriptions,
  Typography,
  Tag,
  Empty,
  Flex,
  Form,
  Grid,
  message,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  AimOutlined,
  PhoneOutlined,
  InboxOutlined,
  ClockCircleOutlined,
  QrcodeOutlined,
  ToolOutlined,
  EditOutlined,
  CarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import ChatIcon from '../common/ChatIcon';
import { useCartStore, useGlobalStore, useChatStore } from '../../services';
import { netWorkCall, apiConfig, getPreciseUserLocation, getLocationName } from '../../utils';
import { useHistory } from 'react-router-dom';
import Routes from '../../routes/routes';
import { AddressModal, AddressOption, getFormattedAddress } from '../profile';
import { setCartReturn, takeReopenCartFlag } from '../../utils/returnTo';
import './cart.css';

const { Text } = Typography;

const PREBUILT_QUERIES = [
  {
    icon: <InboxOutlined />,
    label: 'In stock & fresh?',
    text: 'Hi! Is this item available in stock and ready for immediate dispatch / pickup?',
  },
  {
    icon: <ClockCircleOutlined />,
    label: 'Preparation time?',
    text: 'Hi! How long will it take to prepare and pack this order?',
  },
  {
    icon: <EnvironmentOutlined />,
    label: 'Delivery to my area?',
    text: 'Can you deliver to my location landmark? What is the delivery timeline?',
  },
  {
    icon: <QrcodeOutlined />,
    label: 'Pay by UPI on arrival?',
    text: 'Can I pay directly via UPI QR code upon arrival / pickup?',
  },
  {
    icon: <ToolOutlined />,
    label: 'Service quote?',
    text: 'Hi, I need an inspection or quote estimate before confirming this service booking.',
  },
];

const SummaryRow = ({ label, value }) => (
  <div className="rq-cart-summary-row">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

SummaryRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

const CartDrawer = () => {
  const history = useHistory();
  const { cart, isCartOpen, openCart, closeCart, updateQuantity, removeItem, clearCart } =
    useCartStore((state) => state);
  const { user_data } = useGlobalStore((state) => state);
  const { handleChatOpen } = useChatStore((state) => state);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [orderType, setOrderType] = useState('delivery');
  const [paymentMode, setPaymentMode] = useState('direct_upi');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(user_data?.mobile || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Pre-built query / chat with owner states
  const [querySending, setQuerySending] = useState(false);
  const [showCustomQuery, setShowCustomQuery] = useState(false);
  const [customQueryText, setCustomQueryText] = useState('');


  // Address state
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
          setAddress(getFormattedAddress(def));
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

  // Back from the login page: reopen the cart so the user can place the order
  useEffect(() => {
    if (user_data?.user_id && takeReopenCartFlag()) {
      openCart();
      message.success('Signed in. Review your order and place it.');
    }
  }, [user_data?.user_id]);

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setAddressMode('saved');
    setAddress(getFormattedAddress(addr));
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
        message.success('Current location filled in');
      } else {
        message.warning('Could not read that location. Please type your address.');
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

  // Guests sign in on the full login page, then return here with the cart open
  const goToLogin = () => {
    const here = `${history.location.pathname}${history.location.search || ''}`;
    setCartReturn(here);
    closeCart();
    history.push('/login');
  };

  const openAddAddress = () => {
    if (!user_data?.user_id) {
      goToLogin();
    } else {
      setIsAddAddressModalOpen(true);
    }
  };

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsTotal = cart.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const deliveryFee = orderType === 'delivery' ? 30.0 : 0.0;
  const platformFee = 0.0; // 0% commission direct commerce
  const finalTotal = itemsTotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!user_data?.user_id) {
      goToLogin();
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

      const res = await netWorkCall(apiConfig.orders_create, 'POST', JSON.stringify(payload), true);

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

  // Store owner's user id: from the cart, or looked up from the shop
  const resolveOwnerId = async () => {
    let ownerId = cart.owner_id;
    if (!ownerId && cart.shop_id) {
      try {
        const shopDetails = await netWorkCall(`${apiConfig.shop_details}/${cart.shop_id}/details`, 'GET', null, false);
        ownerId = shopDetails?.data?.owner_id;
      } catch (err) {
        console.error('Error fetching shop details for chat:', err);
      }
    }
    if (!ownerId) {
      message.warning('Store contact is unavailable right now. You can still place the order.');
    }
    return ownerId;
  };

  const handleSendPrebuiltInquiry = async (queryText) => {
    if (!queryText || !queryText.trim()) {
      message.error('Please enter or select a question');
      return;
    }

    if (!user_data?.user_id) {
      message.info('Please sign in to chat directly with the store owner');
      goToLogin();
      return;
    }

    const targetOwnerId = await resolveOwnerId();
    if (!targetOwnerId) return;

    setQuerySending(queryText === customQueryText ? 'custom' : queryText);
    try {
      const itemsSummary = cart.items.map((i) => `${i.quantity}x ${i.item_name}`).join(', ');
      const messageContent = itemsSummary
        ? `Customer Pre-order Inquiry regarding [${itemsSummary}]:\n\n"${queryText.trim()}"`
        : `Customer Pre-order Inquiry:\n\n"${queryText.trim()}"`;

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

      message.success('Question sent to the store owner');
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

  // Open a chat with the store owner, without sending anything on the user's behalf
  const handleChatWithStore = async () => {
    if (!user_data?.user_id) {
      goToLogin();
      return;
    }
    const ownerId = await resolveOwnerId();
    if (!ownerId) return;
    closeCart();
    handleChatOpen(ownerId, cart.shop_id, { shop_name: cart.shop_name });
  };

  const handleClose = () => {
    setOrderSuccess(null);
    closeCart();
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const hasSavedList = addressMode === 'saved' && savedAddresses.length > 0;
  const showItems = !orderSuccess && cart.items.length > 0;

  const title = (
    <div className="rq-cart-title">
      <span className="rq-cart-title-icon">
        <ShoppingCartOutlined />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="rq-cart-title-main">Your cart</div>
        {cart.shop_name && (
          <div className="rq-cart-title-sub" title={cart.shop_name}>
            From {cart.shop_name}
          </div>
        )}
      </div>
    </div>
  );

  const footer = showItems ? (
    <div className="rq-cart-footer">
      <div className="rq-cart-footer-total">
        <Text type="secondary" style={{ fontSize: 13 }}>
          Total · {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </Text>
        <span className="rq-cart-footer-amount">₹{finalTotal.toFixed(2)}</span>
      </div>
      {user_data?.user_id ? (
        <Button type="primary" size="large" block loading={loading} onClick={handlePlaceOrder}>
          Place order
        </Button>
      ) : (
        <Button type="primary" size="large" block onClick={goToLogin}>
          Sign in to place order
        </Button>
      )}
      <Button
        type="text"
        block
        icon={<ChatIcon />}
        disabled={loading || !!querySending}
        onClick={handleChatWithStore}
      >
        Chat with store
      </Button>
    </div>
  ) : null;

  const renderSuccess = () => (
    <Result
      status="success"
      title="Order placed"
      subTitle={
        <>
          Order #{orderSuccess.order_number} was sent to{' '}
          <strong>{orderSuccess.shop?.shop_name || 'the store'}</strong>. You will see updates in your orders.
        </>
      }
      extra={[
        <Button
          type="primary"
          key="orders"
          onClick={() => {
            handleClose();
            history.push(Routes.orders);
          }}
        >
          View order details
        </Button>,
        <Button key="continue" onClick={handleClose}>
          Continue browsing
        </Button>,
      ]}
    >
      <Descriptions
        size="small"
        column={1}
        bordered
        items={[
          {
            key: 'total',
            label: 'Total amount',
            children: `₹${Number(orderSuccess.total_amount || 0).toFixed(2)}`,
          },
          {
            key: 'payment',
            label: 'Payment mode',
            children: <Tag style={{ margin: 0 }}>{orderSuccess.payment_mode}</Tag>,
          },
          {
            key: 'status',
            label: 'Status',
            children: (
              <Tag color="gold" style={{ margin: 0 }}>
                Pending acceptance
              </Tag>
            ),
          },
        ]}
      />
    </Result>
  );

  const renderEmpty = () => (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      style={{ marginTop: 48 }}
      description={
        <>
          <div className="rq-cart-section-title">Your cart is empty</div>
          <div className="rq-cart-hint" style={{ margin: '4px 0 0' }}>
            Browse nearby shops, food or services to add items.
          </div>
        </>
      }
    >
      <Button type="primary" onClick={closeCart}>
        Explore market
      </Button>
    </Empty>
  );

  const renderItems = () => (
    <section className="rq-cart-section">
      <div className="rq-cart-section-head">
        <span className="rq-cart-section-title">Items ({itemCount})</span>
      </div>

      {cart.items.map((item) => (
        <div key={item.listing_id} className="rq-cart-item">
          {item.img_url ? (
            <img src={item.img_url} alt={item.item_name} className="rq-cart-item-thumb" />
          ) : (
            <div className="rq-cart-item-thumb-placeholder">
              <ShopOutlined />
            </div>
          )}

          <div className="rq-cart-item-info">
            <div className="rq-cart-item-name" title={item.item_name}>
              {item.item_name}
            </div>
            <div className="rq-cart-item-price">
              ₹{item.unit_price}
              {item.unit ? ` / ${item.unit}` : ''}
            </div>
            <div className="rq-cart-item-line">₹{(item.unit_price * item.quantity).toFixed(2)}</div>
          </div>

          <div className="rq-qty" role="group" aria-label={`Quantity of ${item.item_name}`}>
            <Button
              type="text"
              icon={<MinusOutlined />}
              onClick={() => updateQuantity(item.listing_id, -1)}
              aria-label="Decrease quantity"
            />
            <span className="rq-qty-value">{item.quantity}</span>
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={() => updateQuantity(item.listing_id, 1)}
              aria-label="Increase quantity"
            />
          </div>

          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeItem(item.listing_id)}
            aria-label="Remove item"
          />
        </div>
      ))}
    </section>
  );

  const renderAddressSection = () => (
    <section className="rq-cart-section">
      <div className="rq-cart-section-head">
        <span className="rq-cart-section-title">Delivery address</span>
        <div className="rq-cart-section-links">
          {savedAddresses.length > 0 && (
            <Button
              type="link"
              size="small"
              onClick={() => setAddressMode(addressMode === 'saved' ? 'manual' : 'saved')}
              style={{ padding: 0 }}
            >
              {addressMode === 'saved' ? 'Enter manually' : 'Use saved address'}
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<AimOutlined />}
            loading={detectingGps}
            onClick={handleUseLiveGpsInCart}
            style={{ padding: 0 }}
          >
            Use current location
          </Button>
        </div>
      </div>

      {hasSavedList ? (
        <div className="rq-address-picker" role="radiogroup" aria-label="Saved addresses">
          {savedAddresses.map((addr) => (
            <AddressOption
              key={addr.id}
              address={addr}
              selected={selectedAddressId === addr.id}
              onSelect={handleSelectSavedAddress}
            />
          ))}
          <Button type="dashed" icon={<PlusOutlined />} block onClick={openAddAddress}>
            Add new delivery address
          </Button>
        </div>
      ) : addressMode === 'manual' ? (
        <>
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="House no., street, landmark, locality"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div className="rq-cart-section-links" style={{ marginTop: 8 }}>
            <Button type="link" size="small" onClick={openAddAddress} style={{ padding: 0 }}>
              Save this address to profile
            </Button>
            {savedAddresses.length > 0 && (
              <Button type="link" size="small" onClick={() => setAddressMode('saved')} style={{ padding: 0 }}>
                Choose a saved address
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="rq-query-box" style={{ textAlign: 'center' }}>
          <EnvironmentOutlined style={{ fontSize: 24, color: '#0b2d6b' }} />
          <div className="rq-cart-section-title" style={{ marginTop: 6 }}>
            Add a delivery address
          </div>
          <div className="rq-cart-hint" style={{ margin: '4px 0 12px' }}>
            A delivery address is needed to place this order.
          </div>
          <Button type="primary" onClick={openAddAddress}>
            Add delivery address
          </Button>
        </div>
      )}
    </section>
  );

  const renderFulfilment = () => (
    <section className="rq-cart-section">
      <div className="rq-cart-section-head">
        <span className="rq-cart-section-title">Fulfilment</span>
      </div>
      <Segmented
        block
        size="large"
        value={orderType}
        onChange={setOrderType}
        options={[
          {
            label: (
              <span className="rq-seg-opt">
                <CarOutlined /> Delivery <em>₹30</em>
              </span>
            ),
            value: 'delivery',
          },
          {
            label: (
              <span className="rq-seg-opt">
                <ShopOutlined /> Self-pickup <em>Free</em>
              </span>
            ),
            value: 'pickup',
          },
        ]}
      />
    </section>
  );

  const renderContactAndNotes = () => (
    <section className="rq-cart-section">
      <Form layout="vertical" size="large" requiredMark={false} className="rq-cart-form">
        <Form.Item label="Contact phone" required>
          <Input
            prefix={<PhoneOutlined style={{ color: 'var(--outline)' }} />}
            placeholder="Mobile number for order updates"
            value={phone}
            inputMode="tel"
            onChange={(e) => setPhone(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="Instructions for the store (optional)">
          <Input
            placeholder="e.g. Ring the bell, call before delivery"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Form.Item>
      </Form>
    </section>
  );

  const fulfilmentWord = orderType === 'delivery' ? 'delivery' : 'pickup';

  const renderPayment = () => (
    <section className="rq-cart-section">
      <div className="rq-cart-section-head">
        <span className="rq-cart-section-title">Payment method</span>
      </div>
      <Radio.Group
        className="rq-payment-group"
        value={paymentMode}
        onChange={(e) => setPaymentMode(e.target.value)}
      >
        <Radio value="direct_upi" className="rq-payment-option">
          <span>
            <span className="rq-payment-title">Direct UPI</span>
            <span className="rq-payment-desc">Pay the store via GPay or PhonePe on {fulfilmentWord}</span>
          </span>
        </Radio>
        <Radio value="cod" className="rq-payment-option">
          <span>
            <span className="rq-payment-title">Cash on delivery</span>
            <span className="rq-payment-desc">Pay the store in cash on {fulfilmentWord}</span>
          </span>
        </Radio>
      </Radio.Group>
      <div className="rq-cart-hint" style={{ margin: '8px 0 0' }}>
        The store confirms and packs your order first, then you pay on {fulfilmentWord}.
      </div>
    </section>
  );

  const renderSummary = () => (
    <section className="rq-cart-section">
      <div className="rq-cart-section-head">
        <span className="rq-cart-section-title">Bill summary</span>
      </div>
      <div className="rq-cart-summary">
        <SummaryRow label="Subtotal" value={`₹${itemsTotal.toFixed(2)}`} />
        {orderType === 'delivery' && <SummaryRow label="Delivery fee" value={`₹${deliveryFee.toFixed(2)}`} />}
        <div className="rq-cart-summary-row">
          <span>Platform fee</span>
          <span className="rq-cart-pill-free">Free</span>
        </div>
        <div className="rq-cart-summary-row rq-cart-summary-total">
          <span>Total</span>
          <strong>₹{finalTotal.toFixed(2)}</strong>
        </div>
      </div>
    </section>
  );

  const renderQueries = () => (
    <section className="rq-cart-section">
      <div className="rq-query-box">
        <div className="rq-cart-section-title">Have a question first?</div>
        <div className="rq-cart-hint" style={{ margin: '2px 0 0' }}>
          Send a quick message to the store owner before you order.
        </div>

        <div className="rq-query-chips">
          {PREBUILT_QUERIES.map((q) => (
            <Button
              key={q.label}
              size="small"
              icon={q.icon}
              loading={querySending === q.text}
              disabled={loading || !!querySending}
              onClick={() => handleSendPrebuiltInquiry(q.text)}
            >
              {q.label}
            </Button>
          ))}
        </div>

        {showCustomQuery ? (
          <div style={{ marginTop: 12 }}>
            <Input.TextArea
              rows={2}
              maxLength={500}
              showCount
              placeholder="Type your question for the store owner"
              value={customQueryText}
              onChange={(e) => setCustomQueryText(e.target.value)}
            />
            <Flex justify="flex-end" gap={8} style={{ marginTop: 8 }}>
              <Button size="small" onClick={() => setShowCustomQuery(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                size="small"
                loading={querySending === 'custom'}
                onClick={() => handleSendPrebuiltInquiry(customQueryText)}
              >
                Send question
              </Button>
            </Flex>
          </div>
        ) : (
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setShowCustomQuery(true)}
            style={{ padding: 0, marginTop: 8 }}
          >
            Write your own question
          </Button>
        )}
      </div>
    </section>
  );

  const renderBody = () => {
    if (orderSuccess) return renderSuccess();
    if (cart.items.length === 0) return renderEmpty();

    return (
      <>
        {!user_data?.user_id && (
          <div className="rq-cart-signin">
            <span className="rq-cart-signin-icon">
              <UserOutlined />
            </span>
            <div className="rq-cart-signin-text">
              <div className="rq-cart-signin-title">Sign in to place your order</div>
              <div className="rq-cart-signin-sub">Your cart is saved. You'll come straight back here.</div>
            </div>
            <Button type="primary" className="rq-cart-signin-btn" onClick={goToLogin}>
              Sign in
            </Button>
          </div>
        )}

        {renderItems()}
        {renderFulfilment()}
        {orderType !== 'pickup' && renderAddressSection()}
        {renderContactAndNotes()}
        {renderPayment()}
        {renderSummary()}
        {renderQueries()}
      </>
    );
  };

  return (
    <>
      <Drawer
        title={title}
        placement={isMobile ? 'bottom' : 'right'}
        height={isMobile ? '100dvh' : undefined}
        width={isMobile ? undefined : 440}
        open={isCartOpen}
        onClose={handleClose}
        zIndex={1200}
        footer={footer}
        rootClassName={isMobile ? 'rq-cart-drawer rq-cart-drawer--mobile' : 'rq-cart-drawer'}
        styles={{
          body: { padding: isMobile ? '16px' : '20px 24px' },
          footer: {
            padding: isMobile
              ? '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))'
              : '16px 24px',
            borderTop: '1px solid #ebe7e0',
          },
        }}
      >
        {renderBody()}
      </Drawer>

      {isAddAddressModalOpen && (
        <AddressModal
          open={isAddAddressModalOpen}
          onClose={() => setIsAddAddressModalOpen(false)}
          onSuccess={handleNewAddressCreated}
          userProfile={user_data}
          zIndex={1400}
        />
      )}
    </>
  );
};

export default CartDrawer;
