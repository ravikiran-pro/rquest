import React from 'react';
import { Form, Input, Button, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useForm } from 'react-hook-form';
import { netWorkCall, storageKeys } from '../../app/utils/helper';
import { useHistory } from 'react-router-dom';
import { useGlobalStore } from '../../app/zustand';


const RegisterScreen = () => {
  const history = useHistory();
  const update_user_data = useGlobalStore((state) => state.update_user_data)

  const { handleSubmit, register } = useForm();

  const onSubmit = async (e, data) => {
    if (data.username && data.password) {
      let body = JSON.stringify({
        username: data.username,
        password: data.password,
        mobile: data.mobile
      });
      const res = await netWorkCall('user/register', 'POST', body)
      if(res.success === true){
        sessionStorage.setItem(storageKeys.auth_token, res.token)
        update_user_data(res.user_data)
        history.push('/home');
      }else{
        alert(res.message)
      }
      console.log(res)
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
        <Typography.Title level={5} style={{ textAlign: 'left', marginBottom: 20 }}>
          Register User:
        </Typography.Title>
        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Please enter your username' }]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Username"
            {...register('username')}
          />
        </Form.Item>
        <Form.Item
          name="mobile"
          rules={[{ required: true, message: 'Please enter your username' }]}
        >
          <Input
            type='mobile'
            prefix={<UserOutlined />}
            placeholder="Mobile"
            {...register('mobile')}
          />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please enter your password' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Password"
            {...register('password')}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
            Register
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default RegisterScreen;
