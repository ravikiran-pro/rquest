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
  AdminScreen,
} from '../../screens';
import { ChatApp, NavBar, SideBar, ChatIcon } from '../components';
import { useChatStore, useGlobalStore } from '../../app/services';
import { SOCKET, netWorkCall } from '../utils';
import { Avatar } from 'antd';
import PrivateRoute from './privateroute';

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
    SOCKET.emit('connect_user', user_data);
  }, []);

  useEffect(() => {
    // default service to trigger on change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetch(`https://rquest-cdn.onrender.com/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
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
      <div style={{ height: 'calc(100vh - 60px)', overflow: 'auto' }}>
        <Switch>
          <Route path={routes.login}>
            <LoginScreen />
          </Route>
          <Route path={routes.home}>
            <HomeScreen />
          </Route>
          <PrivateRoute path={routes.client} component={ClientRegister}/>
          <PrivateRoute path={routes.clientShop} component={ClientRegister}/>
          
          <Route path={routes.register}>
            <RegisterScreen />
          </Route>

          <PrivateRoute path={routes.admin} component={AdminScreen}/>
          <Route path={'/'}>
            <Redirect to={routes.home} />
          </Route>
        </Switch>
      </div>
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
