import React from 'react';
import Routes from '../../routes/routes';
import { Link } from 'react-router-dom';
import { storageKeys } from '../../utils';
import { Avatar, Button } from 'antd';
import { useGlobalStore } from '../../services';
import { useHistory } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons';

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
        height: 60,
        backgroundColor: 'var(--primary)',
        color: 'var(--white)',
      }}
    >
      <div
        style={{
          fontSize: 22,
          textAlign: 'center',
          marginLeft: 10,
          fontWeight: 700,
        }}
      >
        <Avatar
          style={{ background: '#fff', marginRight: 4 }}
          src={<img src={'/images/logo.png'} alt="avatar" />}
        />
        Rquest.com
      </div>
      &nbsp;
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          {user_data?.user_id && (
            <div
              className="navbar-menu"
              style={{
                marginRight: 20,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              Hi {user_data?.username}
              <Avatar
                icon={<UserOutlined />}
                style={{ background: 'transparent' }}
              />
            </div>
          )}
          <div className="navbar-menu">
            <Link to={Routes.home}>
              <Button type="link" size={'large'} className="link">
                Home
              </Button>
            </Link>
          </div>
          {sessionStorage?.[storageKeys.auth_token] ? (
            <>
              <div className="navbar-menu">
                <Link to={Routes.client}>
                  <Button type="link" size={'large'} className="link">
                    Client Register
                  </Button>
                </Link>
              </div>
              <div className="navbar-menu">
                <Button
                  type="link"
                  size={'large'}
                  className="link"
                  onClick={() => logout()}
                >
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="navbar-menu">
                <Link to={Routes.login}>
                  <Button type="link" size={'large'} className="link">
                    Login
                  </Button>
                </Link>
              </div>
              {/* <div className='navbar-menu'>
                <Link to={Routes.register}>
                  <Button type="link" size={'large'} className='link'>
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
            className="link"
            onClick={() => {
              open ? handleClose() : handleOpen();
            }}
          >
            <MenuOutlined className="menu" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
