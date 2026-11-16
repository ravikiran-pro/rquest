import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Button, Typography, Spin, AutoComplete, Input, Grid } from 'antd';
import { AimOutlined, CheckOutlined, EnvironmentOutlined, SearchOutlined, CloseOutlined } from '@ant-design/icons';
import {
  getPreciseUserLocation,
  getLocationName,
  searchLocations,
  getPlaceDetails,
  createLocationSessionToken,
} from '../../utils';
import { colors } from '../../styles';

import 'leaflet/dist/leaflet.css';
import './location-picker.css';
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

const createMarkerIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const RedMarkerIcon = createMarkerIcon('red');
const GreenMarkerIcon = createMarkerIcon('green');
const BlueMarkerIcon = createMarkerIcon('blue');

// Re-measures the map after the modal animates in, recentres on change, and handles clicks
const MapController = ({ onMapClick, center }) => {
  const map = useMap();

  useEffect(() => {
    const timers = [150, 450].map((delay) =>
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch (e) {
          // map not mounted yet
        }
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
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

MapController.propTypes = {
  onMapClick: PropTypes.func.isRequired,
  center: PropTypes.arrayOf(PropTypes.number),
};

const LeafletComponent = (props) => {
  const { searchMarkers = [], updateMarker = () => {}, position, setPosition, markerLocation, onClose } = props;

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const currentCoords = sanitizeCoords(position || markerLocation);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchingLoc, setSearchingLoc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Resolve a readable address whenever the pin moves
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
      const name = await getLocationName(clean[0], clean[1]);
      if (name) {
        setCurrentAddress(name);
        setSearchQuery(name);
      }
    } catch (err) {
      console.error('Locate me failed:', err);
    } finally {
      setDetectingLocation(false);
    }
  };

  const searchTimeoutRef = React.useRef(null);
  const sessionTokenRef = React.useRef(createLocationSessionToken());

  const handleAddressSearch = (val) => {
    setSearchQuery(val);
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
        const results = await searchLocations(val, currentCoords[0], currentCoords[1], sessionTokenRef.current);
        setSearchOptions(
          results.map((r, i) => {
            const hasCoords =
              r.lat !== undefined && r.lon !== undefined && !isNaN(Number(r.lat)) && !isNaN(Number(r.lon));
            return {
              value: r.display_name || r.name,
              key: `loc-${r.place_id || `${r.lat}-${r.lon}`}-${i}`,
              label: (
                <div style={{ padding: '4px 0', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{r.name}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.secondary_text || r.display_name}
                  </div>
                </div>
              ),
              coords: hasCoords ? [parseFloat(r.lat), parseFloat(r.lon)] : null,
              name: r.name,
              display_name: r.display_name,
              raw: r,
            };
          })
        );
      } catch (err) {
        console.error('Error during location search:', err);
      } finally {
        setSearchingLoc(false);
      }
    }, 280);
  };

  const handleAddressSelect = async (value, option) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    let coords =
      option?.coords ||
      (option?.raw &&
      option.raw.lat !== undefined &&
      option.raw.lon !== undefined &&
      !isNaN(Number(option.raw.lat)) &&
      !isNaN(Number(option.raw.lon))
        ? [parseFloat(option.raw.lat), parseFloat(option.raw.lon)]
        : null);

    let resolvedName = option?.name || '';
    let resolvedDisplay = option?.display_name || '';

    if (!coords && option?.raw?.place_id) {
      setSearchingLoc(true);
      try {
        const details = await getPlaceDetails(option.raw.place_id, sessionTokenRef.current);
        sessionTokenRef.current = createLocationSessionToken();
        if (details && !isNaN(Number(details.lat)) && !isNaN(Number(details.lon))) {
          coords = [parseFloat(details.lat), parseFloat(details.lon)];
          resolvedName = details.name || resolvedName;
          resolvedDisplay = details.display_name || resolvedDisplay;
        }
      } finally {
        setSearchingLoc(false);
      }
    }

    if (coords && Array.isArray(coords)) {
      const clean = sanitizeCoords(coords);
      setPosition(clean);
      updateMarker(clean);
      const chosenText = resolvedName || resolvedDisplay || value || '';
      setSearchQuery(chosenText);
      setCurrentAddress(resolvedDisplay || chosenText);
      setSearchOptions([]);
    }
  };

  const pillText = currentAddress || `${currentCoords[0]?.toFixed(4)}, ${currentCoords[1]?.toFixed(4)}`;

  return (
    <div className={`rq-picker${isMobile ? ' rq-picker--mobile' : ''}`}>
      <header className="rq-picker-header">
        <div className="rq-picker-title">
          <span className="rq-picker-title-icon">
            <EnvironmentOutlined />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="rq-picker-title-main">Select location</div>
            <Text type="secondary" className="rq-picker-title-sub">
              Search, tap the map or use GPS
            </Text>
          </div>
        </div>

        <div className="rq-picker-search">
          <AutoComplete
            style={{ width: '100%' }}
            options={searchOptions}
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              if (!val) setSearchOptions([]);
            }}
            onSearch={handleAddressSearch}
            onSelect={handleAddressSelect}
          >
            <Input
              allowClear
              size="large"
              placeholder="Search area or landmark"
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              suffix={searchingLoc ? <Spin size="small" /> : null}
            />
          </AutoComplete>
        </div>

        <div className="rq-picker-locate">
          <Button
            size="large"
            icon={detectingLocation ? null : <AimOutlined />}
            loading={detectingLocation}
            onClick={handleLocateMe}
          >
            {isMobile ? 'GPS' : 'Locate me'}
          </Button>
        </div>

        {onClose && (
          <div className="rq-picker-actions">
            <Button type="primary" size="large" icon={<CheckOutlined />} onClick={onClose}>
              Confirm
            </Button>
            {!isMobile && (
              <Button
                type="text"
                className="rq-picker-close"
                icon={<CloseOutlined style={{ fontSize: 14, color: '#475569' }} />}
                onClick={onClose}
                aria-label="Close map"
              />
            )}
          </div>
        )}
      </header>

      <div className="rq-picker-map">
        <MapContainer center={currentCoords} zoom={14} style={{ height: '100%', width: '100%' }}>
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
              <strong>Selected location</strong>
              <br />
              {pillText}
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

        <div className="rq-picker-pill" aria-live="polite">
          <EnvironmentOutlined style={{ color: colors.primary, flexShrink: 0 }} />
          <span className="rq-picker-pill-text">{pillText}</span>
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
