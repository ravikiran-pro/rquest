import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { netWorkCall, storageKeys } from '../../app/utils/helper';
import { useHistory } from 'react-router-dom';
import { useGlobalStore } from '../../app/services';
import { Link } from 'react-router-dom';
import Routes from '../../app/routes/routes';
import { apiConfig, SOCKET } from '../../app/utils';

const LoginScreen = () => {
  const history = useHistory();
  const update_user_data = useGlobalStore((state) => state.update_user_data);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    if (values.mobile && values.password) {
      setLoading(true);
      try {
        let body = JSON.stringify({
          mobile: values.mobile,
          password: values.password,
        });
        const res = await netWorkCall(apiConfig.login, 'POST', body);
        if (res.success === true) {
          sessionStorage.setItem(storageKeys.auth_token, res.token);
          update_user_data(res.user_data);
          SOCKET.emit('connect_user', res.user_data);
          message.success('Logged in successfully!');
          if (res.user_data?.role_id === 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9') {
            history.push(Routes.admin);
          } else {
            history.push(Routes.home);
          }
        } else {
          message.error(res.message || 'Login failed. Please check credentials.');
        }
      } catch (err) {
        console.error('Login error:', err);
        message.error('An error occurred during login. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 60px)',
        background: '#f0f2f5',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: 360,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          borderRadius: 8,
        }}
      >
        <Typography.Title
          level={3}
          style={{ textAlign: 'center', marginBottom: 24 }}
        >
          Login
        </Typography.Title>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item
            name="mobile"
            label="Mobile Number"
            rules={[{ required: true, message: 'Please enter your mobile number' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Mobile number" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>
          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              style={{ width: '100%' }}
            >
              Log in
            </Button>
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <span>Don't have an account? </span>
            <Link to={Routes.register} style={{ marginLeft: 6 }}>
              Register Here
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default LoginScreen;
