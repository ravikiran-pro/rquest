import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Form,
  Input,
  Radio,
  Button,
  Checkbox,
  AutoComplete,
  Flex,
  Spin,
  Typography,
  message,
  Grid,
} from 'antd';
import {
  HomeOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  AimOutlined,
  SearchOutlined,
  CheckOutlined,
  UserOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig, getPreciseUserLocation, getLocationName, searchLocations } from '../../utils';
import LeafletComponent from '../leaflet/leaflet';

const { Text } = Typography;

const AddressModal = ({
  open,
  onClose,
  onSuccess,
  initialData = null,
  userProfile = {},
}) => {
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [saving, setSaving] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [searchingArea, setSearchingArea] = useState(false);
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchLocalityValue, setSearchLocalityValue] = useState('');
  const localityTimeoutRef = useRef(null);
  const [coords, setCoords] = useState(
    initialData?.latitude && initialData?.longitude
      ? [Number(initialData.latitude), Number(initialData.longitude)]
      : [12.9716, 77.5946]
  );
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setCoords([Number(initialData.latitude), Number(initialData.longitude)]);
        setSearchLocalityValue(initialData.formatted_address || initialData.street_area || '');
        form.setFieldsValue({
          label: initialData.label || 'Home',
          recipient_name: initialData.recipient_name || '',
          recipient_phone: initialData.recipient_phone || '',
          house_flat_floor: initialData.house_flat_floor || '',
          street_area: initialData.street_area || '',
          landmark: initialData.landmark || '',
          city: initialData.city || 'Bengaluru',
          state: initialData.state || 'Karnataka',
          pincode: initialData.pincode || '',
          formatted_address: initialData.formatted_address || '',
          is_default: initialData.is_default || false,
        });
      } else {
        form.resetFields();
        setSearchLocalityValue('');
        form.setFieldsValue({
          label: 'Home',
          recipient_name: userProfile?.username || '',
          recipient_phone: userProfile?.mobile || '',
          city: 'Bengaluru',
          state: 'Karnataka',
          is_default: false,
        });
        // Auto-detect location for new address if not set
        detectGpsLocation();
      }
    }
  }, [open, initialData, userProfile]);

  const detectGpsLocation = async () => {
    setDetectingGps(true);
    try {
      const loc = await getPreciseUserLocation(true);
      if (loc && loc.length === 2) {
        setCoords(loc);
        const name = await getLocationName(loc[0], loc[1]);
        if (name) {
          form.setFieldsValue({
            street_area: form.getFieldValue('street_area') || name,
            formatted_address: name,
          });
          setSearchLocalityValue(name);
          message.success('Detected location applied');
        }
      }
    } catch (err) {
      console.warn('GPS detection in address modal:', err);
    } finally {
      setDetectingGps(false);
    }
  };

  const handleSearchLocality = (val) => {
    setSearchLocalityValue(val);
    if (localityTimeoutRef.current) {
      clearTimeout(localityTimeoutRef.current);
    }
    if (!val || val.trim().length < 2) {
      setSearchOptions([]);
      setSearchingArea(false);
      return;
    }
    setSearchingArea(true);
    localityTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(val, coords?.[0], coords?.[1]);
        setSearchOptions(
          results.map((r, i) => ({
            value: r.display_name || r.name,
            key: `loc-${r.lat}-${r.lon}-${i}`,
            label: (
              <div key={`loc-${i}`} style={{ padding: '4px 0' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{r.display_name}</div>
              </div>
            ),
            raw: r,
          }))
        );
      } catch (err) {
        console.error('Locality search error:', err);
      } finally {
        setSearchingArea(false);
      }
    }, 280);
  };

  const handleSelectLocality = (val, option) => {
    if (localityTimeoutRef.current) {
      clearTimeout(localityTimeoutRef.current);
    }
    if (option?.raw) {
      const { lat, lon, name, display_name } = option.raw;
      const newCoords = [parseFloat(lat), parseFloat(lon)];
      setCoords(newCoords);
      form.setFieldsValue({
        street_area: name || form.getFieldValue('street_area'),
        formatted_address: display_name,
      });
      const chosenText = display_name || name || val || '';
      setSearchLocalityValue(chosenText);
      setSearchOptions([]);
    }
  };

  const handleMapConfirm = (newCoords) => {
    if (newCoords && newCoords.length === 2) {
      setCoords(newCoords);
      getLocationName(newCoords[0], newCoords[1]).then((name) => {
        if (name) {
          form.setFieldsValue({
            street_area: form.getFieldValue('street_area') || name,
            formatted_address: name,
          });
          setSearchLocalityValue(name);
        }
      });
    }
    setShowMapPicker(false);
  };

  const handleFinish = async (values) => {
    setSaving(true);
    try {
      const formatted =
        values.formatted_address ||
        [
          values.house_flat_floor,
          values.street_area,
          values.landmark ? `Near ${values.landmark}` : null,
          values.city,
          values.pincode,
        ]
          .filter(Boolean)
          .join(', ');

      const payload = {
        ...values,
        formatted_address: formatted,
        latitude: coords[0],
        longitude: coords[1],
      };

      let res;
      if (initialData?.id) {
        res = await netWorkCall(
          `${apiConfig.user_addresses}/${initialData.id}`,
          'PUT',
          JSON.stringify(payload),
          true
        );
      } else {
        res = await netWorkCall(
          apiConfig.user_addresses,
          'POST',
          JSON.stringify(payload),
          true
        );
      }

      if (res?.success) {
        message.success(initialData ? 'Address updated!' : 'Address saved successfully!');
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        message.error(res?.message || 'Failed to save address');
      }
    } catch (err) {
      console.error('Save address error:', err);
      message.error('Error saving address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        title={
          <Flex align="center" gap={10}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5',
                fontSize: 18,
              }}
            >
              <EnvironmentOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                {initialData ? 'Edit Address' : 'Add New Address'}
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Provide precise delivery details for seamless order delivery
              </Text>
            </div>
          </Flex>
        }
        width={screens.xs ? '95vw' : 620}
        styles={{
          body: {
            maxHeight: '78vh',
            overflowY: 'auto',
            padding: isMobile ? '14px 4px' : '20px 8px',
          },
        }}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ label: 'Home', is_default: false }}
          style={{ marginTop: 12 }}
        >
          {/* Address Label Capsule */}
          <Form.Item name="label" label="Address Tag / Label" rules={[{ required: true }]}>
            <Radio.Group buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
              <Radio.Button value="Home" style={{ flex: 1, textAlign: 'center' }}>
                <HomeOutlined /> Home
              </Radio.Button>
              <Radio.Button value="Work" style={{ flex: 1, textAlign: 'center' }}>
                <ShopOutlined /> Work / Office
              </Radio.Button>
              <Radio.Button value="Other" style={{ flex: 1, textAlign: 'center' }}>
                <EnvironmentOutlined /> Other
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* Location Pinpoint & Map Assist */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 16,
            }}
          >
            <Flex justify="space-between" align="center" style={{ marginBottom: 8 }} wrap="wrap" gap={8}>
              <div>
                <Text strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>
                  Location Pinpoint (GPS)
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Coordinates: {coords[0].toFixed(4)}, {coords[1].toFixed(4)}
                </Text>
              </div>

              <Flex gap={8}>
                <Button
                  size="small"
                  icon={detectingGps ? <Spin size="small" /> : <AimOutlined />}
                  onClick={detectGpsLocation}
                  loading={detectingGps}
                  style={{ borderRadius: 6, fontWeight: 600, fontSize: 12 }}
                >
                  Locate Me
                </Button>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<EnvironmentOutlined />}
                  onClick={() => setShowMapPicker(true)}
                  style={{ borderRadius: 6, fontWeight: 600, fontSize: 12 }}
                >
                  Pick on Map
                </Button>
              </Flex>
            </Flex>

            {/* Quick Locality Autocomplete Search */}
            <AutoComplete
              style={{ width: '100%' }}
              className='address-search'
              options={searchOptions}
              value={searchLocalityValue}
              onChange={(val) => {
                setSearchLocalityValue(val);
                if (!val) setSearchOptions([]);
              }}
              onSearch={handleSearchLocality}
              onSelect={handleSelectLocality}
              placeholder="Search locality (e.g. Koramangala 4th Block, Indiranagar)..."
            >
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                suffix={searchingArea ? <Spin size="small" /> : null}
                style={{ borderRadius: 8, height: 36, fontSize: 13 }}
              />
            </AutoComplete>
          </div>

          {/* Contact Person Details */}
          <Flex gap={12} wrap={isMobile ? 'wrap' : 'nowrap'}>
            <Form.Item
              name="recipient_name"
              label="Recipient Name"
              rules={[{ required: true, message: 'Please enter contact person name' }]}
              style={{ flex: 1, minWidth: isMobile ? '100%' : 'auto' }}
            >
              <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="e.g. Rahul Sharma" />
            </Form.Item>

            <Form.Item
              name="recipient_phone"
              label="Contact Phone Number"
              rules={[
                { required: true, message: 'Please enter contact phone number' },
                { pattern: /^[0-9+\s-]{8,15}$/, message: 'Please enter a valid phone number' },
              ]}
              style={{ flex: 1, minWidth: isMobile ? '100%' : 'auto' }}
            >
              <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} placeholder="10-digit mobile number" />
            </Form.Item>
          </Flex>

          {/* Address House/Building & Street */}
          <Form.Item
            name="house_flat_floor"
            label="Flat / House No. / Building / Floor"
            rules={[{ required: true, message: 'House or flat number is required' }]}
          >
            <Input placeholder="e.g. Flat 402, 4th Floor, Skyline Residency" />
          </Form.Item>

          <Form.Item
            name="street_area"
            label="Street Name, Road, or Area Colony"
            rules={[{ required: true, message: 'Street or area is required' }]}
          >
            <Input placeholder="e.g. 80 Feet Road, 6th Block, Koramangala" />
          </Form.Item>

          <Flex gap={12} wrap={isMobile ? 'wrap' : 'nowrap'}>
            <Form.Item
              name="landmark"
              label="Nearby Landmark (Optional)"
              style={{ flex: 1, minWidth: isMobile ? '100%' : 'auto' }}
            >
              <Input placeholder="e.g. Opposite Sony Center / Near Metro" />
            </Form.Item>

            <Form.Item
              name="pincode"
              label="PIN Code"
              rules={[{ required: true, message: 'Postal PIN code is required' }]}
              style={{ width: isMobile ? '100%' : 150 }}
            >
              <Input placeholder="e.g. 560034" maxLength={8} />
            </Form.Item>
          </Flex>

          <Flex gap={12} wrap={isMobile ? 'wrap' : 'nowrap'}>
            <Form.Item
              name="city"
              label="City"
              rules={[{ required: true, message: 'City is required' }]}
              style={{ flex: 1, minWidth: isMobile ? '100%' : 'auto' }}
            >
              <Input placeholder="City" />
            </Form.Item>

            <Form.Item
              name="state"
              label="State"
              rules={[{ required: true, message: 'State is required' }]}
              style={{ flex: 1, minWidth: isMobile ? '100%' : 'auto' }}
            >
              <Input placeholder="State" />
            </Form.Item>
          </Flex>

          {/* Complete readable address */}
          <Form.Item name="formatted_address" label="Full Address Summary (Used for delivery receipts)">
            <Input.TextArea rows={2} placeholder="Complete formatted delivery address" />
          </Form.Item>

          {/* Default Switch */}
          <Form.Item name="is_default" valuePropName="checked">
            <Checkbox>Set as default address for future orders & quick search</Checkbox>
          </Form.Item>

          <Flex
            justify="flex-end"
            gap={10}
            style={{ marginTop: 16 }}
            wrap={isMobile ? 'wrap' : 'nowrap'}
          >
            <Button
              onClick={onClose}
              disabled={saving}
              style={{
                borderRadius: 8,
                fontWeight: 600,
                flex: isMobile ? 1 : 'none',
                height: isMobile ? 42 : 'auto',
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              icon={<CheckOutlined />}
              style={{
                background: '#0f172a',
                borderColor: '#0f172a',
                borderRadius: 8,
                fontWeight: 700,
                padding: '0 24px',
                flex: isMobile ? 1 : 'none',
                height: isMobile ? 42 : 'auto',
              }}
            >
              {initialData ? 'Update Address' : 'Save Address'}
            </Button>
          </Flex>
        </Form>
      </Modal>

      {/* Embedded Full View Map Picker Modal */}
      {showMapPicker && (
        <Modal
          open={showMapPicker}
          onCancel={() => setShowMapPicker(false)}
          footer={null}
          width="100vw"
          wrapClassName="full-view-map-modal"
          closable={false}
          style={{ top: 0, left: 0, margin: 0, padding: 0, maxWidth: '100vw', height: '100vh' }}
          styles={{ body: { height: '100vh', padding: 0, margin: 0, overflow: 'hidden' } }}
        >
          <LeafletComponent
            isModalVisible={showMapPicker}
            position={coords}
            setPosition={setCoords}
            markerLocation={coords}
            updateMarker={setCoords}
            onClose={() => handleMapConfirm(coords)}
          />
        </Modal>
      )}
    </>
  );
};

AddressModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  initialData: PropTypes.object,
  userProfile: PropTypes.object,
};

export default AddressModal;

