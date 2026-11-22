import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  FilePdfOutlined,
  DownloadOutlined,
  EyeOutlined,
  CopyOutlined,
  CheckOutlined,
  LoadingOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Popconfirm, Tooltip, Image } from 'antd';
import {
  renderMarkdown,
  copyToClipboard,
  resolveFileUrl,
  formatFileSize,
} from '../../utils';
import { config } from '../../utils/config';

// Helper to identify automated / system / order notifications
export function isSystemOrOrderMessage(msg) {
  if (!msg) return false;
  if (msg.message_type === 'order_update' || msg.message_type === 'system' || msg.message_type === 'automated') {
    return true;
  }
  const text = msg.message || '';
  return (
    text.startsWith('🚚 Store Update') ||
    text.startsWith('🎉 Store Update') ||
    text.startsWith('✅ Store Update') ||
    text.startsWith('👨‍🍳 Store Update') ||
    text.startsWith('🛵 Store Update') ||
    text.startsWith('❌ Store Update') ||
    text.startsWith('📋 Store Update') ||
    text.includes('New Delivery Order') ||
    text.includes('New Self-Pickup Order') ||
    text.includes('New Service Booking') ||
    text.startsWith('Customer Pre-order Inquiry')
  );
}

// Helper to determine notification badge title
function getSystemBadgeTitle(text = '') {
  if (text.includes('New Delivery Order')) return '🚚 Delivery Order';
  if (text.includes('New Self-Pickup Order')) return '🛍️ Pickup Order';
  if (text.includes('New Service Booking')) return '🛠️ Service Booking';
  if (text.startsWith('Customer Pre-order Inquiry')) return '💬 Pre-Order Inquiry';
  if (text.includes('Store Update')) return '📦 Store Update';
  return '🤖 System Update';
}

