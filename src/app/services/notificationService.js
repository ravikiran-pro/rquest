import React from 'react';
import { notification, Button } from 'antd';
import { apiConfig, netWorkCall } from '../utils';

/**
 * Convert base64 VAPID key string to Uint8Array for PushManager subscribe
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Synthesize a soft modern bell chime using Web Audio API
 * No external mp3 files required; works across all desktop and mobile browsers
 */
export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First tone (C5 - 523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second harmonious tone (E5 - 659.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.08);
    gain2.gain.setValueAtTime(0.25, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.6);
  } catch (e) {
    // Audio autoplay restrictions silently ignored
  }
}

/**
 * Register web push subscription with service worker and backend
 */
export async function subscribeToPushNotifications(userData) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Push notifications not supported in this browser');
    return false;
  }

  try {
    // 1. Fetch public VAPID key
    const vapidRes = await netWorkCall(apiConfig.notifications_vapid_key, 'GET');
    if (!vapidRes?.success || !vapidRes?.publicKey) {
      console.warn('[Push] Failed to retrieve VAPID public key');
      return false;
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidRes.publicKey);

    // 2. Await service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // 3. Post subscription to backend
    const subJSON = subscription.toJSON();
    const userId = userData?.user_id || userData?.id;

    await netWorkCall(
      apiConfig.notifications_subscribe,
      'POST',
      JSON.stringify({
        user_id: userId,
        subscription: subJSON,
      }),
      true
    );

    localStorage.setItem('rquest_push_enabled', 'true');
    console.log('[Push] Successfully subscribed to Push Notifications');
    return true;
  } catch (err) {
    console.warn('[Push] Error subscribing to push notifications:', err.message || err);
    return false;
  }
}

/**
 * Request permission from user and subscribe if granted
 */
export async function requestPushPermission(userData) {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await subscribeToPushNotifications(userData);
    }
    return permission;
  } catch (err) {
    console.warn('[Push] Permission request failed:', err);
    return 'denied';
  }
}

/**
 * Trigger Native Browser Notification popup (OS level)
 */
export function triggerNativeNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          icon: '/images/app-icon.png',
          badge: '/images/app-icon.png',
          vibrate: [200, 100, 200],
          ...options,
        });
      });
    } else {
      new Notification(title, {
        icon: '/images/app-icon.png',
        ...options,
      });
    }
  } catch (e) {
    console.warn('[Push] Native notification error:', e);
  }
}

/**
 * Displays an in-app rich toast notification + native popup + audio chime
 */
export function displayPushNotification(notifData, history = null) {
  if (!notifData) return;

  const { title, body, type, data } = notifData;

  // 1. Play soft audio chime
  playNotificationSound();

  // 2. If browser tab is in background or permission granted, trigger native OS notification
  if (document.hidden || Notification.permission === 'granted') {
    triggerNativeNotification(title, {
      body,
      data,
    });
  }

  // 3. Determine icon and action button based on notification type
  let iconEmoji = '🔔';
  let actionLabel = 'View';
  let targetUrl = '/';

  if (type === 'account_register') {
    iconEmoji = '🎉';
    actionLabel = data?.url?.includes('client') ? 'Go to Store' : 'Explore Stores';
    targetUrl = data?.url || '/app';
  } else if (type === 'order_placed') {
    iconEmoji = '🛍️';
    actionLabel = data?.url?.includes('client') ? 'View New Order' : 'Track Order';
    targetUrl = data?.url || '/orders';
  } else if (type === 'order_status_change') {
    iconEmoji = '📦';
    actionLabel = 'Track Order';
    targetUrl = data?.url || '/orders';
  } else if (data?.url) {
    targetUrl = data.url;
  }

  // 4. Show Ant Design notification banner
  notification.open({
    message: React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      React.createElement('span', { style: { fontSize: 18 } }, iconEmoji),
      React.createElement('span', { style: { fontWeight: 700, color: '#0f172a', fontSize: 14 } }, title)
    ),
    description: React.createElement(
      'div',
      { style: { marginTop: 4 } },
      React.createElement('div', { style: { color: '#334155', fontSize: 13, lineHeight: '18px' } }, body),
      targetUrl
        ? React.createElement(
            'div',
            { style: { marginTop: 10, textAlign: 'right' } },
            React.createElement(
              Button,
              {
                type: 'primary',
                size: 'small',
                onClick: () => {
                  notification.destroy();
                  if (history) {
                    history.push(targetUrl);
                  } else {
                    window.location.href = targetUrl;
                  }
                },
                style: {
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 12,
                  background: '#0f172a',
                  borderColor: '#0f172a',
                },
              },
              `${actionLabel} →`
            )
          )
        : null
    ),
    placement: 'bottomRight',
    duration: 6,
    style: {
      borderRadius: 12,
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
    },
  });
}
