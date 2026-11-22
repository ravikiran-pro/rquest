import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Modal, Input, List, Avatar, Empty, Tabs } from 'antd';
import {
  ShopOutlined,
  UserOutlined,
  SearchOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { colors } from '../../styles';

const NewChatModal = ({
  visible,
  onClose,
  onStartChat,
  shops = [],
  recentUsers = [],
  userRole = 'customer',
}) => {
  const [search, setSearch] = useState('');

  const filteredShops = useMemo(() => {
    if (!search.trim()) return shops;
    const q = search.toLowerCase();
    return shops.filter((s) => {
      const name = s.shopChats?.shop_name || s.shop_name || '';
      return name.toLowerCase().includes(q);
    });
  }, [shops, search]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return recentUsers;
    const q = search.toLowerCase();
    return recentUsers.filter((u) => {
      const name = u.displayName || u.username || '';
      return name.toLowerCase().includes(q);
    });
  }, [recentUsers, search]);

  const handleSelectShop = (shopItem) => {
    const ownerId = shopItem.shopChats?.owner_id || shopItem.owner_id;
    const shopId = shopItem.shop_id || shopItem.id;
    const shopName = shopItem.shopChats?.shop_name || shopItem.shop_name || 'Store';
    if (ownerId) {
      onStartChat(ownerId, shopId, { username: shopName, shop_name: shopName });
      onClose();
    }
  };

  const handleSelectUser = (userItem) => {
    const userId = userItem.id || userItem.userId;
    const shopId = userItem.shop_id || null;
    const displayName = userItem.displayName || userItem.username || 'User';
    if (userId) {
      onStartChat(userId, shopId, { username: displayName, shop_name: userItem.shop_name });
      onClose();
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageOutlined style={{ color: colors.primary }} />
          <span>Start a New Conversation</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={460}
      destroyOnClose
      centered
      className="rquest-new-chat-modal"
    >
      <div style={{ marginBottom: 14 }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--text-light, #7A7268)' }} />}
          placeholder={
            userRole === 'customer'
              ? 'Search stores to message...'
              : 'Search customers or stores...'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          autoFocus
          style={{
            borderRadius: 8,
            padding: '8px 12px',
          }}
        />
      </div>

      {userRole === 'customer' ? (
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {filteredShops.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No stores found. Browse stores from the home page to start a chat."
            />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={filteredShops}
              renderItem={(shop) => {
                const name = shop.shopChats?.shop_name || shop.shop_name || 'Store';
                return (
                  <List.Item
                    onClick={() => handleSelectShop(shop)}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 12px',
                      borderRadius: 8,
                      transition: 'background 0.15s ease',
                    }}
                    className="rquest-new-chat-item"
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          icon={<ShopOutlined />}
                          style={{
                            backgroundColor: 'var(--primary, #A8451F)',
                            color: '#ffffff',
                          }}
                        />
                      }
                      title={<span style={{ fontWeight: 600 }}>{name}</span>}
                      description="Direct store chat • Instant messaging"
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </div>
      ) : (
        <Tabs
          defaultActiveKey="customers"
          items={[
            {
              key: 'customers',
              label: 'Customers',
              children: (
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {filteredUsers.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No recent customers found"
                    />
                  ) : (
                    <List
                      itemLayout="horizontal"
                      dataSource={filteredUsers}
                      renderItem={(user) => {
                        const name = user.displayName || user.username || 'Customer';
                        return (
                          <List.Item
                            onClick={() => handleSelectUser(user)}
                            style={{
                              cursor: 'pointer',
                              padding: '10px 12px',
                              borderRadius: 8,
                              transition: 'background 0.15s ease',
                            }}
                            className="rquest-new-chat-item"
                          >
                            <List.Item.Meta
                              avatar={
                                <Avatar
                                  icon={<UserOutlined />}
                                  style={{
                                    backgroundColor: 'var(--tertiary, #5B3A29)',
                                    color: '#ffffff',
                                  }}
                                />
                              }
                              title={<span style={{ fontWeight: 600 }}>{name}</span>}
                              description="Message customer directly"
                            />
                          </List.Item>
                        );
                      }}
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'stores',
              label: 'Stores',
              children: (
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {filteredShops.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No other stores found"
                    />
                  ) : (
                    <List
                      itemLayout="horizontal"
                      dataSource={filteredShops}
                      renderItem={(shop) => {
                        const name = shop.shopChats?.shop_name || shop.shop_name || 'Store';
                        return (
                          <List.Item
                            onClick={() => handleSelectShop(shop)}
                            style={{
                              cursor: 'pointer',
                              padding: '10px 12px',
                              borderRadius: 8,
                              transition: 'background 0.15s ease',
                            }}
                            className="rquest-new-chat-item"
                          >
                            <List.Item.Meta
                              avatar={
                                <Avatar
                                  icon={<ShopOutlined />}
                                  style={{
                                    backgroundColor: 'var(--primary, #A8451F)',
                                    color: '#ffffff',
                                  }}
                                />
                              }
                              title={<span style={{ fontWeight: 600 }}>{name}</span>}
                              description="Store owner conversation"
                            />
                          </List.Item>
                        );
                      }}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
};

NewChatModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onStartChat: PropTypes.func.isRequired,
  shops: PropTypes.array,
  recentUsers: PropTypes.array,
  userRole: PropTypes.string,
};

export default NewChatModal;
