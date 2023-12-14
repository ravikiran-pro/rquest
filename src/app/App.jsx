import React from 'react';
import AppRoutes from './routes';
import { ConfigProvider } from 'antd';

function App() {
  return (
    <ConfigProvider
    // theme={{
    //   token: {
    //     colorPrimary: '#0059b2',
    //     borderRadius: 2,

    //     colorBgContainer: '#f6ffed',
    //   }
    // }}
    >
      <div>
        <AppRoutes />
      </div>
    </ConfigProvider>
  );
}

export default App;
