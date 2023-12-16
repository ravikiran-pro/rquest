import React, { useEffect, useState } from 'react';
import { Form, Input, Upload, Button, Typography, Row, Col } from 'antd';
import { AutoComplete } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { CloseOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Avatar, Space } from 'antd';
import { apiConfig, config, netWorkCall } from '../../app/utils';
import { LeafletComponent, ShopCard } from '../../app/components';

const ClientRegister = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allShops, setIsAllShops] = useState([]);
  const [isFormEnable, setIsFormEnable] = useState(false);
  const [shopDetails, setShopDetails] = useState({
    shop_name: '',
    address: '',
    area: '',
    mobile_number: '',
    website: '',
    shop_type: '',
    link: '',
    map_link: '',
    shopOptions_reduce: [],
    shopOptions: [
      { value: 'Provision Store' },
      { value: 'Restaurants' },
      { value: 'Small business' },
      { value: 'Hotels' },
      { value: 'Hardawers and tools' },
      { value: 'Mechanic' },
      { value: 'Others' },
    ],
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [position, setPosition] = useState([12.9631025, 80.25476]);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { ...shopDetails },
  });


  const onImageUpload = async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(config.IMAGE_CDN + '/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setImageUrl(data.url);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  function isValidData(shopDetails) {
    const requiredKeys = [
      'shop_name',
      'address',
      'area',
      'mobile_number',
      'website',
      'shop_type',
      'map_link',
    ];

    const allKeysPresent = requiredKeys.every((key) => {
      return shopDetails[key];
    });

    return allKeysPresent;
  }

  const createClient = async () => {
    if (isValidData(shopDetails)) {
      const payload = {
        owner_id: 'b447f177-bb2f-4b33-881e-30fb140c52ea',
        shop_name: shopDetails.shop_name,
        address: shopDetails.address,
        area: shopDetails.area,
        mobile_number: shopDetails.mobile_number,
        website: shopDetails.website,
        rating: (Math.random() * (5 - 0) + 0).toFixed(1),
        products_list: [],
        shop_type: shopDetails.shop_type,
        directions: shopDetails.map_link,
        latitude: position[0],
        longitude: position[1]
      };
      let body = JSON.stringify(payload);

      const response = await netWorkCall(
        apiConfig.register_shop,
        'POST',
        body,
        true
      );
      if (response.success === true) {
        fetchInitData();
      }
    } else {
      alert('please enter all fields');
    }
  };

  const handleInputChange = (event) => {
    setShopDetails({ ...shopDetails, [event.target.name]: event.target.value });
  };

  const onFinish = async (data) => {
    createClient();
  };

  const onSelect = async (data) => {
    setShopDetails({ ...shopDetails, shop_type: data });
  };

  const onDropdowChange = async (text, keyName) => {
    let filters = shopDetails.shopOptions.filter((item) =>
      item.value.toLowerCase().includes(text.toLowerCase())
    );
    setShopDetails({ ...shopDetails, shop_type: text, [keyName]: filters });
  };

  const fetchInitData = async () => {
    const response = await netWorkCall(apiConfig.my_shops, 'POST', null, true);
    if (response.success === true && response?.data && response.data.length) {
      setIsAllShops(response.data);
      setIsFormEnable(false)
    }
  };

  const handleOpenModal = async () => {
    if (shopDetails?.map_link && position?.length) {
      const response = await netWorkCall(
        apiConfig.decode_link,
        'POST',
        JSON.stringify({
          map_link: shopDetails?.map_link
        }),
        true
      );
      const { latitude, longitude } = response.data;
      if (latitude && longitude) {
        setPosition([latitude, longitude])
        setShopDetails({ ...shopDetails, latitude: latitude, longitude: longitude })
      }
    }
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  useEffect(() => {
    fetchInitData();
  }, []);

  return (
    <Row>
      {isModalVisible && (
        <div className="modal-wrapper">
          <div id="myModal" class="overlay">
            <div class="modal">
              <button onClick={handleCloseModal} className="close-button">
                <CloseOutlined />
              </button>
              <LeafletComponent
                isModalVisible={isModalVisible}
                position={position}
                setPosition={setPosition}
              />
            </div>
          </div>
        </div>
      )}
      {
        !isFormEnable ? <Col span={24}>
          <div style={{ textAlign: 'right', marginBottom: 10 }}>
            <Button
              onClick={() => setIsFormEnable(true)}
              style={{ color: '#007bff' }}
              type="link"
              icon={<PlusOutlined />}
            >
              Add New Business
            </Button>
          </div>
        </Col> : null
      }
      {
        isFormEnable ? <>
          <Col span={24}>
            <Row justify={'center'}>
              <Col span={8} xs={22} sm={18} md={14} lg={12} xl={8}>
                <Col span={8} xs={22} sm={18} md={14} lg={12} xl={8}>
                  <Typography.Title level={5}>Register Business</Typography.Title>
                </Col>
              </Col>
            </Row>
          </Col>
          <Col span={24}>
            <Row justify={'center'}>
              <Col span={8} xs={22} sm={18} md={14} lg={12} xl={8}>
                <Form layout="vertical">
                  <div style={{ marginBottom: 10, textAlign: 'left' }}>
                    {imageUrl && (
                      // <Image width={200} src={imageUrl} alt="Shop Image" />
                      <Space direction="vertical">
                        <Space wrap size={16}>
                          <Avatar
                            shape="square"
                            style={{ backgroundColor: '#00a2ae' }}
                            size={80}
                            src={<img src={imageUrl} />}
                          />
                        </Space>
                      </Space>
                    )}
                    {!imageUrl && (
                      <Upload beforeUpload={onImageUpload} loading={loading}>
                        <Button icon={<UploadOutlined />}>Upload Image</Button>
                      </Upload>
                    )}
                  </div>
                  <Form.Item label="Business Name" required>
                    <Controller
                      control={control}
                      name="shop_name"
                      rules={{ required: 'Business name is required' }}
                      render={({ field }) => (
                        <Input
                          {...field}
                          value={shopDetails.shop_name}
                          name="shop_name"
                          placeholder="Enter Business name"
                          onChange={handleInputChange}
                        />
                      )}
                    />
                    {errors.shop_name && (
                      <Form.Error>{errors.shop_name.message}</Form.Error>
                    )}
                  </Form.Item>
                  <Form.Item label="Industry Type" required>
                    <Controller
                      control={control}
                      name="shop_type"
                      rules={{ required: 'Industry is required' }}
                      render={({ field }) => (
                        <AutoComplete
                          {...field}
                          options={shopDetails.shopOptions_reduce}
                          value={shopDetails.shop_type}
                          placeholder="select Industry"
                          // onChange={onSelect}
                          onSelect={onSelect}
                          onSearch={(text) =>
                            onDropdowChange(text, 'shopOptions_reduce')
                          }
                        />
                      )}
                    />
                    {errors.shop_name && (
                      <Form.Error>{errors.shop_name.message}</Form.Error>
                    )}
                  </Form.Item>
                  <Form.Item label="Address" required>
                    <Controller
                      control={control}
                      name="address"
                      rules={{ required: 'Address is required' }}
                      render={({ field }) => (
                        <Input.TextArea
                          {...field}
                          name="address"
                          value={shopDetails.address}
                          placeholder="Enter address"
                          rows={4}
                          onChange={handleInputChange}
                        />
                      )}
                    />
                    {errors.address && (
                      <Form.Error>{errors.address.message}</Form.Error>
                    )}
                  </Form.Item>
                  <Form.Item label="Area" required>
                    <Controller
                      control={control}
                      name="area"
                      rules={{ required: 'Area is required' }}
                      render={({ field }) => (
                        <Input
                          {...field}
                          name="area"
                          value={shopDetails.area}
                          placeholder="Enter area"
                          onChange={handleInputChange}
                        />
                      )}
                    />
                    {errors.area && (
                      <Form.Error>{errors.area.message}</Form.Error>
                    )}
                  </Form.Item>
                  <Form.Item label="Mobile Number" required>
                    <Controller
                      control={control}
                      name="mobile_number"
                      rules={{ required: 'Mobile number is required' }}
                      render={({ field }) => (
                        <Input
                          {...field}
                          name="mobile_number"
                          value={shopDetails.mobile_number}
                          style={{ width: '100%' }}
                          placeholder="Enter mobile number"
                          onChange={handleInputChange}
                        />
                      )}
                    />
                    {errors.mobile_number && (
                      <Form.Error>{errors.mobile_number.message}</Form.Error>
                    )}
                  </Form.Item>
                  <Form.Item label="Website">
                    <Controller
                      control={control}
                      name="website"
                      render={({ field }) => (
                        <Input
                          {...field}
                          name="website"
                          value={shopDetails.website}
                          placeholder="Enter website URL"
                          onChange={handleInputChange}
                        />
                      )}
                    />
                  </Form.Item>
                  <Form.Item label="Map Link">
                    <Controller
                      control={control}
                      name="map_link"
                      render={({ field }) => (
                        <Input
                          {...field}
                          name="map_link"
                          value={shopDetails.map_link}
                          placeholder="Paste Map Link"
                          onChange={handleInputChange}
                          suffix={
                            <Button onClick={handleOpenModal}>Pick Location</Button>
                          }
                        />
                      )}
                    />
                  </Form.Item>
                  <Form.Item
                    style={{ display: 'flex', justifyContent: 'center' }}
                  >
                    <Button type="primary" title="Submit" onClick={onFinish}>
                      Register
                    </Button>
                    <Button
                      type="primary"
                      style={{ marginLeft: 10 }}
                      onClick={() => setIsFormEnable(false)}
                    >
                      Cancel
                    </Button>
                  </Form.Item>
                </Form>
              </Col>
            </Row>
          </Col>
        </> : null
      }
      {
        !isFormEnable && allShops && allShops.length ? 
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 20,
              width: '100%',
            }}
          >
            <Row style={{ display: 'flex', justifyContent: 'center' }}>
              {allShops?.map((data) => (
                <div style={{ width: 300, margin: '0px 10px' }}>
                  <ShopCard shopDetails={data} isChat={false} />
                </div>
              ))}
            </Row>
          </div>
        </> : null
      }
    </Row>
  );
};

export default ClientRegister;
