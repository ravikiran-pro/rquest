import React from 'react';
import { Card, Rate, Button, Typography } from 'antd';
import { EnvironmentOutlined, ShopOutlined } from '@ant-design/icons';
import { useChatStore } from '../../services';

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
    id,
    owner_id,
  } = shopDetails;
  const { handleChatOpen } = useChatStore((state) => state);

  return (
    <Card
      style={{
        width: 300,
        marginBottom: 16,
        borderRadius: 10,
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      }}
      bodyStyle={{
        minHeight: 300,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', textAlign: 'left', width: '100%' }}>
        <div style={{ width: '100%', display: 'flex' }}>
          {image_url && (
            <div style={{ width: 80, height: 40 }}>
              <img
                src={image_url}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                }}
              />
            </div>
          )}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              width: image_url ? '200' : '100%',
              marginLeft: 8,
            }}
          >
            <h5
              style={{
                margin: 0,
                fontSize: 18,
                textAlign: 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {shop_name}
            </h5>
            <div style={{ textAlign: 'left' }}>
              <Text type="secondary" style={{ marginBottom: 8 }}>
                <EnvironmentOutlined /> {area}
              </Text>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center' }}>
          <Rate
            allowHalf
            disabled
            defaultValue={rating || 0}
            style={{ color: '#FADB14' }}
          />
          {/* <span style={{ fontSize: 14, marginLeft: 8 }}>{rating || 0}</span> */}
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
      </div>
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
        onClick={() => handleChatOpen(owner_id, id)}
        target="_blank"
        rel="noopener noreferrer"
        style={{ marginTop: 10 }}
      >
        Chat
      </Button>
    </Card>
  );
};

export default ShopCard;
