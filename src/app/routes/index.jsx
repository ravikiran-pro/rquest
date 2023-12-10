import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { default as routes } from './routes';
import { LoginScreen, HomeScreen } from '../../screens';

export default function AppRoutes() {
  return (
    <Router>
      <Switch>
        <Route path={routes.login}>
          <LoginScreen />
        </Route>
        <Route path={routes.home}>
          <HomeScreen />
        </Route>
      </Switch>
    </Router>
  );
}
