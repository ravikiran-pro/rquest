import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, Flex, Spin, Typography, Tag, Empty } from 'antd';
import {
  HomeOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  CheckCircleFilled,
  AimOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../utils';
import AddressModal from './AddressModal';

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

  const getTagColor = (label) => {
    const l = (label || '').toLowerCase();
    if (l === 'home') return 'blue';
    if (l === 'work' || l === 'office') return 'purple';
    return 'default';
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
    <div style={{ width: '100%' }}>
      {loading ? (
        <Flex justify="center" align="center" style={{ padding: '16px 0' }}>
          <Spin size="small" tip="Loading saved addresses..." />
        </Flex>
      ) : (
        <Flex vertical gap={8}>
          {/* Option: Current GPS Location (if enabled) */}
          {showCurrentLocationOption && (
            <div
              onClick={onSelectCurrentLocation}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: isCurrentLocationSelected
                  ? '2px solid #4f46e5'
                  : '1px solid #e2e8f0',
                background: isCurrentLocationSelected ? '#faf5ff' : '#ffffff',
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
                    borderRadius: 8,
                    background: '#eef2ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4f46e5',
                    fontSize: 16,
                  }}
                >
                  <AimOutlined />
                </div>
                <div>
                  <Text strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>
                    Use Live GPS Location
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Locate current device position automatically
                  </Text>
                </div>
              </Flex>

              {isCurrentLocationSelected && (
                <CheckCircleFilled style={{ color: '#4f46e5', fontSize: 18 }} />
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
                  borderRadius: 10,
                  border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  background: isSelected ? '#faf5ff' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Flex align="center" gap={6} style={{ marginBottom: 3 }}>
                    <Tag
                      color={getTagColor(addr.label)}
                      icon={getTagIcon(addr.label)}
                      style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, margin: 0 }}
                    >
                      {addr.label || 'Saved'}
                    </Tag>
                    {addr.is_default && (
                      <Tag color="green" style={{ borderRadius: 6, fontSize: 10, margin: 0 }}>
                        Default
                      </Tag>
                    )}
                    {addr.recipient_name && (
                      <Text strong style={{ fontSize: 12, color: '#334155' }}>
                        • {addr.recipient_name}
                      </Text>
                    )}
                  </Flex>

                  <div
                    style={{
                      fontSize: 12,
                      color: '#475569',
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
                  <CheckCircleFilled style={{ color: '#4f46e5', fontSize: 18, flexShrink: 0 }} />
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
              borderRadius: 8,
              fontWeight: 600,
              height: 38,
              borderColor: '#cbd5e1',
              color: '#4f46e5',
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

