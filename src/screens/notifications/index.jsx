import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button, Empty, Skeleton, Typography, message } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { apiConfig, netWorkCall } from '../../app/utils';
import { chatSocket, useGlobalStore } from '../../app/services';
import { notificationTarget } from '../../app/components/navbar/navConfig';
import { colors } from '../../app/styles/theme';
import './notifications.css';

const { Title, Text } = Typography;

const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Older notifications carry emoji in the title; the icon replaces them.
const stripLeadingEmoji = (text = '') =>
  String(text).replace(/^(?:\p{Extended_Pictographic}|\u200d|\ufe0f|\s)+/u, '');

/**
 * Full notifications list. The mobile bell opens this page; the web bell shows the same
 * data in a popup. Tapping a row marks it read and opens its target.
 */
const NotificationsScreen = () => {
  const history = useHistory();
  const user_id = useGlobalStore((state) => state.user_data?.user_id);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user_id) return;
    setFailed(false);
    try {
      const res = await netWorkCall(apiConfig.notifications_list, 'GET', null, true);
      if (res?.success && Array.isArray(res.data)) {
        setItems(res.data);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [user_id]);

  useEffect(() => {
    load();
    // A push that arrives while the page is open refreshes the list
    const unsub = chatSocket.onPushNotification(() => load());
    return () => unsub();
  }, [load]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    setBusy(true);
    try {
      await netWorkCall(apiConfig.notifications_read_all, 'PUT', null, true);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      message.error('Could not mark notifications as read. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const open = async (item) => {
    if (!item.is_read) {
      // Optimistic: the row un-bolds at once; the server call runs in the background
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
      netWorkCall(`${apiConfig.notifications_list}/${item.id}/read`, 'PUT', null, true).catch(() => {});
    }
    const target = notificationTarget(item);
    if (target) history.push(target);
  };

  return (
    <div className="notif-page">
      <div className="notif-inner">
        <div className="notif-head">
          <div>
            <Title level={3} className="notif-title">
              Notifications
            </Title>
            <Text className="notif-sub">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </Text>
          </div>
          {unreadCount > 0 && (
            <Button icon={<CheckOutlined />} onClick={markAllRead} loading={busy} className="notif-readall">
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : failed && items.length === 0 ? (
          <div className="notif-empty">
            <Empty description="Could not load notifications.">
              <Button onClick={() => { setLoading(true); load(); }}>Try again</Button>
            </Empty>
          </div>
        ) : items.length === 0 ? (
          <div className="notif-empty">
            <Empty image={<BellOutlined style={{ fontSize: 40, color: colors.textLight }} />} description="No notifications yet" />
          </div>
        ) : (
          <ul className="notif-list" aria-label="Notifications">
            {items.map((item) => {
              const tappable = !!notificationTarget(item);
              return (
                <li key={item.id} className={`notif-row${item.is_read ? '' : ' notif-row--unread'}`}>
                  <button
                    type="button"
                    className="notif-row-btn"
                    onClick={() => open(item)}
                    aria-label={`${stripLeadingEmoji(item.title)}. ${item.is_read ? 'Read' : 'Unread'}${tappable ? '. Opens details' : ''}`}
                  >
                    <span className="notif-dot" aria-hidden="true" />
                    <span className="notif-body">
                      <span className="notif-row-title">{stripLeadingEmoji(item.title)}</span>
                      <span className="notif-row-text">{item.body}</span>
                      <span className="notif-row-time">{formatWhen(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

NotificationsScreen.propTypes = {};

export default NotificationsScreen;
