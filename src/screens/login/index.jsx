import React from 'react';
import { Form, Input, Button, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useForm } from 'react-hook-form';
import { netWorkCall, storageKeys } from '../../app/utils/helper';
import { useHistory } from 'react-router-dom';
import { useGlobalStore } from '../../app/services';
import { Link } from 'react-router-dom';
import Routes from '../../app/routes/routes';
import { apiConfig } from '../../app/utils';

const LoginScreen = () => {
  const history = useHistory();
  const update_user_data = useGlobalStore((state) => state.update_user_data);

  const { handleSubmit } = useForm();

  const onSubmit = async (e, data) => {
    if (data.mobile && data.password) {
      let body = JSON.stringify({
        mobile: data.mobile,
        password: data.password,
      });
      const res = await netWorkCall(apiConfig.login, 'POST', body);
      if (res.success === true) {
        sessionStorage.setItem(storageKeys.auth_token, res.token);
        update_user_data(res.user_data);
        history.push('/home');
      } else {
        alert(res.message);
      }
      console.log(res);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <Form onFinish={handleSubmit(onSubmit)} style={{ width: 300 }}>
        <Form.Item
          name="mobile"
          rules={[{ required: true, message: 'Please enter your mobile' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Mobile" />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please enter your password' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
          Log in
        </Button>
        <Form.Item style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link to={Routes.register}>Register Here</Link>
        </Form.Item>
      </Form>
    </div>
  );
};

export default LoginScreen;
