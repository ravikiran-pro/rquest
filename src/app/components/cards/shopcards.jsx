import React from 'react';
import { Card, Button, Typography, Tag, Tooltip, Flex, Grid } from 'antd';
import {
  EditOutlined,
  EnvironmentOutlined,
  MessageOutlined,
  ArrowRightOutlined,
  CompassOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useChatStore, useGlobalStore } from '../../services';
import { distanceConvertor } from '../../utils';
import { useHistory } from 'react-router-dom';

const { Text, Title, Paragraph } = Typography;

const ShopCard = ({
  shopDetails,
  isChat = false,
  isChatDisabled = false,
  isEdit = false,
  handleEdit = () => null,
}) => {
  const history = useHistory();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const {
    shop_name,
    address,
    area,
    rating,
    shopSubCategory,
    shopCategory,
    shop_type,
    directions,
    img_url,
    distance,
    id,
    owner_id,
  } = shopDetails;

  const { handleChatOpen } = useChatStore((state) => state);
  const { user_data } = useGlobalStore((state) => state);

  const isOwnShop = Boolean(user_data?.user_id && owner_id && user_data.user_id === owner_id);

  const goToStore = () => {
    if (id) {
      history.push(`/shop/${id}`);
    }
  };

  const categoryName = shopCategory?.name || shopSubCategory?.name || shop_type;

  const directionsUrl =
    directions ||
    (address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${shop_name} ${address}`
        )}`
      : null);

  return (
    <Card
      hoverable
      onClick={!isEdit ? goToStore : undefined}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
        cursor: isEdit ? 'default' : 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
      styles={{
        body: {
          padding: screens.xs ? 14 : 16,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
    >
      {/* Top Banner / Avatar & Rating */}
      <Flex gap={12} align="start" style={{ marginBottom: 10 }}>
        <div
          style={{
            width: screens.xs ? 64 : 72,
            height: screens.xs ? 64 : 72,
            borderRadius: 12,
            background: '#f1f5f9',
            overflow: 'hidden',
            flexShrink: 0,
            border: '1px solid #e2e8f0',
          }}
        >
          <img
            src={
              img_url ||
              'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300'
            }
            alt={shop_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <Flex vertical flex={1} style={{ minWidth: 0 }}>
          <Title
            level={5}
            ellipsis={{ rows: 1 }}
            style={{
              margin: 0,
              fontWeight: 700,
              color: '#0f172a',
              fontSize: screens.xs ? 15 : 16,
            }}
          >
            {shop_name}
          </Title>

          <Flex align="center" gap={6} style={{ marginTop: 4 }}>
            {isOwnShop && (
              <Tag
                color="green"
                style={{
                  fontSize: 11,
                  padding: '0 6px',
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                My Store
              </Tag>
            )}

            {/* Show category tag on desktop/tablet; remove on mobile to prevent clutter */}
            {!isMobile && categoryName && (
              <Tag
                color="indigo"
                style={{
                  fontSize: 11,
                  padding: '0 6px',
                  fontWeight: 600,
                  margin: 0,
                  maxWidth: 140,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {categoryName}
              </Tag>
            )}

            <Flex align="center" gap={2} style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
              <StarFilled style={{ fontSize: 12 }} />
              <span>{rating || 5}.0</span>
            </Flex>
          </Flex>

          <Flex
            align="center"
            gap={6}
            style={{
              marginTop: 4,
              fontSize: 12,
              color: '#64748b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <EnvironmentOutlined style={{ color: '#4f46e5', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {area || 'Local'}
            </span>
            {distance !== undefined && distance !== null && (
              <span style={{ fontWeight: 700, color: '#10b981', flexShrink: 0 }}>
                • {distanceConvertor(distance)} km
              </span>
            )}
          </Flex>
        </Flex>
      </Flex>

      {/* Address using Ant Design Typography.Paragraph with 2-line ellipsis */}
      <Paragraph
        type="secondary"
        ellipsis={{ rows: 2 }}
        style={{
          fontSize: 12,
          color: '#64748b',
          marginBottom: 12,
          minHeight: screens.xs ? 32 : 36,
          lineHeight: '18px',
        }}
      >
        {address}
      </Paragraph>

      {/* Action Buttons */}
      <Flex
        gap={8}
        align="center"
        style={{
          width: '100%',
          marginTop: 'auto',
          paddingTop: 10,
          borderTop: '1px solid #f1f5f9',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isEdit ? (
          <Button
            type="primary"
            block
            icon={<EditOutlined />}
            onClick={() => handleEdit()}
            style={{ borderRadius: 8, fontWeight: 600, height: 38 }}
          >
            Manage Shop
          </Button>
        ) : isOwnShop ? (
          <>
            <Button
              type="default"
              style={{
                flex: 1,
                borderRadius: 8,
                fontWeight: 600,
                height: 38,
              }}
              onClick={goToStore}
            >
              Preview Store <ArrowRightOutlined style={{ fontSize: 11 }} />
            </Button>

            <Button
              type="primary"
              icon={<EditOutlined />}
              style={{
                borderRadius: 8,
                fontWeight: 600,
                height: 38,
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                border: 'none',
              }}
              onClick={() => history.push(`/client_register?shop_id=${id}`)}
            >
              Manage
            </Button>

            {directionsUrl && (
              <Button
                icon={<CompassOutlined />}
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ borderRadius: 8, height: 38, width: 38 }}
                title="Get Directions"
              />
            )}
          </>
        ) : (
          <>
            <Button
              type="primary"
              style={{
                flex: 1,
                borderRadius: 8,
                fontWeight: 600,
                height: 38,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              }}
              onClick={goToStore}
            >
              Visit Store <ArrowRightOutlined style={{ fontSize: 11 }} />
            </Button>

            {!isChatDisabled && (
              <Tooltip title={!isChat ? 'Login to chat' : 'Direct chat with owner'}>
                <Button
                  icon={<MessageOutlined />}
                  style={{ borderRadius: 8, height: 38, width: 38 }}
                  disabled={!isChat}
                  onClick={() => handleChatOpen(owner_id, id)}
                />
              </Tooltip>
            )}

            {directionsUrl && (
              <Button
                icon={<CompassOutlined />}
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ borderRadius: 8, height: 38, width: 38 }}
                title="Get Directions"
              />
            )}
          </>
        )}
      </Flex>
    </Card>
  );
};

export default ShopCard;