const ChatMessageItem = ({
  msg,
  isOutgoing,
  timeStr,
  onDeleteMessage,
  onImageLoad,
}) => {
  const [copied, setCopied] = useState(false);
  const isDeleted = Boolean(msg.is_deleted);
  const isSystem = !isDeleted && isSystemOrOrderMessage(msg);

  // Normalize attachments
  const attachments = Array.isArray(msg.attachments) && msg.attachments.length > 0
    ? msg.attachments
    : msg.attachment_url
    ? [
        {
          url: msg.attachment_url,
          name: msg.attachment_name || 'Attachment',
          type: msg.attachment_type || 'image',
          size: msg.attachment_size || 0,
        },
      ]
    : [];

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (isDeleted || !msg.message) return;
    const ok = await copyToClipboard(msg.message, true);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`rquest-msg-bubble-inner ${isOutgoing ? 'outgoing' : 'incoming'} ${
        isSystem ? 'system-notice' : ''
      }`}
    >
      {/* System / Automated Notification Header Badge */}
      {isSystem && (
        <div className="rquest-msg-system-header">
          <span className="rquest-system-pill">
            <InfoCircleOutlined style={{ fontSize: 10 }} />
            <span>{getSystemBadgeTitle(msg.message)}</span>
          </span>
        </div>
      )}

      {/* Deleted Message Placeholder */}
      {isDeleted ? (
        <div className="rquest-msg-deleted-text">
          <em>This message was deleted</em>
        </div>
      ) : (
        <>
          {/* Main Message Text (Rendered as Markdown) */}
          {msg.message ? (
            <div
              className={`rquest-msg-markdown-body ${isOutgoing ? 'outgoing' : 'incoming'}`}
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(msg.message),
              }}
            />
          ) : null}

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="rquest-msg-attachments-container">
              {/* Image Attachments */}
              {attachments.filter((a) => a.type === 'image' || a.mimeType?.startsWith('image/')).length > 0 && (
                <div className="rquest-msg-images-grid">
                  <Image.PreviewGroup>
                    {attachments
                      .filter((a) => a.type === 'image' || a.mimeType?.startsWith('image/'))
                      .map((att, attIdx) => {
                        const fileUrl = resolveFileUrl(att.url, config.api_url);
                        return (
                          <div key={att.url || attIdx} className="rquest-msg-image-card">
                            <Image
                              src={fileUrl}
                              alt={att.name || 'Image'}
                              className="rquest-msg-img"
                              onLoad={() => onImageLoad && onImageLoad()}
                              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA="
                            />
                            {att.name && (
                              <span className="rquest-msg-img-caption" title={att.name}>
                                {att.name}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </Image.PreviewGroup>
                </div>
              )}

              {/* PDF Documents */}
              {attachments
                .filter((a) => a.type === 'pdf' || a.mimeType === 'application/pdf')
                .map((att, attIdx) => {
                  const fileUrl = resolveFileUrl(att.url, config.api_url);
                  return (
                    <div key={att.url || attIdx} className="rquest-msg-pdf-card">
                      <div className="rquest-pdf-icon-wrap">
                        <FilePdfOutlined style={{ fontSize: 24, color: '#dc2626' }} />
                      </div>
                      <div className="rquest-pdf-info">
                        <span className="rquest-pdf-name" title={att.name}>
                          {att.name || 'Document.pdf'}
                        </span>
                        <span className="rquest-pdf-size">
                          {formatFileSize(att.size) || 'PDF Document'}
                        </span>
                      </div>
                      <div className="rquest-pdf-actions">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rquest-pdf-btn view-btn"
                          title="Open PDF in new tab"
                        >
                          <EyeOutlined /> Open
                        </a>
                        <a
                          href={fileUrl}
                          download={att.name || 'document.pdf'}
                          className="rquest-pdf-btn download-btn"
                          title="Download PDF"
                        >
                          <DownloadOutlined />
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}

      {/* Message Footer & Actions */}
      <div className={`rquest-msg-meta ${isOutgoing ? 'outgoing' : 'incoming'}`}>
        <span className="rquest-msg-time">{timeStr}</span>

        {/* Copy Clean Plaintext Button */}
        {!isDeleted && msg.message && (
          <Tooltip title={copied ? 'Copied plain text!' : 'Copy text'}>
            <button
              type="button"
              className={`rquest-msg-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              aria-label="Copy message text"
            >
              {copied ? <CheckOutlined style={{ color: 'var(--success, #059669)' }} /> : <CopyOutlined />}
            </button>
          </Tooltip>
        )}

        {/* Read / Sent Status Indicators for Outgoing */}
        {isOutgoing && !isDeleted && (
          <span className="rquest-msg-status-indicator">
            {msg.status === 'pending' ? (
              <LoadingOutlined
                style={{ fontSize: 10, color: 'var(--text-light, #7A7268)' }}
                title="Sending..."
              />
            ) : msg.is_read ? (
              <span className="read-ticks" title="Read (Seen)">
                <CheckOutlined style={{ fontSize: 10 }} />
                <CheckOutlined style={{ fontSize: 10, marginLeft: -5 }} />
              </span>
            ) : (
              <span className="sent-tick" title="Delivered">
                <CheckOutlined style={{ fontSize: 10 }} />
              </span>
            )}
          </span>
        )}

        {/* Delete Message Action for Sender */}
        {isOutgoing && !isDeleted && msg.status !== 'pending' && onDeleteMessage && (
          <Popconfirm
            title="Delete message"
            description="Delete this message for everyone?"
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDeleteMessage(msg)}
          >
            <button
              type="button"
              className="rquest-msg-delete-btn"
              title="Delete message"
              aria-label="Delete message"
            >
              <DeleteOutlined />
            </button>
          </Popconfirm>
        )}
      </div>
    </div>
  );
};

ChatMessageItem.propTypes = {
  msg: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    message: PropTypes.string,
    message_type: PropTypes.string,
    attachments: PropTypes.array,
    attachment_url: PropTypes.string,
    attachment_name: PropTypes.string,
    attachment_type: PropTypes.string,
    attachment_size: PropTypes.number,
    status: PropTypes.string,
    is_read: PropTypes.bool,
    is_deleted: PropTypes.bool,
  }).isRequired,
  isOutgoing: PropTypes.bool.isRequired,
  timeStr: PropTypes.string.isRequired,
  onDeleteMessage: PropTypes.func,
  onImageLoad: PropTypes.func,
};

export default ChatMessageItem;
