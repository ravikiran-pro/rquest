import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
  useLocation,
} from 'react-router-dom';
import { default as routes } from './routes';
import {
  LoginScreen,
  HomeScreen,
  LandingScreen,
  ClientRegister,
  RegisterScreen,
  StorefrontScreen,
  OrdersScreen,
  ProfileScreen,
  DeliveryPortalScreen,
  AdminScreen,
} from '../../screens';
import { ChatApp, NavBar, SideBar, CartDrawer, ErrorBoundary } from '../components';
import { useChatStore, useGlobalStore, useCartStore, chatSocket } from '../../app/services';
import { apiConfig, netWorkCall } from '../utils';
import { Avatar, Badge, message, notification } from 'antd';
import { MessageFilled, CloseOutlined } from '@ant-design/icons';
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

function RouteChangeHandler() {
  const location = useLocation();
  const { isChat, handleChatClose } = useChatStore((state) => state);
  const prevPath = React.useRef(location.pathname);

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      if (isChat) {
        handleChatClose();
      }
    }
  }, [location.pathname, isChat, handleChatClose]);

  return null;
}

export default function AppRoutes() {
  const [drawer, setdrawer] = useState(false);
  const { isChat, unreadTotal, handleChatOpen, handleChatClose } = useChatStore((state) => state);
  const { user_data } = useGlobalStore((state) => state);
  const isCartOpen = useCartStore((state) => state.isOpen);

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
      <RouteChangeHandler />
      <NavBar open={drawer} handleOpen={handleOpen} handleClose={handleClose} />
      <SideBar
        open={drawer}
        handleClose={handleClose}
        handleOpen={handleOpen}
      />
      <div style={{ minHeight: 'calc(100vh - 64px)', overflowX: 'hidden' }}>
        <Switch>
          <Route exact path={routes.landing}>
            <LandingScreen />
          </Route>
          <Route path="/landing">
            <LandingScreen />
          </Route>
          <Route path={routes.login}>
            <LoginScreen />
          </Route>
          <Route path={routes.app}>
            <HomeScreen />
          </Route>
          <Route path="/home">
            <HomeScreen />
          </Route>
          <Route path={routes.storefront}>
            <StorefrontScreen />
          </Route>
          <PrivateRoute path={routes.orders} component={OrdersScreen} />
          <PrivateRoute path={routes.profile} component={ProfileScreen} />
          <PrivateRoute path={routes.deliveryPortal} component={DeliveryPortalScreen} />
          <PrivateRoute path={routes.admin} component={AdminScreen} />
          <PrivateRoute path={routes.client} component={ClientRegister} />
          <PrivateRoute path={routes.clientShop} component={ClientRegister} />
          <Route path={routes.register}>
            <RegisterScreen />
          </Route>
          <Redirect to={routes.landing} />
        </Switch>
      </div>
      <ErrorBoundary fallback={null}>
        <CartDrawer />
      </ErrorBoundary>
      {isChat && <ChatApp />}
      {user_data?.user_id && !isChat && !isCartOpen && (
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
