import React from 'react';
import PropTypes from 'prop-types';
import { format, isToday, isYesterday } from 'date-fns';
import { Card, Avatar, Col, Badge } from 'antd';
import './style.css';

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '';
  const dateTime = new Date(dateTimeString);

  if (isToday(dateTime)) {
    return format(dateTime, 'h:mm a');
  } else if (isYesterday(dateTime)) {
    return 'Yesterday';
  } else {
    return format(dateTime, 'dd-MM-yyyy');
  }
}

const MessageHeader = ({
  name = 'User',
  message = '',
  handleHeaderClick,
  color,
  totalUnread,
  dateTime,
  isOnline,
}) => {
  const initial = (name && typeof name === 'string' && name.length > 0) ? name[0].toUpperCase() : 'U';

  return (
    <Card
      style={{ width: '100%', marginBottom: 8 }}
      className="message-header-root"
      onClick={handleHeaderClick}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <Avatar
          style={{
            backgroundColor: color || 'var(--primary, #0B2D6B)',
            verticalAlign: 'middle',
            marginRight: 12,
            fontFamily: "var(--font-headline, 'Plus Jakarta Sans', sans-serif)",
            fontWeight: 700,
          }}
          size="large"
        >
          {initial}
        </Avatar>

        <Col
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}
        >
          <div className="title">
            <span>{name}</span>
            <span className={`badge ${isOnline ? 'online' : 'offline'}`} />
          </div>
          <div className="sub-title">{message}</div>
        </Col>
      </div>
      <div>
        <Col className="message-header-edge">
          <div>
            <span>{formatDateTime(dateTime)}</span>
          </div>
          <div>{totalUnread ? <Badge count={totalUnread} style={{ backgroundColor: 'var(--primary, #0B2D6B)' }} /> : null}</div>
        </Col>
      </div>
    </Card>
  );
};

MessageHeader.propTypes = {
  name: PropTypes.string,
  message: PropTypes.string,
  handleHeaderClick: PropTypes.func,
  color: PropTypes.string,
  totalUnread: PropTypes.number,
  dateTime: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  index: PropTypes.number,
  isOnline: PropTypes.bool,
};

export default MessageHeader;
