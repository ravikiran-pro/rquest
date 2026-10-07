import React, { useState } from 'react';
import { Form, Input, Button, Typography, Select, message, Card } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, SafetyOutlined } from '@ant-design/icons';
import { apiConfig, netWorkCall, storageKeys, SOCKET } from '../../app/utils';
import { useHistory, Link } from 'react-router-dom';
import { useGlobalStore } from '../../app/services';
import Routes from '../../app/routes/routes';

const RegisterScreen = () => {
  const history = useHistory();
  const update_user_data = useGlobalStore((state) => state.update_user_data);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    if (values.username && values.mobile && values.password) {
      setLoading(true);
      try {
        let body = JSON.stringify({
          username: values.username,
          password: values.password,
          mobile: values.mobile,
          userRole: values.userRole || 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d',
        });
        const res = await netWorkCall(apiConfig.register, 'POST', body);
        if (res.success === true) {
          sessionStorage.setItem(storageKeys.auth_token, res.token);
          update_user_data(res.user_data);
          SOCKET.emit('connect_user', res.user_data);
          message.success('Registered successfully!');
          if (res.user_data?.role_id === 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9') {
            history.push(Routes.admin);
          } else {
            history.push(Routes.home);
          }
        } else {
          message.error(res.message || 'Registration failed');
        }
      } catch (err) {
        console.error('Registration error:', err);
        message.error('An error occurred during registration');
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
          width: 380,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          borderRadius: 8,
        }}
      >
        <Typography.Title
          level={3}
          style={{ textAlign: 'center', marginBottom: 24 }}
        >
          Create an Account
        </Typography.Title>
        <Form
          onFinish={onFinish}
          layout="vertical"
          initialValues={{
            userRole: 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d',
          }}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
          </Form.Item>
          <Form.Item
            name="mobile"
            label="Mobile Number"
            rules={[{ required: true, message: 'Please enter your mobile number' }]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="Mobile number"
              size="large"
            />
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
          <Form.Item
            name="userRole"
            label="Account Role"
          >
            <Select
              size="large"
              options={[
                { value: 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d', label: 'Customer (User)' },
                { value: 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5', label: 'Shop Owner (Client)' },
                { value: 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9', label: 'Platform Admin' },
              ]}
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
              Register
            </Button>
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <span>Already have an account? </span>
            <Link to={Routes.login} style={{ marginLeft: 6 }}>
              Login Here
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterScreen;
