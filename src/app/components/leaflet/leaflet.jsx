import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { Button, Flex, Typography, Spin, AutoComplete, Input, Grid } from 'antd';
import {
  AimOutlined,
  CheckOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { getPreciseUserLocation, getLocationName, searchLocations } from '../../utils';

import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';

const { Text } = Typography;

const sanitizeCoords = (coords, fallback = [12.9631025, 80.25476]) => {
  if (Array.isArray(coords) && coords.length === 2) {
    const lat = parseFloat(coords[0]);
    const lon = parseFloat(coords[1]);
    if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
      return [lat, lon];
    }
  }
  return fallback;
};

const RedMarkerIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const GreenMarkerIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const BlueMarkerIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to handle map clicks, safe resizing, and safe setView
const MapController = ({ onMapClick, center }) => {
  const map = useMap();

  useEffect(() => {
    // Invalidate size once modal has animated in
    const timer1 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 150);

    const timer2 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [map]);

  useEffect(() => {
    if (center) {
      const cleanCenter = sanitizeCoords(center);
      try {
        const zoom = map.getZoom() || 14;
        map.setView(cleanCenter, Math.max(zoom, 14));
      } catch (err) {
        console.warn('Map centering warning:', err);
      }
    }
  }, [center, map]);

  useMapEvents({
    click(e) {
      if (e.latlng && !isNaN(e.latlng.lat) && !isNaN(e.latlng.lng)) {
        onMapClick([parseFloat(e.latlng.lat), parseFloat(e.latlng.lng)]);
      }
    },
  });

  return null;
};

