import React from 'react';
import AppRoutes from './routes';
import { ConfigProvider, App as AntdApp } from 'antd';

function App() {
  return (
    <ConfigProvider>
      <AntdApp notification={{ placement: 'bottom', bottom: 32 }}>
        <div>
          <AppRoutes />
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
