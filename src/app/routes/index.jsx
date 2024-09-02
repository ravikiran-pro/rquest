import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Switch,
} from 'react-router-dom';
import LOADINGSCREEN from './loading';
import XssScreen from './xss';


export default function AppRoutes() {



  return (
    <Router>
      <div style={{ height: 'calc(100vh - 60px)', overflow: 'auto' }}>
        <Switch>
          {/* <Route path={'/'}>
            <Redirect to={routes.home} />
          </Route> */}
          <Route path={'/loading'}>
            <LOADINGSCREEN />
          </Route>
          <Route path={'/xss'}>
            <XssScreen />
          </Route>
        </Switch>
      </div>

    </Router>
  );
}
