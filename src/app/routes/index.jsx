import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { default as routes } from './routes';
import { Loginscreen } from '../../screens';

export default function AppRoutes() {
  return (
    <Router>
      <Switch>
        <Route path={routes.home}>
          <Loginscreen />
        </Route>
      </Switch>
    </Router>
  );
}
