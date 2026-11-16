import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button, Empty, Spin, Typography } from 'antd';
import { AimOutlined, PlusOutlined, CheckCircleFilled } from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../utils';
import AddressModal from './AddressModal';
import AddressOption from './AddressOption';
import './profile-components.css';

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

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await netWorkCall(apiConfig.user_addresses, 'GET', null, true);
      if (res?.data) setAddresses(res.data);
    } catch (err) {
      console.error('Error fetching addresses in picker:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleModalSuccess = (newAddress) => {
    fetchAddresses();
    if (newAddress) onSelectAddress(newAddress);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '20px 0' }}>
        <Spin size="small" />
        <Text type="secondary">Loading saved addresses...</Text>
      </div>
    );
  }

  return (
    <div className="rq-address-picker" role="radiogroup" aria-label="Delivery address">
      {showCurrentLocationOption && (
        <button
          type="button"
          role="radio"
          aria-checked={isCurrentLocationSelected}
          className={`rq-address-option${isCurrentLocationSelected ? ' is-selected' : ''}`}
          onClick={onSelectCurrentLocation}
        >
          <span className="rq-address-option-icon">
            <AimOutlined />
          </span>
          <span className="rq-address-option-body">
            <span className="rq-address-option-label">Use current location</span>
            <span className="rq-address-option-text">Detect your position automatically</span>
          </span>
          <span className="rq-address-option-check" aria-hidden="true">
            {isCurrentLocationSelected && <CheckCircleFilled />}
          </span>
        </button>
      )}

      {addresses.map((addr) => (
        <AddressOption
          key={addr.id}
          address={addr}
          selected={!isCurrentLocationSelected && selectedAddressId === addr.id}
          onSelect={onSelectAddress}
        />
      ))}

      {addresses.length === 0 && !showCurrentLocationOption && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No saved addresses yet" />
      )}

      <Button type="dashed" icon={<PlusOutlined />} block onClick={() => setModalOpen(true)}>
        Add new delivery address
      </Button>

      {modalOpen && (
        <AddressModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handleModalSuccess} />
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
