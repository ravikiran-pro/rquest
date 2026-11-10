import React from 'react';
import AppRoutes from './routes';
import { ConfigProvider, App as AntdApp } from 'antd';
import { antdTheme } from './styles';

function App() {
  return (
    <ConfigProvider theme={antdTheme}>
      <AntdApp notification={{ placement: 'bottom', bottom: 32 }}>
        <div>
          <AppRoutes />
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
