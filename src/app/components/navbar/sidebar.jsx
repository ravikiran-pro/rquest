import React from 'react';
import Routes from '../../routes/routes';
import { Link } from 'react-router-dom';
import { storageKeys } from '../../utils';
import { Button } from 'antd';
import { useGlobalStore } from '../../services';
import { useHistory } from 'react-router-dom';
import { Drawer } from 'antd';
import './index.css';
import { Avatar } from 'antd';
import { CloseCircleOutlined, CloseOutlined } from '@ant-design/icons';

const SideBar = ({ open, handleClose }) => {
  const history = useHistory();
  const { user_data, update_user_data } = useGlobalStore((state) => state);

  const logout = () => {
    update_user_data({});
    sessionStorage.clear();
    history.push('/login');
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
        <div
          className="close-menu"
          onClick={handleClose}
          style={{ fontSize: 24, cursor: 'pointer' }}
        >
          <CloseCircleOutlined />
        </div>
      )}
      <div>
        <div className="sidebar-menu">
          <Link to={Routes.home}>
            <Button type="link" size={'large'}>
              Home
            </Button>
          </Link>
        </div>
        <div className="sidebar-menu">
          <Link to={Routes.login}>
            <Button type="link" size={'large'}>
              Login
            </Button>
          </Link>
        </div>
        <div className="sidebar-menu">
          <Link to={Routes.client}>
            <Button type="link" size={'large'}>
              Client Register
            </Button>
          </Link>
        </div>
      </div>
    </Drawer>
  );
};

export default SideBar;
