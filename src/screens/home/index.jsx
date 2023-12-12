import React, { useState } from 'react';
import { Input, Button, Modal, Typography, Col, Row } from 'antd';
// import { useForm } from 'react-hook-form';
import { SearchOutlined } from '@ant-design/icons';
import { LeafletComponent } from '../../app/components';
import { debounce } from '../../app/utils/helper';
import ShopCard from '../../app/components/shopcards';

const { Text } = Typography;

const HomeScreen = () => {
  // const { register, handleSubmit, errors } = useForm();
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [markerLocation, setMarkerLocation] = useState([12.9389, 80.2612]); // Default location
  const [searchMarkers, setSearchMarkers] = useState([]);

  // React.useEffect(() => {
  //   handleSearch('r')
  // }, [])

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
        const response = await fetch(
          'http://localhost:3001/api/v1/shops/search',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lat: markerLocation[0],
              lon: markerLocation[1],
              search: searchText,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        // Handle the response data as needed
        setSearchMarkers(data.data);
      } else setSearchMarkers([]);
    } catch (error) {
      // Handle errors
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
                style={{ marginRight: '10px' }}
                onPressEnter={() => debounce(handleSearch(searchText))}
                suffix={
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={() => debounce(handleSearch(searchText))}
                  />
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
                  cursor: 'pointer',
                  float: 'right',
                }}
              >
                Current Marker Location
              </Text>
            </div>
          </Col>
          {searchMarkers?.length ? (
            <Row style={{ display: 'flex', justifyContent: 'center' }}>
              {searchMarkers?.map((marker) => (
                <div style={{ width: 300, margin: '0px 10px' }}>
                  <ShopCard shopDetails={marker} />
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
      <Modal
        title="Leaflet Map"
        visible={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
      >
        <div>
          <LeafletComponent
            markerLocation={markerLocation}
            setMarkerLocation={setMarkerLocation}
            updateMarker={updateMarker}
            searchMarkers={searchMarkers}
          />
        </div>
      </Modal>
    </div>
  );
};

export default HomeScreen;
