import React, { useState } from "react";
import { Form, Input, Upload, Button, Select, Typography, InputNumber, Image, Row, Col } from "antd";
import { useForm, Controller } from "react-hook-form";
import { UploadOutlined } from "@ant-design/icons";

const ClientRegister = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shopDetails, setShopDetails] = useState({
    shop_name: "",
    address: "",
    area: "",
    mobile_number: "",
    website: "",
    shop_type: "",
    link: "",
  });

  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { ...shopDetails },
  });

  const onImageUpload = async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/upload/image", {
        method: "POST",
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

  const handleInputChange = (event) => {
    setShopDetails({ ...shopDetails, [event.target.name]: event.target.value });
  };

  const onFinish = async (data) => {
    // Implement form submission logic with additional data and validation
    console.log(data);
  };

  return (
    <Row>
      <Col span={24}  style={{ textAlign: "center" }}>
        <Typography.Title level={5}>Client Register</Typography.Title>
      </Col>
      <Col span={24}>
        <Row justify={'center'}>
          <Col span={12}>
            <Form layout="vertical" onSubmit={handleSubmit(onFinish)}>
              <div style={{marginBottom: 10}}>
                {imageUrl && <Image width={200} src={imageUrl} alt="Shop Image" />}
                {!imageUrl && (
                  <Upload beforeUpload={onImageUpload} loading={loading}>
                    <Button icon={<UploadOutlined />}>Upload Image</Button>
                  </Upload>
                )}
              </div>
              <Form.Item label="Shop Name" required>
                <Controller
                  control={control}
                  name="shop_name"
                  rules={{ required: "Shop name is required" }}
                  render={({ field }) => (
                    <Input {...field} value={shopDetails.shop_name} placeholder="Enter shop name" onChange={handleInputChange} />
                  )}
                />
                {errors.shop_name && <Form.Error>{errors.shop_name.message}</Form.Error>}
              </Form.Item>
              <Form.Item label="Address" required>
                <Controller
                  control={control}
                  name="address"
                  rules={{ required: "Address is required" }}
                  render={({ field }) => (
                    <Input {...field} value={shopDetails.address} placeholder="Enter shop address" onChange={handleInputChange} />
                  )}
                />
                {errors.address && <Form.Error>{errors.address.message}</Form.Error>}
              </Form.Item>
              <Form.Item label="Area" required>
                <Controller
                  control={control}
                  name="area"
                  rules={{ required: "Area is required" }}
                  render={({ field }) => (
                    <Input {...field} value={shopDetails.area} placeholder="Enter shop area" onChange={handleInputChange} />
                  )}
                />
                {errors.area && <Form.Error>{errors.area.message}</Form.Error>}
              </Form.Item>
              <Form.Item label="Mobile Number" required>
                <Controller
                  control={control}
                  name="mobile_number"
                  rules={{ required: "Mobile number is required" }}
                  render={({ field }) => (
                    <InputNumber {...field} name="mobile_number" value={shopDetails.mobile_number} style={{ width: '100%' }} placeholder="Enter mobile number" onChange={handleInputChange} />
                  )}
                />
                {errors.mobile_number && <Form.Error>{errors.mobile_number.message}</Form.Error>}
              </Form.Item>
              <Form.Item label="Website">
                <Controller
                  control={control}
                  name="website"
                  render={({ field }) => (
                    <Input {...field} name="website" value={shopDetails.website} placeholder="Enter website URL" onChange={handleInputChange} />
                  )}
                />
              </Form.Item>
              <Form.Item style={{display: 'flex', justifyContent:'center'}}>
                <Button type="primary" title="Submit" onPress={handleSubmit(onFinish)}>
                  Register Shop
                </Button>
              </Form.Item>
            </Form>
          </Col>
        </Row>
      </Col>
    </Row>
  )
}


export default ClientRegister;