const LeafletComponent = (props) => {
  const {
    searchMarkers = [],
    updateMarker = () => {},
    position,
    setPosition,
    markerLocation,
    onClose,
  } = props;

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const currentCoords = sanitizeCoords(position || markerLocation);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchingLoc, setSearchingLoc] = useState(false);

  // Resolve address when position changes
  useEffect(() => {
    let cancelled = false;
    const [lat, lon] = currentCoords;
    if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
      getLocationName(lat, lon).then((name) => {
        if (!cancelled && name) setCurrentAddress(name);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [currentCoords[0], currentCoords[1]]);

  const handleMarkerDrag = (e) => {
    if (e.target?._latlng) {
      const lat = parseFloat(e.target._latlng.lat);
      const lon = parseFloat(e.target._latlng.lng);
      if (!isNaN(lat) && !isNaN(lon)) {
        const coords = [lat, lon];
        setPosition(coords);
        updateMarker(coords);
      }
    }
  };

  const handleMapClick = (coords) => {
    const clean = sanitizeCoords(coords);
    setPosition(clean);
    updateMarker(clean);
  };

  const handleLocateMe = async () => {
    setDetectingLocation(true);
    try {
      const coords = await getPreciseUserLocation(true);
      const clean = sanitizeCoords(coords);
      setPosition(clean);
      updateMarker(clean);
    } catch (err) {
      console.error('Locate me failed:', err);
    } finally {
      setDetectingLocation(false);
    }
  };

  const searchTimeoutRef = React.useRef(null);

  const handleAddressSearch = (val) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val || val.trim().length < 2) {
      setSearchOptions([]);
      setSearchingLoc(false);
      return;
    }

    setSearchingLoc(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(val, currentCoords[0], currentCoords[1]);
        setSearchOptions(
          results.map((r, i) => ({
            value: `${r.lat},${r.lon}_${i}`,
            label: (
              <div key={`loc-${i}`} style={{ padding: '4px 0' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{r.name}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#64748b',
                    whiteSpace: 'normal',
                    lineHeight: 1.3,
                    maxHeight: 36,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.display_name}
                </div>
              </div>
            ),
            coords: [parseFloat(r.lat), parseFloat(r.lon)],
            name: r.name,
          }))
        );
      } catch (err) {
        console.error('Error during location search:', err);
      } finally {
        setSearchingLoc(false);
      }
    }, 280);
  };

  const handleAddressSelect = (_value, option) => {
    if (option?.coords && Array.isArray(option.coords)) {
      const clean = sanitizeCoords(option.coords);
      setPosition(clean);
      updateMarker(clean);
      setSearchOptions([]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative' }}>
      {/* Top Modal Header Bar */}
      <div
        style={{
          padding: isMobile ? '10px 14px' : '12px 20px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          zIndex: 10,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {!isMobile ? (
          /* DESKTOP LAYOUT (Single clean horizontal bar, never wraps or breaks) */
          <Flex align="center" justify="space-between" gap={16} wrap="nowrap" style={{ width: '100%' }}>
            {/* Left: Title & Subtitle */}
            <Flex align="center" gap={10} style={{ flexShrink: 0 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
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
                <Text strong style={{ fontSize: 15, display: 'block', color: '#0f172a', lineHeight: 1.2 }}>
                  Select Your Location
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Search locality, click on map, or use GPS
                </Text>
              </div>
            </Flex>

            {/* Center: Search Input */}
            <div style={{ flex: '1 1 260px', maxWidth: 360, margin: '0 8px' }}>
              <AutoComplete
                style={{ width: '100%' }}
                className='address-search'
                options={searchOptions}
                onSearch={handleAddressSearch}
                onSelect={handleAddressSelect}
                placeholder="Search area..."
              >
                <Input
                  allowClear
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  suffix={searchingLoc ? <Spin size="small" /> : null}
                  style={{ borderRadius: 8, height: 38, fontSize: 13 }}
                />
              </AutoComplete>
            </div>

            {/* Right: Actions */}
            <Flex align="center" gap={10} style={{ flexShrink: 0 }} wrap="nowrap">
              <Button
                icon={detectingLocation ? <Spin size="small" /> : <AimOutlined />}
                onClick={handleLocateMe}
                loading={detectingLocation}
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  height: 38,
                  padding: '0 14px',
                  fontSize: 13,
                }}
              >
                Locate Me
              </Button>

              {onClose && (
                <>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={onClose}
                    style={{
                      borderRadius: 8,
                      fontWeight: 700,
                      height: 38,
                      padding: '0 18px',
                      fontSize: 13,
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      border: 'none',
                    }}
                  >
                    Confirm
                  </Button>

                  <Button
                    type="text"
                    icon={<CloseOutlined style={{ fontSize: 15, color: '#475569' }} />}
                    onClick={onClose}
                    style={{
                      width: 38,
                      height: 38,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}
                    aria-label="Close modal"
                  />
                </>
              )}
            </Flex>
          </Flex>
        ) : (
          /* MOBILE LAYOUT (2-Tier solid responsive layout, zero wrapping bugs) */
          <Flex vertical gap={10} style={{ width: '100%' }}>
            {/* Mobile Tier 1: Title & Action Buttons */}
            <Flex align="center" justify="space-between" style={{ width: '100%' }}>
              <Flex align="center" gap={8}>
                <EnvironmentOutlined style={{ color: '#4f46e5', fontSize: 18 }} />
                <div>
                  <Text strong style={{ fontSize: 14, display: 'block', color: '#0f172a', lineHeight: 1.2 }}>
                    Pick Location
                  </Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    Click map, search, or GPS
                  </Text>
                </div>
              </Flex>

              {onClose && (
                <Flex align="center" gap={8}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={onClose}
                    style={{
                      borderRadius: 8,
                      fontWeight: 700,
                      height: 32,
                      padding: '0 12px',
                      fontSize: 12,
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      border: 'none',
                    }}
                  >
                    Confirm
                  </Button>

                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined style={{ fontSize: 14, color: '#475569' }} />}
                    onClick={onClose}
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}
                    aria-label="Close modal"
                  />
                </Flex>
              )}
            </Flex>

            {/* Mobile Tier 2: Search Input + Locate Me Button */}
            <Flex gap={8} align="center" style={{ width: '100%' }}>
              <AutoComplete
                style={{ flex: 1 }}
                className='address-search'
                options={searchOptions}
                onSearch={handleAddressSearch}
                onSelect={handleAddressSelect}
                placeholder="Search area ..."
              >
                <Input
                  allowClear
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  suffix={searchingLoc ? <Spin size="small" /> : null}
                  style={{ borderRadius: 8, height: 34, fontSize: 12 }}
                />
              </AutoComplete>

              <Button
                icon={detectingLocation ? <Spin size="small" /> : <AimOutlined />}
                onClick={handleLocateMe}
                loading={detectingLocation}
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  height: 34,
                  padding: '0 10px',
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                GPS
              </Button>
            </Flex>
          </Flex>
        )}
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 0, overflow: 'hidden' }}>
        <MapContainer
          center={currentCoords}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController onMapClick={handleMapClick} center={currentCoords} />
          <TileLayer
            url="https://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          />
          <Marker
            position={currentCoords}
            draggable={true}
            eventHandlers={{ dragend: handleMarkerDrag }}
            icon={BlueMarkerIcon}
          >
            <Popup>
              <strong>Selected Location</strong>
              <br />
              {currentAddress || `${currentCoords[0]?.toFixed(4)}, ${currentCoords[1]?.toFixed(4)}`}
            </Popup>
          </Marker>

          {searchMarkers?.map((marker, index) => {
            if (!marker.latitude || !marker.longitude) return null;
            const markerCoords = sanitizeCoords([marker.latitude, marker.longitude], null);
            if (!markerCoords) return null;
            return (
              <Marker
                position={markerCoords}
                draggable={false}
                key={`marker-add-${index}`}
                icon={index === 0 ? GreenMarkerIcon : RedMarkerIcon}
              >
                <Popup>
                  <strong>{marker.shop_name}</strong>
                  <br />
                  {marker.address}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Bottom Floating Address Pill */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            padding: '8px 16px',
            borderRadius: 24,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.12)',
            border: '1px solid #e2e8f0',
            maxWidth: '90%',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text strong style={{ color: '#0f172a', fontSize: 13 }}>
            📍 {currentAddress || `${currentCoords[0]?.toFixed(4)}, ${currentCoords[1]?.toFixed(4)}`}
          </Text>
        </div>
      </div>
    </div>
  );
};

LeafletComponent.propTypes = {
  searchMarkers: PropTypes.arrayOf(
    PropTypes.shape({
      latitude: PropTypes.number,
      longitude: PropTypes.number,
      shop_name: PropTypes.string,
      address: PropTypes.string,
    })
  ),
  updateMarker: PropTypes.func,
  position: PropTypes.arrayOf(PropTypes.number),
  setPosition: PropTypes.func,
  markerLocation: PropTypes.arrayOf(PropTypes.number),
  onClose: PropTypes.func,
};

export default LeafletComponent;
