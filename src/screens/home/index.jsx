import React, { useState } from 'react';
import { Input, Button, Modal, Typography, Col, Row } from 'antd';
import { useForm } from 'react-hook-form';
import { SearchOutlined } from '@ant-design/icons';
import { LeafletComponent } from '../../app/components';

const { Text } = Typography;

const HomeScreen = () => {
  const { register, handleSubmit, errors } = useForm();
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [markerLocation, setMarkerLocation] = useState([12.9389, 80.2612]); // Default location

  const handleSearch = (value) => {
    // Handle search logic here
    console.log('Search Text:', value);
  };

  const handleShowLocation = () => {
    // Implement logic to show current location
    // For simplicity, let's just log a message and update marker location
    console.log('Show current location clicked');
    setMarkerLocation([/* Updated latitude */, /* Updated longitude */]);
  };

  const handleOpenModal = () => {
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Row>
        <Col span={24}>
          <div>
            <Input
              placeholder="Search for products..."
              allowClear
              onChange={(e) => setSearchText(e.target.value)}
              value={searchText}
              style={{ marginRight: '10px' }}
              onPressEnter={() => handleSearch(searchText)}
              suffix={
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={() => handleSearch(searchText)}
                />
              }
            />
          </div>
          <div>
            <Text
              type="secondary"
              underline
              onClick={handleOpenModal}
              style={{ marginRight: '10px', cursor: 'pointer', float:'right' }}
            >
              Current Marker Location
            </Text>
          </div>
        </Col>
        </Row>
      </div>
      <Modal
        title="Leaflet Map"
        visible={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
      >
        <div>
          <LeafletComponent markerLocation={markerLocation} />
        </div>
      </Modal>
    </div >
  );
};

export default HomeScreen;
