import React from 'react';
import ReactDOM from 'react-dom';
import './globals.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Automatically register service worker and refresh when a new build is deployed
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      // Check for updates periodically (every 10 minutes)
      setInterval(() => {
        registration.update();
      }, 10 * 60 * 1000);

      // Check for updates when user returns to tab
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });
    }
  },
});

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.querySelector('#root')
);
