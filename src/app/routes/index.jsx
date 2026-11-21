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
  SearchScreen,
  ClientRegister,
  RegisterScreen,
  StorefrontScreen,
  OrdersScreen,
  ProfileScreen,
  DeliveryPortalScreen,
  AnalyticsScreen,
  StoreCatalogueScreen,
  AdminScreen,
} from '../../screens';
import { ChatApp, NavBar, SideBar, BottomNav, CartScreen, CartOpenBridge, ErrorBoundary } from '../components';
import {
  useChatStore,
  useGlobalStore,
  chatSocket,
  displayPushNotification,
  subscribeToPushNotifications,
} from '../../app/services';
import { apiConfig, netWorkCall, checkUserRole, storageKeys } from '../utils';
import { Badge, message, notification, Grid } from 'antd';
import { MessageFilled } from '@ant-design/icons';
import PrivateRoute, { AdminRoute } from './privateroute';
import { ROLE_HOME } from '../components/navbar/navConfig';

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

// Floating chat button: desktop only (>= 992px, where there is no bottom nav), never on /cart
// (the cart has its own "Chat with store" action and the FAB would cover the bill card).
const useShowChatFab = (fabAllowed) => {
  const location = useLocation();
  return fabAllowed && location.pathname !== routes.cart;
};

// The one <main> landmark for every page. NavBar, BottomNav, chat and the FAB stay outside it.
function RouteShell({ children, fabAllowed }) {
  const location = useLocation();
  const showFab = useShowChatFab(fabAllowed);
  const isAuthRoute =
    location.pathname === routes.login || location.pathname === routes.register;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`app-route-shell${isAuthRoute ? ' app-route-shell--auth' : ''}${
        showFab ? ' app-route-shell--fab' : ''
      }`}
    >
      {children}
    </main>
  );
}

function ChatFab({ fabAllowed, unreadTotal, onOpen }) {
  const showFab = useShowChatFab(fabAllowed);
  if (!showFab) return null;

  const label = unreadTotal > 0 ? `Open messages, ${unreadTotal} unread` : 'Open messages';
  return (
    <button
      type="button"
      className="rquest-chat-fab"
      onClick={onOpen}
      title="Direct messages and store chat"
      aria-label={label}
    >
      <Badge count={unreadTotal} overflowCount={99}>
        <span className="rquest-chat-fab-inner">
          <MessageFilled style={{ fontSize: 25, color: '#ffffff' }} aria-hidden="true" />
        </span>
      </Badge>
    </button>
  );
}

ChatFab.propTypes = {
  fabAllowed: PropTypes.bool,
  unreadTotal: PropTypes.number,
  onOpen: PropTypes.func.isRequired,
};

RouteChangeHandler.propTypes = {
  onRouteChange: PropTypes.func,
};

RouteShell.propTypes = {
  children: PropTypes.node.isRequired,
  fabAllowed: PropTypes.bool,
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
  const [drawer, setdrawer] = useState(false);
  const { isChat, unreadTotal, handleChatOpen } = useChatStore((state) => state);
  const { user_data } = useGlobalStore((state) => state);
  // Chat FAB only from 992px (below that the bottom nav has Chat), signed in, chat closed
  const fabAllowed = !!(user_data?.user_id && !isChat && screens.lg);
  const { role } = checkUserRole(user_data);
  const isLoggedIn = !!(
    user_data?.user_id && sessionStorage?.getItem(storageKeys.auth_token)
  );
  // Signed-in visitors to /login or /register go to their role's home
  const signedInHome = ROLE_HOME[role] || routes.app;

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
      <a className="rq-skip-link" href="#main-content">
        Skip to content
      </a>
      <RouteChangeHandler onRouteChange={handleClose} />
      <PushNotificationHandler />
      <NavBar open={drawer} handleOpen={handleOpen} handleClose={handleClose} />
      <SideBar
        open={drawer}
        handleClose={handleClose}
        handleOpen={handleOpen}
      />
      <BottomNav />
      <RouteShell fabAllowed={fabAllowed}>
        <Switch>
          <Route exact path="/">
            <HomeScreen />
          </Route>
          <Route exact path="/landing">
            <Redirect to="/" />
          </Route>
          <Route exact path="/search">
            <SearchScreen />
          </Route>
          <Route exact path={routes.login}>
            {isLoggedIn ? (
              <Redirect to={signedInHome} />
            ) : (
              <LoginScreen />
            )}
          </Route>
          <Route exact path="/app">
            <Redirect to="/search" />
          </Route>
          <Route exact path="/home">
            <Redirect to="/" />
          </Route>
          <Route exact path={routes.storefront}>
            <StorefrontScreen />
          </Route>
          <Route exact path={routes.cart}>
            <ErrorBoundary>
              <CartScreen />
            </ErrorBoundary>
          </Route>
          <PrivateRoute path={routes.orders} component={OrdersScreen} />
          <PrivateRoute path={routes.profile} component={ProfileScreen} />
          {/* Any signed-in user: there is no separate delivery role and the API accepts any user */}
          <PrivateRoute path={routes.deliveryPortal} component={DeliveryPortalScreen} />
          {/* Owner + admin dashboard; shoppers and guests are bounced to their own home */}
          <PrivateRoute path={routes.analytics} component={AnalyticsScreen} roles={['owner', 'admin']} />
          {/* Owner master catalogue table; reached from the listings page */}
          <PrivateRoute path={routes.storeCatalogue} component={StoreCatalogueScreen} roles={['owner', 'admin']} />
          {/* Platform admins only; others are redirected to their home before the console renders */}
          <AdminRoute path={routes.admin} component={AdminScreen} />
          {/* Signed-in, not owner-only: shoppers open it to register their first store (?onboarding=shop) */}
          <PrivateRoute path={routes.client} component={ClientRegister} />
          {/* Legacy /client and /client?shop_id=… links (server notifications) */}
          <Route
            exact
            path={routes.clientShop}
            render={({ location }) => (
              <Redirect to={{ pathname: routes.client, search: location.search }} />
            )}
          />
          <Route exact path={routes.register}>
            {isLoggedIn ? (
              <Redirect to={signedInHome} />
            ) : (
              <RegisterScreen />
            )}
          </Route>
          <Redirect to="/" />
        </Switch>
      </RouteShell>
      <CartOpenBridge />
      {isChat && <ChatApp />}
      <ChatFab
        fabAllowed={fabAllowed}
        unreadTotal={unreadTotal}
        onOpen={() => handleChatOpen(null, null)}
      />
    </Router>
  );
}
