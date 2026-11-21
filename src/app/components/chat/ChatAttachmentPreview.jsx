import React from 'react';
import PropTypes from 'prop-types';
import {
  CloseOutlined,
  FilePdfOutlined,
  LoadingOutlined,
  ReloadOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { formatFileSize } from '../../utils';

const ChatAttachmentPreview = ({ attachments = [], onRemove, onRetry }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="rquest-chat-attachment-previews" role="region" aria-label="Attachments to send">
      {attachments.map((item) => {
        const isPdf = item.type === 'pdf' || item.mimeType === 'application/pdf';
        const isUploading = item.status === 'uploading';
        const isError = item.status === 'error';

        return (
          <div
            key={item.id}
            className={`rquest-attach-preview-item ${isError ? 'error' : ''} ${
              isUploading ? 'uploading' : ''
            }`}
          >
            {/* Sleek remove attachment button */}
            <button
              type="button"
              className="rquest-attach-remove-btn"
              onClick={() => onRemove && onRemove(item.id)}
              title="Remove attachment"
              aria-label={`Remove ${item.name}`}
            >
              <CloseOutlined style={{ fontSize: 9 }} />
            </button>

            {/* Thumbnail or File Icon */}
            <div className="rquest-attach-thumb-wrap">
              {isPdf ? (
                <div className="rquest-attach-pdf-thumb">
                  <FilePdfOutlined style={{ fontSize: 24, color: '#dc2626' }} />
                  <span className="rquest-attach-pdf-ext">PDF</span>
                </div>
              ) : item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.name || 'Attachment'}
                  className="rquest-attach-img-thumb"
                />
              ) : (
                <div className="rquest-attach-fallback-thumb">
                  <PictureOutlined style={{ fontSize: 22, color: 'var(--primary, #0B2D6B)' }} />
                </div>
              )}

              {/* Uploading progress overlay */}
              {isUploading && (
                <div className="rquest-attach-overlay uploading">
                  <LoadingOutlined style={{ fontSize: 18, color: '#ffffff' }} />
                  <span className="rquest-attach-progress-text">Uploading</span>
                </div>
              )}

              {/* Error overlay with retry button */}
              {isError && (
                <div className="rquest-attach-overlay error">
                  <button
                    type="button"
                    className="rquest-attach-retry-btn"
                    onClick={() => onRetry && onRetry(item)}
                    title="Retry upload"
                  >
                    <ReloadOutlined /> Retry
                  </button>
                </div>
              )}
            </div>

            {/* File info */}
            <div className="rquest-attach-meta">
              <span className="rquest-attach-name" title={item.name}>
                {item.name}
              </span>
              <span className="rquest-attach-size">
                {isError ? (
                  <span style={{ color: 'var(--error, #ba1a1a)' }}>Failed</span>
                ) : (
                  formatFileSize(item.size)
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

ChatAttachmentPreview.propTypes = {
  attachments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
      size: PropTypes.number,
      type: PropTypes.string,
      previewUrl: PropTypes.string,
      status: PropTypes.string,
      error: PropTypes.string,
    })
  ),
  onRemove: PropTypes.func,
  onRetry: PropTypes.func,
};

export default ChatAttachmentPreview;
