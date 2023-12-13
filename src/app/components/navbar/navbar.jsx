import React from 'react';
import Routes from '../../routes/routes';
import { Link } from 'react-router-dom';
import { storageKeys } from '../../utils';
import { Button } from 'antd';
import { useGlobalStore } from '../../services';
import { useHistory } from 'react-router-dom';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

const Navbar = ({ open, handleOpen, handleClose }) => {
  const history = useHistory();
  const { user_data, update_user_data } = useGlobalStore((state) => state);

  const logout = () => {
    update_user_data({});
    sessionStorage.clear();
    history.push('/login');
  };

  return (
    <div
      className="navBar"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 40,
        padding: '0px 40px',
      }}
    >
      {user_data?.username && <div>Welcome Home {user_data?.username}</div>}
      &nbsp;
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div className="navbar-menu">
            <Link to={Routes.home}>
              <Button type="link" size={'large'}>
                Home
              </Button>
            </Link>
          </div>
          {/* <div className='navbar-menu'>
            <Link to={Routes.client}>
              <Button type="link" size={'large'}>
                Client Register
              </Button>
            </Link>
          </div> */}
          {sessionStorage?.[storageKeys.auth_token] ? (
            <div className="navbar-menu">
              <Button type="link" size={'large'} onClick={() => logout()}>
                Logout
              </Button>
            </div>
          ) : (
            <>
              <div className="navbar-menu">
                <Link to={Routes.login}>
                  <Button type="link" size={'large'}>
                    Login
                  </Button>
                </Link>
              </div>
              {/* <div className='navbar-menu'>
                <Link to={Routes.register}>
                  <Button type="link" size={'large'}>
                    Register
                  </Button>
                </Link>
              </div> */}
            </>
          )}
        </div>
        <div className="sidebar-toggler">
          <Button
            type="link"
            size={'large'}
            onClick={() => {
              debugger;
              open ? handleClose() : handleOpen();
            }}
          >
            {open ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
