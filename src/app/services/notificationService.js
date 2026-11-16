import React from 'react';
import { notification } from 'antd';
import {
  BellOutlined,
  InboxOutlined,
  ShopOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { apiConfig, netWorkCall } from '../utils';

// Older notifications carry emoji in the title; the icon tile replaces them
const stripLeadingEmoji = (text = '') =>
  String(text).replace(/^[\p{Extended_Pictographic}\u200d\ufe0f\s]+/u, '');

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

const SWIPE_DISMISS_PX = 70;

/**
 * Compact notification row: icon tile, title, two-line body and a text action.
 * Swipe left, right or down (touch or mouse) to dismiss it.
 */
function NotifyCard({ notifyKey, tone, Icon, title, body, actionLabel, onAction }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const notice = ref.current?.closest('.ant-notification-notice');
    if (!notice) return undefined;

    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let dragging = false;

    const reset = () => {
      notice.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
      notice.style.transform = '';
      notice.style.opacity = '';
    };

    const onDown = (e) => {
      if (e.target.closest('.rq-notify-action')) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      dy = 0;
      notice.style.transition = 'none';
      notice.setPointerCapture?.(e.pointerId);
    };

    const onMove = (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      dy = Math.max(0, e.clientY - startY); // only downward
      const horizontal = Math.abs(dx) >= dy;
      const dist = horizontal ? Math.abs(dx) : dy;
      notice.style.transform = horizontal ? `translateX(${dx}px)` : `translateY(${dy}px)`;
      notice.style.opacity = String(Math.max(0.2, 1 - dist / 220));
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      const horizontal = Math.abs(dx) >= dy;
      const dist = horizontal ? Math.abs(dx) : dy;
      if (dist > SWIPE_DISMISS_PX) {
        notice.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
        notice.style.transform = horizontal
          ? `translateX(${dx > 0 ? 120 : -120}%)`
          : 'translateY(120%)';
        notice.style.opacity = '0';
        setTimeout(() => notification.destroy(notifyKey), 170);
      } else {
        reset();
      }
    };

    notice.addEventListener('pointerdown', onDown);
    notice.addEventListener('pointermove', onMove);
    notice.addEventListener('pointerup', onUp);
    notice.addEventListener('pointercancel', reset);
    return () => {
      notice.removeEventListener('pointerdown', onDown);
      notice.removeEventListener('pointermove', onMove);
      notice.removeEventListener('pointerup', onUp);
      notice.removeEventListener('pointercancel', reset);
    };
  }, [notifyKey]);

  const h = React.createElement;
  return h(
    'div',
    { ref, className: 'rq-notify-row' },
    h('span', { className: `rq-notify-icon rq-notify-icon--${tone}` }, h(Icon)),
    h(
      'div',
      { className: 'rq-notify-text' },
      h('div', { className: 'rq-notify-title' }, title),
      body ? h('div', { className: 'rq-notify-body' }, body) : null
    ),
    actionLabel
      ? h('button', { type: 'button', className: 'rq-notify-action', onClick: onAction }, actionLabel)
      : null
  );
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
    triggerNativeNotification(stripLeadingEmoji(title), {
      body,
      data,
    });
  }

  // 3. Pick the icon tile (tone + icon) and action for this notification type
  let tone = 'default';
  let IconComp = BellOutlined;
  let actionLabel = 'View';
  let targetUrl = '/';

  if (type === 'account_register') {
    tone = 'lavender';
    IconComp = ShopOutlined;
    actionLabel = data?.url?.includes('client') ? 'Go to store' : 'Explore stores';
    targetUrl = data?.url || '/app';
  } else if (type === 'order_placed') {
    tone = 'lime';
    IconComp = ShoppingOutlined;
    actionLabel = data?.url?.includes('client') ? 'View order' : 'Track order';
    targetUrl = data?.url || '/orders';
  } else if (type === 'order_status_change') {
    tone = 'navy';
    IconComp = InboxOutlined;
    actionLabel = 'Track order';
    targetUrl = data?.url || '/orders';
  } else if (data?.url) {
    targetUrl = data.url;
  }

  // 4. Compact notification card at the bottom; dismissed by timeout, swipe or action
  const key = `rq-notify-${Date.now()}`;
  const isPhone = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;

  notification.open({
    key,
    className: 'rq-notify',
    message: React.createElement(NotifyCard, {
      notifyKey: key,
      tone,
      Icon: IconComp,
      title: stripLeadingEmoji(title),
      body,
      actionLabel: targetUrl ? actionLabel : null,
      onAction: () => {
        notification.destroy(key);
        if (history) {
          history.push(targetUrl);
        } else {
          window.location.href = targetUrl;
        }
      },
    }),
    closeIcon: false,
    placement: isPhone ? 'bottom' : 'bottomRight',
    // Phones: sit just above the bottom navigation
    bottom: isPhone ? 76 : 24,
    duration: 5,
    showProgress: true,
    pauseOnHover: true,
  });
}
