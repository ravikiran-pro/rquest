import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Upload,
  Button,
  Typography,
  Row,
  Col,
  Alert,
  Tag,
} from 'antd';
import { useForm, Controller } from 'react-hook-form';
import {
  CloseOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Avatar, Space } from 'antd';
import { apiConfig, config, netWorkCall } from '../../app/utils';
import { LeafletComponent, ShopCard } from '../../app/components';
import Select from 'react-select';
import { useGlobalStore } from '../../app/services';
import { useHistory, useParams } from 'react-router-dom/cjs/react-router-dom.min';

const initDetails = {
  shop_name: '',
  address: '',
  area: '',
  mobile_number: '',
  website: '',
  category_id: '',
  sub_category_id: '',
  link: '',
  map_link: '',
}
const ClientRegister = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allShops, setIsAllShops] = useState([]);
  const [isFormEnable, setIsFormEnable] = useState(false);
  const [shopDetails, setShopDetails] = useState({ ...initDetails });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    category_id: '',
    sub_category_id: '',
  });
  const [allCategories, setAllCategories] = useState([]);
  const [position, setPosition] = useState([12.9631025, 80.25476]);

  const { user_data } = useGlobalStore((state) => state);
  const [alertData, setAlertData] = useState({
    type: '',
    label: '',
  });

  const history = useHistory();

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

  const handleEdit = (shopIndex) => {
    const data = allShops[shopIndex];
    setIsFormEnable(true)
    let category = allCategories[data?.shopCategory?.id];
    setShopDetails({
      ...data,
      map_link: data.directions,
      category_id: { label: category?.name , value: category?.id},
      sub_category_id: { label: data?.shopSubCategory?.name , value: data?.shopSubCategory?.id},
    })
    setImageUrl(data.img_url)
  };

  function isValidData(shopDetails) {
    const requiredKeys = [
      'shop_name',
      'address',
      'area',
      'mobile_number',
      'website',
      'category_id',
      'sub_category_id',
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
        shop_id: shopDetails?.id,
        owner_id: user_data?.user_id,
        shop_name: shopDetails.shop_name,
        address: shopDetails.address,
        area: shopDetails.area,
        img_url: imageUrl,
        mobile_number: shopDetails.mobile_number,
        website: shopDetails.website,
        rating: (Math.random() * (5 - 0) + 0).toFixed(1),
        products_list: [],
        category_id: shopDetails.category_id?.value,
        sub_category_id: shopDetails.sub_category_id?.value,
        directions: shopDetails.map_link,
        latitude: position[0],
        longitude: position[1],
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
        setAlertData({
          message: `${shopDetails.shop_name} created succesfully`,
          type: 'success',
        });
      }
    } else {
      setAlertData({
        message: 'please fill all required fields',
        type: 'error',
      });
    }
  };

  const handleInputChange = (event) => {
    setShopDetails({ ...shopDetails, [event.target.name]: event.target.value });
  };

  const onFinish = async (data) => {
    createClient();
  };

  const onSelect = async (data, key) => {
    setShopDetails({ ...shopDetails, [key]: data });
  };

  const fetchInitData = async () => {
    const response = await netWorkCall(apiConfig.my_shops, 'POST', null, true);
    if (response.success === true && response?.data && response.data.length) {
      setIsAllShops(response.data);
      setIsFormEnable(false);
    } else {
      setIsFormEnable(true);
      setShopDetails({ ...initDetails })
    }
  };

  const handleOpenModal = async () => {
    if (shopDetails?.map_link && position?.length) {
      const response = await netWorkCall(
        apiConfig.decode_link,
        'POST',
        JSON.stringify({
          map_link: shopDetails?.map_link,
        }),
        true
      );
      const { latitude, longitude } = response.data;
      if (latitude && longitude) {
        setPosition([latitude, longitude]);
        setShopDetails({
          ...shopDetails,
          latitude: latitude,
          longitude: longitude,
        });
      }
    }
    setIsModalVisible(true);
  };

  const updateMarker = async (marker) => {
    shopDetails;
    setShopDetails({
      ...shopDetails,
      map_link: `https://www.google.com/maps/@${marker[0]},${marker[1]}`,
    });
    setPosition(marker);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const fetchCategories = async () => {
    const response = await netWorkCall(
      apiConfig.my_categories,
      'GET',
      null,
      true
    );
    setAllCategories(response.data);
  };

  const fetchUserLocation = async () => {
    try {
      // Get user's geolocation using the browser's Geolocation API
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
        });
      });

      setPosition([position.coords.latitude, position.coords.longitude]);
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  useEffect(() => {
    fetchInitData();
    fetchCategories();
    fetchUserLocation();
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
                markerLocation={position}
                setMarkerLocation={setPosition}
                updateMarker={updateMarker}
                searchMarkers={null}
                position={position}
                setPosition={setPosition}
              />
            </div>
          </div>
        </div>
      )}
      {!isFormEnable ? (
        <Col span={24}>
          <div
            style={{
              textAlign: 'right',
              marginBottom: 10,
              marginTop: 15,
              marginRight: 15,
            }}
          >
            <Button
              type="primary"
              onClick={() => {
                setIsFormEnable(true)
                setShopDetails({ ...initDetails })
              }}
              // style={{ color: '#007bff' }}
              // type="link"
              // className='link'
              icon={<PlusOutlined />}
            >
              Add New Business
            </Button>
          </div>
        </Col>
      ) : null}
      {isFormEnable ? (
        <Col span={24} style={{ margin: 20 }}>
          <Row justify={'center'}>
            <Col
              span={8}
              xs={22}
              sm={18}
              md={14}
              lg={12}
              xl={12}
              style={{ background: 'var(--white)', borderRadius: 20 }}
            >
              <Row justify={'center'}>
                <Col span={22}>
                  <Typography.Title level={5}>
                    Register Business
                  </Typography.Title>
                </Col>
                <Col span={22}>
                  <Form layout="vertical">
                    <div style={{ marginBottom: 10, textAlign: 'left' }}>
                      {imageUrl && (
                        // <Image width={200} src={imageUrl} alt="Shop Image" />
                        <Space
                          direction="vertical"
                          style={{ position: 'relative', marginTop: 10 }}
                        >
                          <Space wrap size={16}>
                            {/* <Avatar
                            size={"small"}
                            style={{
                              position: 'absolute',
                              top: -18,
                              right: -18,
                              width: 20,
                              height: 20,
                              fontSize: 12,
                              background: 'red'
                            }}
                            onClick={()=>setImageUrl(null)}
                          ><CloseOutlined /></Avatar> */}
                            <Avatar
                              shape="square"
                              style={{ backgroundColor: '#00a2ae' }}
                              size={80}
                              src={<img src={imageUrl} />}
                            />
                            <Button
                              type="primary"
                              onClick={() => setImageUrl(null)}
                            >
                              Remove <CloseOutlined />
                            </Button>
                          </Space>
                        </Space>
                      )}
                      {!imageUrl && (
                        <>
                          <Upload
                            listType="picture"
                            beforeUpload={onImageUpload}
                            loading={loading}
                          >
                            <Button type="primary" icon={<UploadOutlined />}>
                              Upload Image
                            </Button>
                          </Upload>
                        </>
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
                    <Form.Item label="Category Type" required>
                      <Controller
                        control={control}
                        name="category_id"
                        rules={{ required: 'Category Type is required' }}
                        render={({ field }) => (
                          <Select
                            {...field}
                            value={shopDetails?.category_id}
                            options={allCategories?.map((category, index) => {
                              return {
                                value: index,
                                label: category.name,
                              };
                            })}
                            isSearchable
                            placeholder="select category"
                            onChange={(data) => onSelect(data, 'category_id')}
                          />
                        )}
                      />
                      {errors.category_id && (
                        <Form.Error>{errors.category_id.message}</Form.Error>
                      )}
                    </Form.Item>
                    <Form.Item label="Sub Category Type" required>
                      <Controller
                        control={control}
                        name="sub_category_id"
                        rules={{ required: 'Sub Category Type is required' }}
                        render={({ field }) => (
                          <Select
                            {...field}
                            value={shopDetails?.sub_category_id}
                            options={allCategories[
                              shopDetails?.category_id?.value
                            ]?.sub_categories?.map((category) => {
                              return {
                                value: category.id,
                                label: category.name,
                              };
                            })}
                            isSearchable
                            placeholder="select sub category"
                            onChange={(data) =>
                              onSelect(data, 'sub_category_id')
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
                              <Button onClick={handleOpenModal} type="primary">
                                Pick Location
                              </Button>
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
          </Row>
        </Col>
      ) : null}
      {!isFormEnable && allShops && allShops.length ? (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 20,
              width: '100%',
            }}
          >
            <Row style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
              {allShops?.map((data, shopIndex) => (
                <div style={{ width: 300, margin: '0px 10px' }}>
                  <ShopCard
                    shopDetails={data}
                    isChat={false}
                    isChatDisabled={true}
                    isEdit={true}
                    handleEdit={() => handleEdit(shopIndex)}
                  />
                </div>
              ))}
            </Row>
          </div>
        </>
      ) : null}
      <AlertComponent
        message={alertData?.message}
        type={alertData?.type}
        onReset={() => setAlertData({ type: '', message: '' })}
      />
    </Row>
  );
};

const AlertComponent = ({ message, type, onReset }) => {
  const [status, setStatus] = useState(true);

  useEffect(() => {
    if (message && type) {
      setStatus(true);

      setTimeout(() => {
        setStatus(false);
        onReset();
      }, 2000);
    }
  }, [message || type]);

  return (
    <>
      {status && (
        <div
          style={{
            minWidth: 300,
            position: 'absolute',
            top: '30px',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Alert message={message} type={type} showIcon={message && type} />
        </div>
      )}
    </>
  );
};

export default ClientRegister;
