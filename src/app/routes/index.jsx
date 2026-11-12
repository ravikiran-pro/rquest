import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
  useLocation,
  useHistory,
} from 'react-router-dom';
import { default as routes } from './routes';
import {
  LoginScreen,
  HomeScreen,
  ClientRegister,
  RegisterScreen,
  StorefrontScreen,
  OrdersScreen,
  ProfileScreen,
  DeliveryPortalScreen,
  AdminScreen,
} from '../../screens';
import { ChatApp, NavBar, SideBar, BottomNav, CartDrawer, ErrorBoundary } from '../components';
import {
  useChatStore,
  useGlobalStore,
  useCartStore,
  chatSocket,
  displayPushNotification,
  subscribeToPushNotifications,
} from '../../app/services';
import { apiConfig, netWorkCall, checkUserRole, storageKeys } from '../utils';
import { Badge, message, notification, Grid } from 'antd';
import { MessageFilled } from '@ant-design/icons';
import PrivateRoute from './privateroute';

// Configure global message and notification toast behavior
message.config({
  maxCount: 3,
  duration: 3.5,
});

notification.config({
  placement: 'bottom',
  bottom: 32,
  duration: 3.5,
});

function RouteChangeHandler({ onRouteChange }) {
  const location = useLocation();
  const { isChat, handleChatClose } = useChatStore((state) => state);
  const prevPath = React.useRef(location.pathname);

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      if (onRouteChange) {
        onRouteChange();
      }
      if (isChat) {
        handleChatClose();
      }
    }
  }, [location.pathname, isChat, handleChatClose, onRouteChange]);

  return null;
}

function RouteShell({ children }) {
  const location = useLocation();
  const isAuthRoute =
    location.pathname === routes.login || location.pathname === routes.register;

  return (
    <div
      className={`app-route-shell${isAuthRoute ? ' app-route-shell--auth' : ''}`}
    >
      {children}
    </div>
  );
}

RouteChangeHandler.propTypes = {
  onRouteChange: PropTypes.func,
};

RouteShell.propTypes = {
  children: PropTypes.node.isRequired,
};

function PushNotificationHandler() {
  const history = useHistory();
  const { user_data } = useGlobalStore((state) => state);

  useEffect(() => {
    if (!user_data?.user_id) return;

    // Auto-subscribe to web push if permission was previously granted
    if ('Notification' in window && Notification.permission === 'granted') {
      subscribeToPushNotifications(user_data).catch(() => {});
    }

    // Listen to real-time push notifications (register, order place, order status change)
    const unsub = chatSocket.onPushNotification((notifData) => {
      displayPushNotification(notifData, history);
    });

    return () => unsub();
  }, [user_data, history]);

  return null;
}

export default function AppRoutes() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [drawer, setdrawer] = useState(false);
  const { isChat, unreadTotal, handleChatOpen } = useChatStore((state) => state);
  const { user_data } = useGlobalStore((state) => state);
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const { isMerchant } = checkUserRole(user_data);
  const isLoggedIn = !!(
    user_data?.user_id && sessionStorage?.getItem(storageKeys.auth_token)
  );

  const handleClose = () => {
    setdrawer(false);
  };

  const handleOpen = () => {
    setdrawer(true);
  };

  useEffect(() => {
    if (user_data?.user_id) {
      chatSocket.joinUser(user_data);

      netWorkCall(apiConfig.chat_unread_count, 'POST', JSON.stringify({ user_id: user_data.user_id }), true)
        .then((res) => {
          if (res && res.count !== undefined) {
            useChatStore.getState().setUnreadTotal(res.count);
          }
        })
        .catch(() => {});
    }
  }, [user_data]);

  useEffect(() => {
    if (!user_data?.user_id) return;
    const unsub = chatSocket.onReceiveMessage((incomingMsg) => {
      if (!isChat) {
        useChatStore.getState().incrementUnread(1);
        notification.info({
          message: `New message from ${incomingMsg.username || 'User'}`,
          description: incomingMsg.message,
          placement: 'bottomRight',
          onClick: () => {
            handleChatOpen(incomingMsg.sender_id, incomingMsg.shop_id);
          },
        });
      }
    });
    return () => unsub();
  }, [isChat, user_data]);

  useEffect(() => {
    // default service to trigger on change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetch(`https://rquest-cdn.onrender.com/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up the event listener on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <Router>
      <RouteChangeHandler onRouteChange={handleClose} />
      <PushNotificationHandler />
      <NavBar open={drawer} handleOpen={handleOpen} handleClose={handleClose} />
      <SideBar
        open={drawer}
        handleClose={handleClose}
        handleOpen={handleOpen}
      />
      <BottomNav />
      <RouteShell>
        <Switch>
          <Route exact path="/">
            <HomeScreen />
          </Route>
          <Route exact path="/landing">
            <Redirect to="/" />
          </Route>
          <Route exact path={routes.login}>
            {isLoggedIn ? (
              <Redirect to={isMerchant ? routes.client : routes.app} />
            ) : (
              <LoginScreen />
            )}
          </Route>
          <Route exact path="/app">
            <Redirect to="/" />
          </Route>
          <Route exact path="/home">
            <Redirect to="/" />
          </Route>
          <Route exact path={routes.storefront}>
            <StorefrontScreen />
          </Route>
          <PrivateRoute path={routes.orders} component={OrdersScreen} />
          <PrivateRoute path={routes.profile} component={ProfileScreen} />
          <PrivateRoute path={routes.deliveryPortal} component={DeliveryPortalScreen} />
          <PrivateRoute path={routes.admin} component={AdminScreen} />
          <PrivateRoute path={routes.client} component={ClientRegister} />
          <PrivateRoute path={routes.clientShop} component={ClientRegister} />
          <Route exact path={routes.register}>
            {isLoggedIn ? (
              <Redirect to={isMerchant ? routes.client : routes.app} />
            ) : (
              <RegisterScreen />
            )}
          </Route>
          <Redirect to="/" />
        </Switch>
      </RouteShell>
      <ErrorBoundary fallback={null}>
        <CartDrawer />
      </ErrorBoundary>
      {isChat && <ChatApp />}
      {user_data?.user_id && !isChat && !isCartOpen && !isMobile && (
        <div
          className="rquest-chat-fab"
          onClick={() => handleChatOpen(null, null)}
          title="Direct Messages & Store Chat"
          aria-label="Open Messages"
        >
          <Badge count={unreadTotal} overflowCount={99}>
            <div className="rquest-chat-fab-inner">
              <MessageFilled style={{ fontSize: 25, color: '#ffffff' }} />
            </div>
          </Badge>
        </div>
      )}
    </Router>
  );
}
