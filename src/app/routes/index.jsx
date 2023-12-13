import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { default as routes } from './routes';
import {
  LoginScreen,
  HomeScreen,
  ClientRegister,
  RegisterScreen,
} from '../../screens';
import { ChatApp, NavBar } from '../components';

export default function AppRoutes() {
  return (
    <Router>
      <NavBar />
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
          <Route path={routes.chat}>
            <ChatApp />
          </Route>
          <Route path={routes.register}>
            <RegisterScreen />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}
