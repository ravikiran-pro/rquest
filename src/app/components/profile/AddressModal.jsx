import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Form,
  Input,
  Segmented,
  Button,
  Checkbox,
  AutoComplete,
  Row,
  Col,
  Spin,
  Modal,
  message,
} from 'antd';
import {
  HomeOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  AimOutlined,
  SearchOutlined,
  CheckOutlined,
  CompassOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  netWorkCall,
  apiConfig,
  getPreciseUserLocation,
  getLocationName,
  searchLocations,
  getPlaceDetails,
  createLocationSessionToken,
} from '../../utils';
import LeafletComponent from '../leaflet/leaflet';
import ResponsiveSheet from './ResponsiveSheet';
import './profile-components.css';

const DEFAULT_COORDS = [12.9716, 77.5946];
// Stable fallback so the open-effect does not re-run on every render.
const EMPTY_PROFILE = {};

const LABEL_OPTIONS = [
  { label: <span className="rq-seg-opt"><HomeOutlined /> Home</span>, value: 'Home' },
  { label: <span className="rq-seg-opt"><ShopOutlined /> Work</span>, value: 'Work' },
  { label: <span className="rq-seg-opt"><EnvironmentOutlined /> Other</span>, value: 'Other' },
];

const toCoordPair = (value) => {
  if (Array.isArray(value) && value.length === 2) {
    const lat = Number(value[0]);
    const lon = Number(value[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return [lat, lon];
  }
  return null;
};

const AddressModal = ({
  open,
  visible,
  onClose,
  onSuccess,
  initialData = null,
  initialCoords = null,
  userProfile = EMPTY_PROFILE,
  zIndex,
}) => {
  const isOpen = open !== undefined ? Boolean(open) : Boolean(visible);
  const isEdit = Boolean(initialData?.id);
  const [form] = Form.useForm();

  const [saving, setSaving] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [searchingArea, setSearchingArea] = useState(false);
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchLocalityValue, setSearchLocalityValue] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const localityTimeoutRef = useRef(null);
  const sessionTokenRef = useRef(createLocationSessionToken());
  const [coords, setCoords] = useState(
    () => toCoordPair(initialData && [initialData.latitude, initialData.longitude]) ||
      toCoordPair(initialCoords) ||
      DEFAULT_COORDS
  );

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      const pair = toCoordPair([initialData.latitude, initialData.longitude]);
      if (pair) setCoords(pair);
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
        is_default: Boolean(initialData.is_default),
      });
    } else {
      const pair = toCoordPair(initialCoords);
      if (pair) setCoords(pair);
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
      // Pre-fill from GPS for new addresses
      detectGpsLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visible, initialData, userProfile]);

  const detectGpsLocation = async () => {
    setDetectingGps(true);
    try {
      const loc = await getPreciseUserLocation(true);
      const pair = toCoordPair(loc);
      if (pair) {
        setCoords(pair);
        const name = await getLocationName(pair[0], pair[1]);
        if (name) {
          form.setFieldsValue({
            street_area: form.getFieldValue('street_area') || name,
            formatted_address: name,
          });
          setSearchLocalityValue(name);
          message.success('Current location applied');
        }
      }
    } catch (err) {
      console.warn('GPS detection in address modal:', err);
      message.warning('Could not detect your location. Pick it on the map instead.');
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
        const results = await searchLocations(val, coords?.[0], coords?.[1], sessionTokenRef.current);
        setSearchOptions(
          results.map((r, i) => ({
            value: r.display_name || r.name,
            key: `loc-${r.place_id || `${r.lat}-${r.lon}`}-${i}`,
            label: (
              <div style={{ padding: '4px 0' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1c1c19' }}>{r.name}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#575a65',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.secondary_text || r.display_name}
                </div>
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

  const handleSelectLocality = async (val, option) => {
    if (localityTimeoutRef.current) {
      clearTimeout(localityTimeoutRef.current);
    }
    if (!option?.raw) return;

    let { lat, lon, name, display_name, place_id, address_parts } = option.raw;

    if (toCoordPair([lat, lon]) === null && place_id) {
      setSearchingArea(true);
      try {
        const details = await getPlaceDetails(place_id, sessionTokenRef.current);
        sessionTokenRef.current = createLocationSessionToken();
        if (details) {
          lat = details.lat;
          lon = details.lon;
          name = details.name || name;
          display_name = details.display_name || display_name;
          address_parts = details.address_parts || address_parts;
        }
      } finally {
        setSearchingArea(false);
      }
    }

    const pair = toCoordPair([lat, lon]);
    if (pair) setCoords(pair);

    const fieldUpdates = {
      street_area: name || form.getFieldValue('street_area'),
      formatted_address: display_name,
    };
    if (address_parts?.city) fieldUpdates.city = address_parts.city;
    if (address_parts?.state) fieldUpdates.state = address_parts.state;
    if (address_parts?.pincode) fieldUpdates.pincode = address_parts.pincode;

    form.setFieldsValue(fieldUpdates);
    setSearchLocalityValue(display_name || name || val || '');
    setSearchOptions([]);
  };

  const handleMapConfirm = (newCoords) => {
    const pair = toCoordPair(newCoords);
    if (pair) {
      setCoords(pair);
      getLocationName(pair[0], pair[1]).then((name) => {
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

      const res = isEdit
        ? await netWorkCall(`${apiConfig.user_addresses}/${initialData.id}`, 'PUT', JSON.stringify(payload), true)
        : await netWorkCall(apiConfig.user_addresses, 'POST', JSON.stringify(payload), true);

      if (res?.success) {
        message.success(isEdit ? 'Address updated' : 'Address saved');
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

  const title = (
    <div className="rq-sheet-title">
      <span className="rq-sheet-title-icon">
        <EnvironmentOutlined />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="rq-sheet-title-main">{isEdit ? 'Edit address' : 'Add delivery address'}</div>
        <div className="rq-sheet-title-sub">Used for delivery and finding nearby stores</div>
      </div>
    </div>
  );

  const footer = (
    <div className="rq-sheet-footer">
      <Button onClick={onClose} disabled={saving}>
        Cancel
      </Button>
      <Button type="primary" loading={saving} icon={<CheckOutlined />} onClick={() => form.submit()}>
        {isEdit ? 'Update address' : 'Save address'}
      </Button>
    </div>
  );

  return (
    <>
      <ResponsiveSheet
        open={isOpen}
        onClose={onClose}
        title={title}
        footer={footer}
        width={640}
        zIndex={zIndex}
      >
        <Form
          form={form}
          layout="vertical"
          size="large"
          requiredMark="optional"
          onFinish={handleFinish}
          initialValues={{ label: 'Home', is_default: false }}
        >
          <section className="rq-form-section">
            <div className="rq-form-section-title">Pin your location</div>
            <div className="rq-form-section-hint">Search an area or landmark, or use your current position.</div>

            <AutoComplete
              style={{ width: '100%' }}
              options={searchOptions}
              value={searchLocalityValue}
              onChange={(val) => {
                setSearchLocalityValue(val);
                if (!val) setSearchOptions([]);
              }}
              onSearch={handleSearchLocality}
              onSelect={handleSelectLocality}
            >
              <Input
                allowClear
                placeholder="Search area, locality or landmark"
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                suffix={searchingArea ? <Spin size="small" /> : null}
              />
            </AutoComplete>

            <div className="rq-locate-row">
              <Button
                icon={detectingGps ? null : <AimOutlined />}
                loading={detectingGps}
                onClick={detectGpsLocation}
              >
                Use current location
              </Button>
              <Button icon={<CompassOutlined />} onClick={() => setShowMapPicker(true)}>
                Pick on map
              </Button>
              <span className="rq-coords">
                {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
              </span>
            </div>
          </section>

          <section className="rq-form-section">
            <div className="rq-form-section-title">Address details</div>
            <div className="rq-form-section-hint">Tell the delivery partner exactly where to find you.</div>

            <Form.Item name="label" label="Save as" rules={[{ required: true, message: 'Choose a label' }]}>
              <Segmented block options={LABEL_OPTIONS} />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="recipient_name"
                  label="Recipient name"
                  rules={[{ required: true, message: 'Enter the name of the person receiving the order' }]}
                >
                  <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="e.g. Rahul Sharma" autoComplete="name" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="recipient_phone"
                  label="Contact phone"
                  rules={[
                    { required: true, message: 'Enter a contact phone number' },
                    { pattern: /^[0-9+\s-]{8,15}$/, message: 'Enter a valid phone number' },
                  ]}
                >
                  <Input placeholder="10-digit mobile number" inputMode="tel" autoComplete="tel" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="house_flat_floor"
                  label="Flat, house no., building or floor"
                  rules={[{ required: true, message: 'Enter your flat or house number' }]}
                >
                  <Input placeholder="e.g. Flat 402, 4th Floor, Skyline Residency" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="street_area"
                  label="Street, road or area"
                  rules={[{ required: true, message: 'Enter the street or area' }]}
                >
                  <Input placeholder="e.g. 80 Feet Road, 6th Block, Koramangala" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="landmark" label="Landmark">
                  <Input placeholder="e.g. Opposite Sony Center" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="pincode"
                  label="PIN code"
                  rules={[{ required: true, message: 'Enter the PIN code' }]}
                >
                  <Input placeholder="e.g. 560034" maxLength={8} inputMode="numeric" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="city" label="City" rules={[{ required: true, message: 'Enter the city' }]}>
                  <Input placeholder="City" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="state" label="State" rules={[{ required: true, message: 'Enter the state' }]}>
                  <Input placeholder="State" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item name="formatted_address" label="Full address for receipts">
                  <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Complete delivery address" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="is_default" valuePropName="checked" className="rq-default-check">
              <Checkbox>Make this my default delivery address</Checkbox>
            </Form.Item>
          </section>
        </Form>
      </ResponsiveSheet>

      {showMapPicker && (
        <Modal
          open={showMapPicker}
          onCancel={() => setShowMapPicker(false)}
          footer={null}
          zIndex={zIndex ? zIndex + 100 : 1200}
          width="100vw"
          wrapClassName="full-view-map-modal rq-map-modal"
          closable={false}
          destroyOnHidden
          style={{ top: 0, left: 0, margin: 0, padding: 0, maxWidth: '100vw' }}
          styles={{ body: { height: '100%', padding: 0, margin: 0, overflow: 'hidden' } }}
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
  open: PropTypes.bool,
  visible: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  initialData: PropTypes.object,
  initialCoords: PropTypes.arrayOf(PropTypes.number),
  userProfile: PropTypes.object,
  zIndex: PropTypes.number,
};

export default AddressModal;
