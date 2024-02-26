import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { storageKeys } from '../utils';

const PrivateRoute = ({ component: Component, ...rest }) => {
  const isAuthenticated = sessionStorage?.[storageKeys.auth_token];

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? (
          <Component key={props.location.key} {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

export default PrivateRoute;