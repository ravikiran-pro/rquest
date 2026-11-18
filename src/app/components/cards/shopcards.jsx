import React from 'react';
import PropTypes from 'prop-types';
import { Card, Button, Typography, Tag, Tooltip, Flex, Grid } from 'antd';
import {
  EditOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
  CompassOutlined,
  StarFilled,
} from '@ant-design/icons';
import ChatIcon from '../common/ChatIcon';
import { useChatStore, useGlobalStore } from '../../services';
import { distanceConvertor, formatDistance } from '../../utils';
import CardMedia from './CardMedia';
import { useHistory } from 'react-router-dom';
import { colors, radii, shadows } from '../../styles';
import './shop-card.css';

const { Text, Title, Paragraph } = Typography;

const ShopCard = ({
  shopDetails,
  shop,
  isChat = false,
  isChatDisabled = false,
  isEdit = false,
  handleEdit = () => null,
  viewMode = 'grid',
}) => {
  const history = useHistory();
  const screens = Grid.useBreakpoint();

  const currentShop = shopDetails || shop || {};
  const {
    shop_name = '',
    address = '',
    area = '',
    rating = 0,
    shopSubCategory,
    shopCategory,
    shop_type,
    directions,
    img_url,
    distance,
    id,
    owner_id,
  } = currentShop;

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

  if (viewMode === 'list') {
    return (
      <Card
        hoverable
        onClick={!isEdit ? goToStore : undefined}
        style={{
          width: '100%',
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.card,
          cursor: isEdit ? 'default' : 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          background: colors.surface,
        }}
        styles={{
          body: {
            padding: screens.xs ? 12 : '14px 18px',
          },
        }}
      >
        <Flex
          align={screens.xs ? 'start' : 'center'}
          justify="space-between"
          gap={screens.xs ? 10 : 16}
          wrap={screens.xs ? 'wrap' : 'nowrap'}
        >
          {/* Left: Thumbnail + Main info */}
          <Flex gap={12} align="center" style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: screens.xs ? 64 : 76,
                height: screens.xs ? 64 : 76,
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
              <Flex align="center" gap={8} wrap="wrap">
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

                {isOwnShop && (
                  <Tag color="green" style={{ fontSize: 10, padding: '0 6px', fontWeight: 700, margin: 0 }}>
                    My Store
                  </Tag>
                )}

                {categoryName && (
                  <Tag color="indigo" style={{ fontSize: 10, padding: '0 6px', fontWeight: 600, margin: 0 }}>
                    {categoryName}
                  </Tag>
                )}

                {rating && Number(rating) > 0 ? (
                  <Flex align="center" gap={2} style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                    <StarFilled style={{ fontSize: 12 }} />
                    <span>{Number(rating).toFixed(1)}</span>
                  </Flex>
                ) : (
                  <Tag style={{ fontSize: 10, padding: '0 5px', margin: 0, fontWeight: 600, color: colors.textMuted }}>
                    New
                  </Tag>
                )}
              </Flex>

              <Flex
                align="center"
                gap={6}
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: colors.textMuted,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <EnvironmentOutlined style={{ color: colors.primary, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {area || 'Local'}
                </span>
                {distance !== undefined && distance !== null && (
                  <span style={{ fontWeight: 700, color: '#047857', flexShrink: 0 }}>
                    • {distanceConvertor(distance)} km
                  </span>
                )}
              </Flex>

              {address && (
                <Text
                  type="secondary"
                  ellipsis={{ rows: 1 }}
                  style={{
                    fontSize: 12,
                    color: colors.textMuted,
                    marginTop: 2,
                    maxWidth: 520,
                  }}
                >
                  {address}
                </Text>
              )}
            </Flex>
          </Flex>

          {/* Right: Actions */}
          <Flex
            gap={8}
            align="center"
            style={{
              width: screens.xs ? '100%' : 'auto',
              justifyContent: screens.xs ? 'stretch' : 'flex-end',
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {isEdit ? (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => handleEdit()}
                style={{ borderRadius: 8, fontWeight: 600, height: 38, flex: screens.xs ? 1 : 'none' }}
              >
                Manage
              </Button>
            ) : isOwnShop ? (
              <>
                <Button
                  type="default"
                  style={{
                    borderRadius: 8,
                    fontWeight: 600,
                    height: 38,
                    flex: screens.xs ? 1 : 'none',
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
              </>
            ) : (
              <>
                <Button
                  type="primary"
                  style={{
                    borderRadius: radii.md,
                    fontWeight: 600,
                    height: 38,
                    flex: screens.xs ? 1 : 'none',
                    background: colors.primary,
                    borderColor: colors.primary,
                  }}
                  onClick={goToStore}
                >
                  Visit Store <ArrowRightOutlined style={{ fontSize: 11 }} />
                </Button>

                {!isChatDisabled && (
                  <Tooltip title={!isChat ? 'Login to chat' : 'Direct chat with owner'}>
                    <Button
                      icon={<ChatIcon />}
                      style={{ borderRadius: 8, height: 38, width: 38 }}
                      disabled={!isChat}
                      onClick={() => handleChatOpen(owner_id, id, { shop_name: shop_name })}
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
        </Flex>
      </Card>
    );
  }

  const ratingText = Number(rating) > 0 ? Number(rating).toFixed(1) : null;
  const distanceText = formatDistance(distance);
  const metaLine = [area || 'Local', categoryName].filter(Boolean).join(' · ');

  // Grid card: image first so the photo sets the scan, distance is the lead fact
  return (
    <Card
      hoverable
      onClick={!isEdit ? goToStore : undefined}
      className="rq-shop-card rq-shop-card--grid"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: radii.lg,
        border: `1px solid ${colors.border}`,
        boxShadow: 'none',
        cursor: isEdit ? 'default' : 'pointer',
        overflow: 'hidden',
        background: colors.surface,
      }}
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
    >
      <div className="rq-shop-card-cover">
        <CardMedia src={img_url} alt={shop_name} size="lg" />
        {distanceText && <span className="rq-shop-card-distance">{distanceText}</span>}
        <span className="rq-shop-card-rating">
          {ratingText ? (
            <>
              <StarFilled />
              {ratingText}
            </>
          ) : (
            'New'
          )}
        </span>
      </div>

      <div className="rq-shop-card-body">
        <Flex align="center" gap={6} style={{ minWidth: 0 }}>
          <Text strong className="rq-shop-card-name" title={shop_name}>
            {shop_name}
          </Text>
          {isOwnShop && (
            <Tag color="green" style={{ fontSize: 10, padding: '0 6px', fontWeight: 700, margin: 0, flexShrink: 0 }}>
              My Store
            </Tag>
          )}
        </Flex>

        <div className="rq-shop-card-meta" title={metaLine}>
          {metaLine}
        </div>

        {/* Actions: one primary action, icon buttons beside it, all 40px tall */}
        <Flex gap={8} align="center" className="rq-shop-card-actions" onClick={(e) => e.stopPropagation()}>
          {isEdit ? (
            <Button type="primary" icon={<EditOutlined />} onClick={() => handleEdit()}>
              Manage shop
            </Button>
          ) : isOwnShop ? (
            <>
              <Button type="primary" icon={<EditOutlined />} onClick={() => history.push(`/client_register?shop_id=${id}`)}>
                Manage store
              </Button>
              <Button onClick={goToStore}>Preview</Button>
            </>
          ) : (
            <>
              <Button type="primary" onClick={goToStore}>
                View store
              </Button>
              {!isChatDisabled && (
                <Tooltip title={isChat ? 'Chat with owner' : 'Sign in to chat'}>
                  <Button
                    className="rq-shop-card-icon"
                    aria-label="Chat with owner"
                    icon={<ChatIcon />}
                    disabled={!isChat}
                    onClick={() => handleChatOpen(owner_id, id, { shop_name: shop_name })}
                  />
                </Tooltip>
              )}
            </>
          )}
          {directionsUrl && !isEdit && (
            <Button
              className="rq-shop-card-icon"
              aria-label="Get directions"
              title="Get directions"
              icon={<CompassOutlined />}
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
            />
          )}
        </Flex>
      </div>
    </Card>
  );
};

const shopPropShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  shop_name: PropTypes.string,
  address: PropTypes.string,
  area: PropTypes.string,
  rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  shop_type: PropTypes.string,
  directions: PropTypes.string,
  img_url: PropTypes.string,
  distance: PropTypes.number,
  owner_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  shopCategory: PropTypes.shape({
    name: PropTypes.string,
  }),
  shopSubCategory: PropTypes.shape({
    name: PropTypes.string,
  }),
});

ShopCard.propTypes = {
  shopDetails: shopPropShape,
  shop: shopPropShape,
  isChat: PropTypes.bool,
  isChatDisabled: PropTypes.bool,
  isEdit: PropTypes.bool,
  handleEdit: PropTypes.func,
  viewMode: PropTypes.oneOf(['grid', 'list']),
};

export default ShopCard;
