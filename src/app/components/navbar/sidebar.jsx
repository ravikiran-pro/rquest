import React from 'react';
import Routes from '../../routes/routes';
import { Button } from 'antd';
import { useGlobalStore } from '../../services';
import { useHistory } from 'react-router-dom';
import { Drawer } from 'antd';
import './index.css';
import { CloseCircleOutlined, CloseOutlined } from '@ant-design/icons';

const SideBar = ({ open, handleClose }) => {
  const history = useHistory();
  const { user_data, update_user_data } = useGlobalStore((state) => state);

  const logout = () => {
    update_user_data({});
    sessionStorage.clear();
    handleClose();
    history.push('/login');
  };

  const handleClick = (route) => {
    history.push(Routes[route]);
    handleClose();
  };

  return (
    <Drawer
      rootClassName="sidebar-root"
      title="Basic open"
      placement="right"
      onClose={handleClose}
      open={open}
    >
      {open && (
        <>
          <button className="close-menu-out" onClick={handleClose}>
            <CloseOutlined />
          </button>
        </>
      )}
      <div style={{ textAlign: 'left', marginTop: 30, marginLeft: 20 }}>
        {user_data?.username && `Welcome ${user_data?.username}`}
      </div>
      <div>
        <div className="sidebar-menu" style={{ marginTop: 30 }}>
          <Button
            type="link"
            color="primary"
            size={'large'}
            className="side-link"
            onClick={() => handleClick('home')}
          >
            Home
          </Button>
        </div>
        {!user_data?.username && (
          <div className="sidebar-menu">
            <Button
              type="link"
              size={'large'}
              className="side-link"
              onClick={() => handleClick('login')}
            >
              Login
            </Button>
          </div>
        )}
        {user_data?.user_id && (
          <React.Fragment>
            <div className="sidebar-menu">
              <Button
                type="link"
                size={'large'}
                className="side-link"
                onClick={() => handleClick('client')}
              >
                Register Shop 
              </Button>
            </div>
            <div className="sidebar-menu">
              <Button
                type="link"
                size={'large'}
                onClick={logout}
                className="side-link"
              >
                Logout
              </Button>
            </div>
          </React.Fragment>
        )}
      </div>
    </Drawer>
  );
};

export default SideBar;
