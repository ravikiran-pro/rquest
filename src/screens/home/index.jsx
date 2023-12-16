import React, { useState } from 'react';
import { Input, Button, Typography, Col, Row } from 'antd';
import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { LeafletComponent, ShopCard } from '../../app/components';
import { debounce, netWorkCall } from '../../app/utils/helper';
import { apiConfig, config } from '../../app/utils';

const { Text } = Typography;

const HomeScreen = () => {
  // const { register, handleSubmit, errors } = useForm();
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [markerLocation, setMarkerLocation] = useState([12.9389, 80.2612]); // Default location
  const [searchMarkers, setSearchMarkers] = useState([]);
  const [position, setPosition] = useState(12.9631025, 80.25476);

  const handleSearch = async (value) => {
    if (value !== searchText) {
      setSearchText(value);
    }
  };

  const updateMarker = async (marker) => {
    setMarkerLocation(marker);
  };

  React.useEffect(async () => {
    try {
      if (searchText) {
        let body = JSON.stringify({
          lat: markerLocation[0],
          lon: markerLocation[1],
          search: searchText,
        })

        const response = await netWorkCall(
          apiConfig.shops_search,
          'POST',
          body,
          true
        );

        if (response.data) {
          setSearchMarkers(response.data);
        }
      } else setSearchMarkers([]);
    } catch (error) {
      console.error('Error:', error.message);
    }
  }, [markerLocation, searchText]);

  const handleOpenModal = () => {
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

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
        <Row>
          <Col span={24}>
            <div>
              <Input
                placeholder="Search for products..."
                allowClear
                onChange={(e) => debounce(handleSearch(e.target.value))}
                value={searchText}
                onPressEnter={() => debounce(handleSearch(searchText))}
                suffix={
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => debounce(handleSearch(searchText))}
                  >
                    <SearchOutlined />
                  </Button>
                }
              />
            </div>
            <div>
              <Text
                type="secondary"
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
            </div>
          </Col>
          {searchMarkers && searchMarkers?.length ? (
            <Row style={{ display: 'flex', justifyContent: 'center' }}>
              {searchMarkers?.map((marker) => (
                <div style={{ width: 350, margin: '0px 10px' }} key={marker.id}>
                  <ShopCard
                    shopDetails={marker}
                    isChat={false}
                  />
                </div>
              ))}
            </Row>
          ) : (
            searchText && (
              <Col span={24}>
                <Text>No Match Found</Text>
              </Col>
            )
          )}
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
