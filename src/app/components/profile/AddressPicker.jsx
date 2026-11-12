import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, Flex, Spin, Typography, Tag, Empty } from 'antd';
import {
  HomeOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  CheckCircleFilled,
  AimOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../utils';
import AddressModal from './AddressModal';
import { colors, radii, typography } from '../../styles/theme';

const { Text } = Typography;

const AddressPicker = ({
  selectedAddressId = null,
  onSelectAddress = () => {},
  showCurrentLocationOption = true,
  isCurrentLocationSelected = false,
  onSelectCurrentLocation = () => {},
}) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const res = await netWorkCall(apiConfig.user_addresses, 'GET', null, true);
      if (res?.data) {
        setAddresses(res.data);
      }
    } catch (err) {
      console.error('Error fetching addresses in picker:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const getTagStyle = (label) => {
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

  const getTagIcon = (label) => {
    const l = (label || '').toLowerCase();
    if (l === 'home') return <HomeOutlined />;
    if (l === 'work' || l === 'office') return <ShopOutlined />;
    return <EnvironmentOutlined />;
  };

  const handleModalSuccess = (newAddress) => {
    fetchAddresses();
    if (newAddress) {
      onSelectAddress(newAddress);
    }
  };

  return (
    <div style={{ width: '100%', fontFamily: typography.fontFamily.body }}>
      {loading ? (
        <Flex justify="center" align="center" gap={8} style={{ padding: '16px 0' }}>
          <Spin size="small" />
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Loading saved addresses...</Text>
        </Flex>
      ) : (
        <Flex vertical gap={8}>
          {/* Option: Current GPS Location (if enabled) */}
          {showCurrentLocationOption && (
            <div
              onClick={onSelectCurrentLocation}
              style={{
                padding: '10px 14px',
                borderRadius: radii.md,
                border: isCurrentLocationSelected
                  ? `2px solid ${colors.primary}`
                  : `1px solid ${colors.border}`,
                background: isCurrentLocationSelected ? colors.primaryLight : colors.surface,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <Flex align="center" gap={10}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: radii.sm,
                    background: colors.primaryLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.primary,
                    fontSize: 16,
                  }}
                >
                  <AimOutlined />
                </div>
                <div>
                  <Text strong style={{ fontSize: 13, color: colors.textMain, display: 'block', fontFamily: typography.fontFamily.headline }}>
                    Use Live GPS Location
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fontFamily.body }}>
                    Locate current device position automatically
                  </Text>
                </div>
              </Flex>

              {isCurrentLocationSelected && (
                <CheckCircleFilled style={{ color: colors.primary, fontSize: 18 }} />
              )}
            </div>
          )}

          {/* Saved Addresses List */}
          {addresses.map((addr) => {
            const isSelected = !isCurrentLocationSelected && selectedAddressId === addr.id;
            const fullAddress =
              addr.formatted_address ||
              [addr.house_flat_floor, addr.street_area, addr.landmark, addr.city, addr.pincode]
                .filter(Boolean)
                .join(', ');

            return (
              <div
                key={addr.id}
                onClick={() => onSelectAddress(addr)}
                style={{
                  padding: '10px 14px',
                  borderRadius: radii.md,
                  border: isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                  background: isSelected ? colors.primaryLight : colors.surface,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Flex align="center" gap={6} style={{ marginBottom: 3 }} wrap="wrap">
                    <Tag
                      icon={getTagIcon(addr.label)}
                      style={{
                        ...getTagStyle(addr.label),
                        borderRadius: radii.xs,
                        fontWeight: 700,
                        fontSize: 11,
                        margin: 0,
                        fontFamily: typography.fontFamily.body,
                      }}
                    >
                      {addr.label || 'Saved'}
                    </Tag>
                    {addr.is_default && (
                      <Tag
                        style={{
                          background: colors.semantic.successLight,
                          color: colors.semantic.successHover,
                          border: `1px solid ${colors.semantic.successBorder}`,
                          borderRadius: radii.xs,
                          fontSize: 10,
                          fontWeight: 600,
                          margin: 0,
                          fontFamily: typography.fontFamily.body,
                        }}
                      >
                        Default
                      </Tag>
                    )}
                    {addr.recipient_name && (
                      <Text strong style={{ fontSize: 12, color: colors.textMain, fontFamily: typography.fontFamily.body }}>
                        • {addr.recipient_name}
                      </Text>
                    )}
                  </Flex>

                  <div
                    style={{
                      fontSize: 12,
                      color: colors.textMuted,
                      fontFamily: typography.fontFamily.body,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={fullAddress}
                  >
                    {fullAddress}
                  </div>
                </div>

                {isSelected && (
                  <CheckCircleFilled style={{ color: colors.primary, fontSize: 18, flexShrink: 0 }} />
                )}
              </div>
            );
          })}

          {addresses.length === 0 && !showCurrentLocationOption && (
            <Empty
              description="No saved addresses yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ margin: '12px 0' }}
            />
          )}

          {/* Add New Address Button */}
          <Button
            type="dashed"
            onClick={() => setModalOpen(true)}
            block
            style={{
              borderRadius: radii.md,
              fontWeight: 600,
              height: 38,
              borderColor: colors.borderDark,
              color: colors.primary,
              fontFamily: typography.fontFamily.body,
            }}
          >
            + Add New Delivery Address
          </Button>
        </Flex>
      )}

      {modalOpen && (
        <AddressModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

AddressPicker.propTypes = {
  selectedAddressId: PropTypes.string,
  onSelectAddress: PropTypes.func,
  showCurrentLocationOption: PropTypes.bool,
  isCurrentLocationSelected: PropTypes.bool,
  onSelectCurrentLocation: PropTypes.func,
};

export default AddressPicker;

