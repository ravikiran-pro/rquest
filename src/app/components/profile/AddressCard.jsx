import React from 'react';
import PropTypes from 'prop-types';
import { Card, Tag, Button, Popconfirm, Typography } from 'antd';
import {
  HomeOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleFilled,
  PhoneOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { getFormattedAddress } from './AddressOption';
import './profile-components.css';

const { Text } = Typography;

const LABEL_META = {
  home: { icon: <HomeOutlined />, color: 'blue' },
  work: { icon: <ShopOutlined />, color: 'gold' },
  office: { icon: <ShopOutlined />, color: 'gold' },
};

const AddressCard = ({
  address,
  onEdit = () => {},
  onDelete = () => {},
  onSetDefault = () => {},
}) => {
  const labelKey = (address.label || '').toLowerCase();
  const meta = LABEL_META[labelKey] || { icon: <EnvironmentOutlined />, color: 'default' };
  const formatted = getFormattedAddress(address);
  const hasCoords = address.latitude && address.longitude;

  const actions = [
    !address.is_default && (
      <Button key="default" type="text" size="small" icon={<StarOutlined />} onClick={() => onSetDefault(address)}>
        Set default
      </Button>
    ),
    <Button key="edit" type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(address)}>
      Edit
    </Button>,
    <Popconfirm
      key="delete"
      title="Delete this address?"
      description="You can add it again later."
      okText="Delete"
      cancelText="Cancel"
      okButtonProps={{ danger: true }}
      onConfirm={() => onDelete(address)}
    >
      <Button type="text" size="small" danger icon={<DeleteOutlined />}>
        Delete
      </Button>
    </Popconfirm>,
  ].filter(Boolean);

  return (
    <Card
      size="small"
      className={`rq-address-card${address.is_default ? ' is-default' : ''}`}
      actions={actions}
    >
      <div className="rq-address-card-head">
        <Tag icon={meta.icon} color={meta.color} style={{ margin: 0 }}>
          {address.label || 'Address'}
        </Tag>
        {address.is_default && (
          <Tag icon={<CheckCircleFilled />} color="success" style={{ margin: 0 }}>
            Default
          </Tag>
        )}
      </div>

      {address.recipient_name && (
        <div className="rq-address-card-name">
          {address.recipient_name}
        </div>
      )}

      <div className="rq-address-card-text">{formatted}</div>

      {(address.recipient_phone || hasCoords) && (
        <div className="rq-address-card-meta">
          {address.recipient_phone && (
            <span>
              <PhoneOutlined /> {address.recipient_phone}
            </span>
          )}
          {hasCoords && (
            <Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
              <EnvironmentOutlined /> {Number(address.latitude).toFixed(4)}, {Number(address.longitude).toFixed(4)}
            </Text>
          )}
        </div>
      )}
    </Card>
  );
};

AddressCard.propTypes = {
  address: PropTypes.object.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onSetDefault: PropTypes.func,
};

export default AddressCard;
