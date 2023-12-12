import React from 'react';
import { Card, Rate, Button, Typography } from 'antd';
import {
  EnvironmentOutlined,
  PhoneOutlined,
  GlobalOutlined,
  ShoppingOutlined,
  ShopOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const ShopCard = ({ shopDetails }) => {
  const {
    shop_name,
    address,
    area,
    mobile_number,
    website,
    rating,
    products_list,
    shop_type,
    directions,
    image_url,
    distance,
  } = shopDetails;

  return (
    <Card
      style={{
        width: 300,
        marginBottom: 16,
        borderRadius: 10,
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      }}
      bodyStyle={{
        minHeight: 450,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img
          src={image_url}
          style={{
            width: 80,
            height: 80,
            marginRight: 16,
            borderRadius: '50%',
          }}
        />
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 'bold' }}>
            {shop_name}
          </h3>
          <Text type="secondary" style={{ marginBottom: 8 }}>
            <EnvironmentOutlined /> {area} ({(distance / 1000).toFixed(2)} km)
          </Text>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <Rate
          allowHalf
          disabled
          defaultValue={rating || 0}
          style={{ color: '#FADB14' }}
        />
        <span style={{ fontSize: 14, marginLeft: 8 }}>{rating || 0}</span>
      </div>
      <Text strong style={{ marginBottom: 4, display: 'block' }}>
        <ShopOutlined /> Address:
      </Text>
      <Text
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          WebkitLineClamp: 2,
          textOverflow: 'ellipsis',
          marginBottom: 4,
        }}
      >
        {address}
      </Text>
      <Text strong style={{ marginBottom: 4, display: 'block' }}>
        <ShopOutlined /> Shop Type:
      </Text>
      <Text>{shop_type}</Text>
      <br />
      <Button
        type="primary"
        href={directions}
        target="_blank"
        rel="noopener noreferrer"
        style={{ marginTop: 10 }}
      >
        Get Directions
      </Button>
      <Button
        type="primary"
        href={directions}
        target="_blank"
        rel="noopener noreferrer"
        style={{ marginTop: 10 }}
      >
        Contact
      </Button>
    </Card>
  );
};

export default ShopCard;
