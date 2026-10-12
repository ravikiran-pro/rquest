import React from 'react';
import PropTypes from 'prop-types';
import { Card, Tag, Button, Flex, Typography, Popconfirm, Space } from 'antd';
import {
  HomeOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleFilled,
  PhoneOutlined,
  UserOutlined,
  StarOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const AddressCard = ({
  address,
  isSelected = false,
  isSelectable = false,
  onSelect = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onSetDefault = () => {},
}) => {
  const getIcon = (label) => {
    const l = (label || '').toLowerCase();
    if (l === 'home') return <HomeOutlined />;
    if (l === 'work' || l === 'office') return <ShopOutlined />;
    return <EnvironmentOutlined />;
  };

  const formatted =
    address.formatted_address ||
    [
      address.house_flat_floor,
      address.street_area,
      address.landmark ? `Near ${address.landmark}` : null,
      address.city,
      address.pincode,
    ]
      .filter(Boolean)
      .join(', ');

  return (
    <Card
      hoverable={isSelectable}
      onClick={isSelectable ? () => onSelect(address) : undefined}
      style={{
        borderRadius: 14,
        border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
        background: isSelected ? '#faf5ff' : '#ffffff',
        boxShadow: isSelected
          ? '0 4px 16px rgba(79, 70, 229, 0.12)'
          : '0 2px 6px rgba(15, 23, 42, 0.04)',
        transition: 'all 0.2s ease',
        cursor: isSelectable ? 'pointer' : 'default',
        position: 'relative',
      }}
      styles={{ body: { padding: '16px' } }}
    >
      <Flex justify="space-between" align="flex-start" style={{ marginBottom: 10 }}>
        <Flex align="center" gap={8} wrap="wrap">
          <Tag
            color={
              (address.label || '').toLowerCase() === 'home'
                ? 'blue'
                : (address.label || '').toLowerCase() === 'work'
                ? 'purple'
                : 'default'
            }
            icon={getIcon(address.label)}
            style={{
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 12,
              padding: '2px 8px',
            }}
          >
            {address.label || 'Address'}
          </Tag>

          {address.is_default && (
            <Tag
              color="green"
              icon={<CheckCircleFilled />}
              style={{
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 11,
                padding: '2px 8px',
              }}
            >
              Default
            </Tag>
          )}
        </Flex>

        {/* Action Buttons */}
        <Space size={4}>
          {!address.is_default && onSetDefault && (
            <Button
              type="text"
              size="small"
              icon={<StarOutlined style={{ color: '#d97706' }} />}
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault(address);
              }}
              title="Set as Default"
              style={{ fontSize: 12 }}
            >
              Make Default
            </Button>
          )}

          {onEdit && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: '#4f46e5' }} />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(address);
              }}
              title="Edit Address"
            />
          )}

          {onDelete && (
            <Popconfirm
              title="Delete Address"
              description="Are you sure you want to remove this address?"
              onConfirm={(e) => {
                e?.stopPropagation();
                onDelete(address);
              }}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
                title="Delete Address"
              />
            </Popconfirm>
          )}
        </Space>
      </Flex>

      {/* Recipient Details */}
      {(address.recipient_name || address.recipient_phone) && (
        <Flex align="center" gap={12} style={{ marginBottom: 6 }} wrap="wrap">
          {address.recipient_name && (
            <Flex align="center" gap={4}>
              <UserOutlined style={{ color: '#64748b', fontSize: 12 }} />
              <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
                {address.recipient_name}
              </Text>
            </Flex>
          )}
          {address.recipient_phone && (
            <Flex align="center" gap={4}>
              <PhoneOutlined style={{ color: '#64748b', fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {address.recipient_phone}
              </Text>
            </Flex>
          )}
        </Flex>
      )}

      {/* Formatted Address */}
      <div style={{ color: '#334155', fontSize: 13, lineHeight: 1.45, marginBottom: 8 }}>
        {formatted}
      </div>

      {/* Coordinates / Map Pinpoint */}
      {address.latitude && address.longitude && (
        <Flex align="center" gap={4}>
          <EnvironmentOutlined style={{ color: '#94a3b8', fontSize: 11 }} />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Coordinates: {Number(address.latitude).toFixed(4)}, {Number(address.longitude).toFixed(4)}
          </Text>
        </Flex>
      )}

      {/* Select button for picker mode */}
      {isSelectable && (
        <Flex justify="flex-end" style={{ marginTop: 10 }}>
          <Button
            size="small"
            type={isSelected ? 'primary' : 'default'}
            icon={isSelected ? <CheckCircleFilled /> : null}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(address);
            }}
            style={{
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 12,
              ...(isSelected
                ? { background: '#4f46e5', borderColor: '#4f46e5' }
                : {}),
            }}
          >
            {isSelected ? 'Delivering Here' : 'Deliver Here'}
          </Button>
        </Flex>
      )}
    </Card>
  );
};

AddressCard.propTypes = {
  address: PropTypes.object.isRequired,
  isSelected: PropTypes.bool,
  isSelectable: PropTypes.bool,
  onSelect: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onSetDefault: PropTypes.func,
};

export default AddressCard;

