import React from 'react';
import { Card, Rate, Typography } from 'antd';
import { EnvironmentOutlined, ShopOutlined } from '@ant-design/icons';

const { Text } = Typography;

const BussinessCard = ({ shopDetails = {} }) => {
  const { shop_name, address, area, rating, shop_type, image_url } =
    shopDetails;

  return (
    <Card
      style={{
        width: 300,
        marginBottom: 16,
        borderRadius: 10,
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      }}
      bodyStyle={{
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', textAlign: 'left', width: '100%' }}>
        <div style={{ width: '100%' }}>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 'bold',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {shop_name}
            </h3>
          </div>
          <div style={{ textAlign: 'left' }}>
            <Text type="secondary" style={{ marginBottom: 8 }}>
              <EnvironmentOutlined /> {area}
            </Text>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16, textAlign: 'left' }}>
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
          overflow: 'hidden',
          marginBottom: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {address}
      </Text>
      <Text strong style={{ marginBottom: 4, display: 'block' }}>
        <ShopOutlined /> Shop Type:
      </Text>
      <Text>{shop_type}</Text>
    </Card>
  );
};

export default BussinessCard;
