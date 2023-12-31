import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { default as routes } from './routes';
import {
  LoginScreen,
  HomeScreen,
  ClientRegister,
  RegisterScreen,
} from '../../screens';
import { ChatApp, NavBar, SideBar, ChatIcon } from '../components';
import { useChatStore, useGlobalStore } from '../../app/services';
import { SOCKET } from '../utils';
import { Avatar } from 'antd';

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

  return (
    <Router>
      <NavBar open={drawer} handleOpen={handleOpen} handleClose={handleClose} />
      <SideBar
        open={drawer}
        handleClose={handleClose}
        handleOpen={handleOpen}
      />
      <div style={{ height: 'calc(100vh - 40px)', overflow: 'auto' }}>
        <Switch>
          <Route path={routes.login}>
            <LoginScreen />
          </Route>
          <Route path={routes.home}>
            <HomeScreen />
          </Route>
          <Route path={routes.client}>
            <ClientRegister />
          </Route>
          {/* <Route path={routes.chat}>
            <ChatApp />
          </Route> */}
          <Route path={routes.register}>
            <RegisterScreen />
          </Route>
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
      ) :
        <div className='chat-footer-icon' onClick={()=>handleChatOpen(null, null)}>
          <Avatar src={ChatIcon}/>
        </div>
      }
    </Router>
  );
}
