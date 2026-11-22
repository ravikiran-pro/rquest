import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Input,
  Radio,
  Segmented,
  Result,
  Descriptions,
  Tag,
  Empty,
  Flex,
  Form,
  Grid,
  Popconfirm,
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
  ArrowLeftOutlined,
} from '@ant-design/icons';
import ChatIcon from '../common/ChatIcon';
import { useCartStore, useGlobalStore, useChatStore } from '../../services';
import { netWorkCall, apiConfig, getPreciseUserLocation, getLocationName } from '../../utils';
import { useHistory } from 'react-router-dom';
import Routes from '../../routes/routes';
import { AddressModal, AddressOption, getFormattedAddress } from '../profile';
import { setCartReturn, takeReopenCartFlag } from '../../utils/returnTo';
import './cart.css';

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

// Checkout choices kept per tab (sessionStorage) so signing in from the cart doesn't reset them
const CHECKOUT_DRAFT_KEY = 'rq_cart_checkout_draft';

const readCheckoutDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CHECKOUT_DRAFT_KEY)) || {};
  } catch {
    return {};
  }
};

const writeCheckoutDraft = (draft) => {
  try {
    sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* private mode: nothing to keep */
  }
};

const clearCheckoutDraft = () => {
  try {
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    /* ignore */
  }
};

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

// Opening the cart (from any "cart" button) now goes to the /cart page.
// Mounted once inside the router; it turns the open flag into navigation.
export const CartOpenBridge = () => {
  const history = useHistory();
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const closeCart = useCartStore((state) => state.closeCart);

  useEffect(() => {
    if (isCartOpen) {
      closeCart();
      if (history.location.pathname !== Routes.cart) {
        history.push(Routes.cart);
      }
    }
  }, [isCartOpen]);

  return null;
};

