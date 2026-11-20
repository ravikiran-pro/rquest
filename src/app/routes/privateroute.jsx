import React from 'react';
import PropTypes from 'prop-types';
import { Route, Redirect } from 'react-router-dom';
import { storageKeys, checkUserRole } from '../utils';
import { useGlobalStore } from '../services';
import { ROLE_HOME } from '../components/navbar/navConfig';

const hasToken = () => {
  try {
    return !!sessionStorage.getItem(storageKeys.auth_token);
  } catch {
    return false;
  }
};

/**
 * Signed-in only route. With `roles` (any of 'admin' | 'owner' | 'user', as returned by
 * checkUserRole) it is also role-gated: a signed-in viewer without one of those roles is
 * redirected to their own home (owners -> /client_register, admins -> /admin, others -> /search)
 * before the screen mounts, so a denied screen never renders.
 */
const PrivateRoute = ({ component: Component, roles, remountOnNavigate = true, ...rest }) => {
  // Subscribing keeps the guard live: sign out or a role change re-evaluates it.
  // The persisted store reads sessionStorage synchronously, so this is hydrated on first render.
  const user_data = useGlobalStore((state) => state.user_data);

  return (
    <Route
      {...rest}
      render={(props) => {
        if (!hasToken()) {
          return <Redirect to={{ pathname: '/login', state: { from: props.location } }} />;
        }
        if (roles && roles.length) {
          const { role } = checkUserRole(user_data);
          if (!roles.includes(role)) {
            return <Redirect to={ROLE_HOME[role] || ROLE_HOME.user} />;
          }
        }
        // Screens that only read the query on mount (e.g. /client_register?shop_id=) are remounted
        // per navigation; screens that sync with the URL themselves (admin ?tab=) opt out.
        return <Component key={remountOnNavigate ? props.location.key : undefined} {...props} />;
      }}
    />
  );
};

PrivateRoute.propTypes = {
  component: PropTypes.elementType.isRequired,
  roles: PropTypes.arrayOf(PropTypes.oneOf(['admin', 'owner', 'user'])),
  remountOnNavigate: PropTypes.bool,
  location: PropTypes.object,
};

/** Platform admin console guard. The console keeps its section in ?tab=, so it is not remounted. */
export const AdminRoute = (props) => (
  <PrivateRoute remountOnNavigate={false} {...props} roles={['admin']} />
);

export default PrivateRoute;
