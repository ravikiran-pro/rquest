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
import { colors, radii, shadows, typography } from '../../styles/theme';

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

  const getLabelChipStyle = (label) => {
    const l = (label || '').toLowerCase();
    if (l === 'home') {
      return {
        background: colors.verifiedChipBg,
        color: colors.verifiedChipText,
        border: `1px solid ${colors.verifiedChipBorder}`,
      };
    }
    if (l === 'work' || l === 'office') {
      return {
        background: colors.serviceChipBg,
        color: colors.serviceChipText,
        border: `1px solid ${colors.serviceChipBorder}`,
      };
    }
    return {
      background: colors.surfaceContainerLow,
      color: colors.textMuted,
      border: `1px solid ${colors.border}`,
    };
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
        borderRadius: radii.xl,
        border: isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
        background: isSelected ? colors.primaryLight : colors.surface,
        boxShadow: isSelected
          ? '0 4px 14px rgba(11, 45, 107, 0.08)'
          : shadows.card,
        transition: 'all 0.2s ease',
        cursor: isSelectable ? 'pointer' : 'default',
        position: 'relative',
        fontFamily: typography.fontFamily.body,
      }}
      styles={{ body: { padding: '16px' } }}
    >
      <Flex justify="space-between" align="flex-start" style={{ marginBottom: 10 }} wrap="wrap" gap={8}>
        <Flex align="center" gap={8} wrap="wrap">
          <Tag
            icon={getIcon(address.label)}
            style={{
              ...getLabelChipStyle(address.label),
              borderRadius: radii.xs,
              fontWeight: 700,
              fontSize: 12,
              padding: '2px 8px',
              margin: 0,
              fontFamily: typography.fontFamily.body,
            }}
          >
            {address.label || 'Address'}
          </Tag>

          {address.is_default && (
            <Tag
              icon={<CheckCircleFilled />}
              style={{
                background: colors.semantic.successLight,
                color: colors.semantic.successHover,
                border: `1px solid ${colors.semantic.successBorder}`,
                borderRadius: radii.xs,
                fontWeight: 600,
                fontSize: 11,
                padding: '2px 8px',
                margin: 0,
                fontFamily: typography.fontFamily.body,
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
              icon={<StarOutlined style={{ color: colors.semantic.warningHover }} />}
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault(address);
              }}
              title="Set as Default"
              style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fontFamily.body }}
            >
              Make Default
            </Button>
          )}

          {onEdit && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: colors.primary }} />}
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
              <UserOutlined style={{ color: colors.textMuted, fontSize: 12 }} />
              <Text strong style={{ fontSize: 13, color: colors.textMain, fontFamily: typography.fontFamily.headline }}>
                {address.recipient_name}
              </Text>
            </Flex>
          )}
          {address.recipient_phone && (
            <Flex align="center" gap={4}>
              <PhoneOutlined style={{ color: colors.textMuted, fontSize: 12 }} />
              <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
                {address.recipient_phone}
              </Text>
            </Flex>
          )}
        </Flex>
      )}

      {/* Formatted Address */}
      <div style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.45, marginBottom: 8, fontFamily: typography.fontFamily.body }}>
        {formatted}
      </div>

      {/* Coordinates / Map Pinpoint */}
      {address.latitude && address.longitude && (
        <Flex align="center" gap={4}>
          <EnvironmentOutlined style={{ color: colors.textLight, fontSize: 11 }} />
          <Text style={{ fontSize: 11, color: colors.textLight, fontFamily: typography.fontFamily.mono }}>
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
              borderRadius: radii.md,
              fontWeight: 600,
              fontSize: 12,
              fontFamily: typography.fontFamily.body,
              ...(isSelected
                ? { background: colors.primary, borderColor: colors.primary, boxShadow: shadows.primary }
                : { borderColor: colors.border, color: colors.textMain }),
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