const CartScreen = () => {
  const history = useHistory();
  const { cart, updateQuantity, removeItem, clearCart } = useCartStore((state) => state);
  const { user_data } = useGlobalStore((state) => state);
  const { handleChatOpen } = useChatStore((state) => state);

  // Fees come from Admin > Platform configuration. Until (or unless) the settings load, the
  // cart shows the fees it always used: no platform fee and a Rs 30 delivery fee.
  const [platformSettings, setPlatformSettings] = useState(null);
  useEffect(() => {
    let active = true;
    netWorkCall(apiConfig.platform_settings, 'GET', null, false)
      .then((res) => {
        if (active && res?.success && res.data) setPlatformSettings(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const screens = Grid.useBreakpoint();
  // Two columns (items left, bill right) from laptop width up; single column below
  const isWide = !!screens.lg;

  // Checkout choices survive a guest's trip to /login and back (the page unmounts on the way)
  const [draft] = useState(readCheckoutDraft);
  const [orderType, setOrderType] = useState(draft.orderType || 'delivery');
  const [paymentMode, setPaymentMode] = useState(draft.paymentMode || 'direct_upi');
  const [address, setAddress] = useState(draft.manualAddress || '');
  const [phone, setPhone] = useState(draft.phone || user_data?.mobile || '');
  const [notes, setNotes] = useState(draft.notes || '');
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Pre-built query / chat with owner states
  const [querySending, setQuerySending] = useState(false);
  const [showCustomQuery, setShowCustomQuery] = useState(false);
  const [customQueryText, setCustomQueryText] = useState('');

  // Focus targets and screen-reader announcements after items change
  const itemsHeadingRef = useRef(null);
  const queryToggleRef = useRef(null);
  const addressReturnFocusRef = useRef(null);
  const [liveMessage, setLiveMessage] = useState('');

  // Address state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressMode, setAddressMode] = useState(draft.manualAddress ? 'manual' : 'saved'); // 'saved' | 'manual'

  useEffect(() => {
    writeCheckoutDraft({
      orderType,
      paymentMode,
      notes,
      phone,
      manualAddress: addressMode === 'manual' ? address : '',
    });
  }, [orderType, paymentMode, notes, phone, address, addressMode]);
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
    if (user_data?.user_id) {
      fetchSavedAddresses();
      if (!phone && user_data?.mobile) {
        setPhone(user_data.mobile);
      }
    }
  }, [user_data?.user_id]);

  // Back from the login page: the cart page is the place to finish the order
  useEffect(() => {
    if (user_data?.user_id && takeReopenCartFlag()) {
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
    history.push('/login');
  };

  const openAddAddress = () => {
    if (!user_data?.user_id) {
      goToLogin();
    } else {
      addressReturnFocusRef.current = document.activeElement;
      setIsAddAddressModalOpen(true);
    }
  };

  // The address modal is unmounted on close, so hand focus back to whatever opened it
  const closeAddAddress = () => {
    setIsAddAddressModalOpen(false);
    const el = addressReturnFocusRef.current;
    addressReturnFocusRef.current = null;
    setTimeout(() => {
      if (el && el.isConnected) el.focus();
    }, 0);
  };

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsTotal = cart.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  // Display only: the server recomputes both fees from the settings when the order is placed
  const platformFee = platformSettings ? Number(platformSettings.platform_fee) || 0 : 0;
  const freeDeliveryOver = Number(platformSettings?.free_delivery_threshold) || 0;
  const baseDeliveryFee = platformSettings ? Number(platformSettings.delivery_fee_base) || 0 : 30;
  const deliveryFee =
    orderType === 'delivery'
      ? freeDeliveryOver > 0 && itemsTotal >= freeDeliveryOver
        ? 0
        : baseDeliveryFee
      : 0.0;
  const finalTotal = itemsTotal + deliveryFee + platformFee;

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
        clearCheckoutDraft();
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
      handleChatOpen(targetOwnerId, cart.shop_id, { shop_name: cart.shop_name });
    } catch (err) {
      console.error('Failed to send inquiry to chat:', err);
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
    handleChatOpen(ownerId, cart.shop_id, { shop_name: cart.shop_name });
  };

  // Go back inside the app. The first entry of a tab has no location key, so a cart opened
  // from a link or bookmark goes to the market instead of leaving the site.
  const goBackToShopping = () => {
    setOrderSuccess(null);
    if (history.location.key) {
      history.goBack();
    } else {
      history.push(Routes.search);
    }
  };

  const handleRemoveItem = (item) => {
    removeItem(item.listing_id);
    setLiveMessage(`${item.item_name} removed from your cart`);
    // The removed row (and its focused button) is gone: move focus to a stable heading
    setTimeout(() => itemsHeadingRef.current?.focus(), 0);
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const hasSavedList = addressMode === 'saved' && savedAddresses.length > 0;

  const pageTitle = (
    <div className="rq-cart-title">
      <span className="rq-cart-title-icon">
        <ShoppingCartOutlined />
      </span>
      <div style={{ minWidth: 0 }}>
        <h1 className="rq-cart-title-main">Your cart</h1>
        {cart.shop_name && (
          <div className="rq-cart-title-sub" title={cart.shop_name}>
            From {cart.shop_name}
          </div>
        )}
      </div>
    </div>
  );

  // Place order + chat. `compact` is the sticky bar on phones and tablets;
  // the full version sits under the bill on laptop and up.
  const renderActions = (compact) => (
    <div className={compact ? 'rq-cart-actions rq-cart-actions--compact' : 'rq-cart-actions'}>
      {compact && (
        <div className="rq-cart-actions-total">
          <span className="rq-cart-actions-label">
            Total · {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
          <span className="rq-cart-footer-amount">₹{finalTotal.toFixed(2)}</span>
        </div>
      )}
      {user_data?.user_id ? (
        <Button type="primary" size="large" block loading={loading} onClick={handlePlaceOrder}>
          {compact ? 'Place order' : `Place order · ₹${finalTotal.toFixed(2)}`}
        </Button>
      ) : (
        <Button type="primary" size="large" block onClick={goToLogin}>
          Sign in to place order
        </Button>
      )}
      {!compact && (
        <Button
          block
          icon={<ChatIcon />}
          disabled={loading || !!querySending}
          onClick={handleChatWithStore}
        >
          Chat with store
        </Button>
      )}
    </div>
  );

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
            setOrderSuccess(null);
            history.push(Routes.orders);
          }}
        >
          View order details
        </Button>,
        <Button key="continue" onClick={goBackToShopping}>
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
      <Button type="primary" onClick={() => history.push(Routes.search)}>
        Explore market
      </Button>
    </Empty>
  );

  const renderItems = () => (
    <section className="rq-cart-section">
      <div className="rq-cart-section-head">
        <h2 className="rq-cart-section-title" ref={itemsHeadingRef} tabIndex={-1}>
          Items ({itemCount})
        </h2>
      </div>
      <div className="rq-sr-only" aria-live="polite">
        {liveMessage}
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
            {/* At 1 the minus button is disabled: removing is the bin button's job (with a confirm) */}
            <Button
              type="text"
              icon={<MinusOutlined />}
              onClick={() => updateQuantity(item.listing_id, -1)}
              disabled={item.quantity <= 1}
              aria-label={`Decrease quantity of ${item.item_name}`}
            />
            <span className="rq-qty-value" aria-live="polite">
              {item.quantity}
            </span>
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={() => updateQuantity(item.listing_id, 1)}
              aria-label={`Increase quantity of ${item.item_name}`}
            />
          </div>

          <Popconfirm
            title={`Remove ${item.item_name}?`}
            okText="Remove"
            cancelText="Keep"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleRemoveItem(item)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Remove ${item.item_name}`}
            />
          </Popconfirm>
        </div>
      ))}
    </section>
  );

  const renderAddressSection = () => (
    <section className="rq-cart-section">
      <div className="rq-cart-section-head">
        <h2 className="rq-cart-section-title">Delivery address</h2>
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
            aria-label="Delivery address"
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
          <EnvironmentOutlined style={{ fontSize: 24, color: '#A8451F' }} />
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
        <h2 className="rq-cart-section-title">Fulfilment</h2>
      </div>
      <Segmented
        block
        size="large"
        aria-label="Fulfilment method"
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
        <Form.Item label="Contact phone" required htmlFor="rq-cart-phone">
          <Input
            id="rq-cart-phone"
            prefix={<PhoneOutlined style={{ color: 'var(--outline)' }} />}
            placeholder="Mobile number for order updates"
            value={phone}
            inputMode="tel"
            onChange={(e) => setPhone(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="Instructions for the store (optional)" htmlFor="rq-cart-notes">
          <Input
            id="rq-cart-notes"
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
        <h2 className="rq-cart-section-title">Payment method</h2>
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
        <h2 className="rq-cart-section-title">Bill summary</h2>
      </div>
      <div className="rq-cart-summary">
        <SummaryRow label="Subtotal" value={`₹${itemsTotal.toFixed(2)}`} />
        {orderType === 'delivery' && <SummaryRow label="Delivery fee" value={`₹${deliveryFee.toFixed(2)}`} />}
        <div className="rq-cart-summary-row">
          <span>Platform fee</span>
          {platformFee > 0 ? <strong>₹{platformFee.toFixed(2)}</strong> : <span className="rq-cart-pill-free">Free</span>}
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
              id="rq-cart-custom-question"
              rows={2}
              maxLength={500}
              showCount
              autoFocus
              aria-label="Your question for the store owner"
              placeholder="Type your question for the store owner"
              value={customQueryText}
              onChange={(e) => setCustomQueryText(e.target.value)}
            />
            <Flex justify="flex-end" gap={8} style={{ marginTop: 8 }}>
              <Button
                size="small"
                onClick={() => {
                  setShowCustomQuery(false);
                  // the toggle remounts; put focus back on it
                  setTimeout(() => queryToggleRef.current?.focus(), 0);
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                size="small"
                loading={querySending === 'custom'}
                disabled={!customQueryText.trim()}
                onClick={() => handleSendPrebuiltInquiry(customQueryText)}
              >
                Send question
              </Button>
            </Flex>
          </div>
        ) : (
          <Button
            ref={queryToggleRef}
            type="link"
            size="small"
            icon={<EditOutlined />}
            aria-expanded={false}
            aria-controls="rq-cart-custom-question"
            onClick={() => setShowCustomQuery(true)}
            style={{ padding: 0, marginTop: 8 }}
          >
            Write your own question
          </Button>
        )}
      </div>
    </section>
  );

  const renderSignInBanner = () => (
    <>
        {!user_data?.user_id && (
          <div className="rq-cart-signin">
            <span className="rq-cart-signin-icon">
              <UserOutlined />
            </span>
            <div className="rq-cart-signin-text">
              <div className="rq-cart-signin-title">Sign in to place your order</div>
              <div className="rq-cart-signin-sub">Your cart is saved. You&apos;ll come straight back here.</div>
            </div>
            <Button type="primary" className="rq-cart-signin-btn" onClick={goToLogin}>
              Sign in
            </Button>
          </div>
        )}
    </>
  );

  const renderLayout = () => {
    if (orderSuccess) return <div className="rq-cart-single">{renderSuccess()}</div>;
    if (cart.items.length === 0) return <div className="rq-cart-single">{renderEmpty()}</div>;

    return (
      <div className={isWide ? 'rq-cart-layout rq-cart-layout--wide' : 'rq-cart-layout'}>
        <div className="rq-cart-main">
          {renderSignInBanner()}
          {renderItems()}
          {renderFulfilment()}
          {orderType !== 'pickup' && renderAddressSection()}
          {renderContactAndNotes()}
          {renderPayment()}
          {!isWide && renderSummary()}
          {renderQueries()}
        </div>
        <aside className={isWide ? 'rq-cart-aside rq-cart-aside--wide' : 'rq-cart-aside'}>
          {isWide ? (
            <div className="rq-cart-aside-card">
              {renderSummary()}
              {renderActions(false)}
            </div>
          ) : (
            renderActions(true)
          )}
        </aside>
      </div>
    );
  };

  return (
    <div className="rq-cart-page">
      <div className="rq-cart-page-inner">
        <header className="rq-cart-page-head">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={goBackToShopping}
            aria-label="Go back"
            className="rq-cart-back"
          />
          {pageTitle}
        </header>
        {renderLayout()}
      </div>

      {isAddAddressModalOpen && (
        <AddressModal
          open={isAddAddressModalOpen}
          onClose={closeAddAddress}
          onSuccess={handleNewAddressCreated}
          userProfile={user_data}
          zIndex={1400}
        />
      )}
    </div>
  );
};

export default CartScreen;
