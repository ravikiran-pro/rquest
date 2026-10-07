import React, { useEffect, useState } from 'react';
import { Input, Button, Typography, Col, Row } from 'antd';
import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { LeafletComponent, ShopCard } from '../../app/components';
import { debounce, netWorkCall } from '../../app/utils/helper';
import { apiConfig, config } from '../../app/utils';
import { useGlobalStore } from '../../app/services';

const { Text } = Typography;

const HomeScreen = () => {
  // const { register, handleSubmit, errors } = useForm();
  const [searchText, setSearchText] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [markerLocation, setMarkerLocation] = useState([12.9631025, 80.25476]); // Default location
  const [searchMarkers, setSearchMarkers] = useState([]);
  const [position, setPosition] = useState([12.9631025, 80.25476]);
  const { user_data } = useGlobalStore((state) => state);

  const handleSearch = (value) => {
    setSearchText(value);
  };

  const updateMarker = (marker) => {
    setMarkerLocation(marker);
  };

  const handleOpenModal = () => {
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const fetchUserLocation = async () => {
    try {
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setMarkerLocation(coords);
        setPosition(coords);
      }
    } catch (error) {
      console.log('Using default location (geolocation unavailable or denied)');
    }
  };

  useEffect(() => {
    fetchUserLocation();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const fetchShops = async () => {
      const coords =
        markerLocation && markerLocation.length === 2
          ? markerLocation
          : [12.9631025, 80.25476];

      try {
        let body = JSON.stringify({
          lat: coords[0],
          lon: coords[1],
          search: searchText || '',
        });

        const response = await netWorkCall(
          apiConfig.shops_search,
          'POST',
          body,
          false
        );

        if (!isCancelled && response?.data) {
          setSearchMarkers(response.data);
          setSearchError(response.data.length === 0 ? 'No Match Found' : '');
        }
      } catch (error) {
        if (!isCancelled) console.error('Error fetching shops:', error);
      }
    };

    fetchShops();
    return () => {
      isCancelled = true;
    };
  }, [markerLocation, searchText]);

  return (
    <div
      style={{
        display: searchMarkers?.length ? 'block' : 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: 20 }}>
        <Row style={{ flex: 1 }}>
          <Col span={24}>
            <Row style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '360px' }}>
                <Input
                  placeholder="Search for products or shops..."
                  allowClear
                  onChange={(e) => handleSearch(e.target.value)}
                  value={searchText}
                  onPressEnter={() => handleSearch(searchText)}
                  suffix={
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleSearch(searchText)}
                    >
                      <SearchOutlined />
                    </Button>
                  }
                />
                <div>
                  <Text
                    type="primary"
                    underline
                    onClick={handleOpenModal}
                    style={{
                      marginRight: '10px',
                      marginBottom: '10px',
                      cursor: 'pointer',
                      float: 'right',
                      fontSize: 14,
                    }}
                  >
                    Current Location
                  </Text>
                  <Text
                    type="secondary"
                    style={{
                      fontWeight: 500,
                      fontSize: 16,
                      lineHeight: '60px',
                    }}
                  >
                    {searchError}
                  </Text>
                </div>
              </div>
            </Row>
          </Col>
          {searchMarkers && searchMarkers?.length ? (
            <Row style={{ display: 'flex', justifyContent: 'center'}}>
              {searchMarkers?.map((marker) => (
                <div style={{ width: 350, margin: '0px 10px' }} key={marker.id}>
                  <ShopCard
                    shopDetails={marker}
                    isChat={user_data?.user_id ? true : false}
                  />
                </div>
              ))}
            </Row>
          ) : null}
        </Row>
      </div>
      {isModalVisible && (
        <div className="modal-wrapper">
          <div id="myModal" class="overlay">
            <div class="modal">
              <button onClick={handleCloseModal} className="close-button">
                <CloseOutlined />
              </button>
              <LeafletComponent
                isModalVisible={isModalVisible}
                markerLocation={markerLocation}
                setMarkerLocation={setMarkerLocation}
                updateMarker={updateMarker}
                searchMarkers={searchMarkers}
                position={position}
                setPosition={setPosition}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
