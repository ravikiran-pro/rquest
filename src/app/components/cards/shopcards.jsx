import React from 'react';
import { Card, Rate, Button, Typography, Row, Col, Tooltip, Tag } from 'antd';
import {
  EditOutlined,
  EnvironmentOutlined,
  LockOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useChatStore } from '../../services';
import { distanceConvertor } from '../../utils';
import { Link } from 'react-router-dom/cjs/react-router-dom.min';
import Routes from '../../routes/routes';

const { Text } = Typography;

const ShopCard = ({
  shopDetails,
  isChat = false,
  isChatDisabled = false,
  isEdit = false,
}) => {
  const {
    shop_name,
    address,
    area,
    mobile_number,
    website,
    rating,
    products_list,
    shopSubCategory,
    shop_type,
    directions,
    img_url,
    distance,
    id,
    owner_id,
  } = shopDetails;

  const { handleChatOpen } = useChatStore((state) => state);

  return (
    <Card
      style={{
        width: 320,
        marginBottom: 16,
        borderRadius: 10,
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      }}
      bodyStyle={{
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', textAlign: 'left', width: '100%' }}>
        <div style={{ width: '100%', display: 'flex' }}>
          {img_url && (
            <div style={{ width: 80, height: 40 }}>
              <img
                src={img_url}
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
              width: img_url ? '200' : '100%',
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
              }}
            >
              {shop_name}
            </h5>
            <div style={{ textAlign: 'left' }}>
              <Text type="secondary" style={{ marginBottom: 8 }}>
                <EnvironmentOutlined /> {area}{' '}
                {isChatDisabled ? '' : <>({distanceConvertor(distance)} km)</>}
              </Text>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center' }}>
          <Rate
            allowHalf
            disabled
            defaultValue={rating || 0}
            style={{ color: '#FADB14' }}
          />
          {/* <span style={{ fontSize: 14, marginLeft: 8 }}>{rating || 0}</span> */}
        </div>
        <Text
          type="primary"
          strong
          style={{ marginBottom: 4, display: 'block', marginTop: 10 }}
        >
          <EnvironmentOutlined /> Address:
        </Text>
        <Text
          style={{
            marginBottom: 10,
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
        <Text>{shopSubCategory?.name || shop_type}</Text>
      </div>
      <Row gutter={8} style={{ marginTop: 10 }}>
        <Col span={12}>
          <Button
            type={isChatDisabled ? 'primary' : ''}
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            style={{ width: '100%' }}
          >
            Get Directions
          </Button>
        </Col>
        <Col span={12} style={{ display: isChatDisabled ? 'none' : '' }}>
          <Tooltip
            title={
              !isChat ? (
                <>
                  Continue To{' '}
                  <Link to={Routes.login}>
                    <Button
                      type="link"
                      size={'small'}
                      className="link"
                      style={{ textDecoration: 'underscore !important' }}
                    >
                      Login
                    </Button>
                  </Link>
                </>
              ) : null
            }
            placement="bottomRight"
          >
            <Button
              type="primary"
              onClick={() => handleChatOpen(owner_id, id)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ width: '100%', color: '#fff' }}
              disabled={!isChat}
            >
              Chat{isChat ? '' : <LockOutlined />}
            </Button>
          </Tooltip>
        </Col>
        {isEdit && (
          <Col span={12}>
            <Button
              type={'primary'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ width: '100%' }}
              disabled={true}
            >
              Edit
            </Button>
          </Col>
        )}
      </Row>
    </Card>
  );
};

export default ShopCard;
