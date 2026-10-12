import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
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
} from '../../screens';
import { ChatApp, NavBar, SideBar, ChatIcon, CartDrawer } from '../components';
import { useChatStore, useGlobalStore } from '../../app/services';
import { Avatar, message, notification } from 'antd';
import PrivateRoute from './privateroute';
import { SOCKET } from '../utils';

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

export default function AppRoutes() {
  const [drawer, setdrawer] = useState(false);
  const { isChat, handleChatOpen } = useChatStore((state) => state);
  const { user_data } = useGlobalStore((state) => state);

  const handleClose = () => {
    setdrawer(false);
  };

  const handleOpen = () => {
    setdrawer(true);
  };

  useEffect(() => {
    if (user_data?.user_id) {
      SOCKET.emit('connect_user', user_data);
    }
  }, [user_data]);

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
      <NavBar open={drawer} handleOpen={handleOpen} handleClose={handleClose} />
      <SideBar
        open={drawer}
        handleClose={handleClose}
        handleOpen={handleOpen}
      />
      <div style={{ minHeight: 'calc(100vh - 64px)', overflowX: 'hidden' }}>
        <Switch>
          <Route exact path="/">
            <Redirect to={routes.home} />
          </Route>
          <Route path={routes.login}>
            <LoginScreen />
          </Route>
          <Route path={routes.home}>
            <HomeScreen />
          </Route>
          <Route path={routes.storefront}>
            <StorefrontScreen />
          </Route>
          <PrivateRoute path={routes.orders} component={OrdersScreen} />
          <PrivateRoute path={routes.profile} component={ProfileScreen} />
          <PrivateRoute path={routes.client} component={ClientRegister} />
          <PrivateRoute path={routes.clientShop} component={ClientRegister} />
          <Route path={routes.register}>
            <RegisterScreen />
          </Route>
          <Redirect to={routes.home} />
        </Switch>
      </div>
      <CartDrawer />
      {isChat ? (
        <div className="chat-wrapper">
          <div id="myChat" class="overlay">
            <div class="chat">
              <ChatApp />
            </div>
          </div>
        </div>
      ) : (
        user_data.user_id && (
          <div
            className="chat-footer-icon"
            onClick={() => handleChatOpen(null, null)}
          >
            <Avatar src={ChatIcon} />
          </div>
        )
      )}
    </Router>
  );
}
