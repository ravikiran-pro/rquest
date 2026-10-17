import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Typography, Flex, Upload, message, Tag } from 'antd';
import { CameraOutlined, UploadOutlined, FileImageOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const VISUAL_PRESETS = [
  'Plumbing pipe & tap fitting',
  'Electrical switchboard / MCB',
  'Atta flour 5kg packet',
  'AC servicing repair parts',
  'Pharmacy medicine strip',
];

const ImageSearchModal = ({ open, onClose, onSearch }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleFileChange = (info) => {
    const file = info.file?.originFileObj || info.file;
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      // Auto-extract friendly name as fallback
      const cleanName = file.name ? file.name.split('.')[0].replace(/[_-]/g, ' ') : 'Item';
      setSearchQuery(cleanName);
    }
  };

  const handleApply = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      onClose();
    } else {
      message.warning('Please select an item or upload an image.');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={460}
      styles={{
        body: {
          padding: '24px 20px',
        },
      }}
    >
      <Flex vertical align="center" gap={14} style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: '#eef2ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}
        >
          <CameraOutlined />
        </div>

        <div>
          <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
            Visual Image Search
          </Title>
          <Paragraph type="secondary" style={{ fontSize: 13, margin: '4px 0 0 0' }}>
            Snap or upload a photo of a tool, product, or shop to find matching local sellers.
          </Paragraph>
        </div>

        {/* Upload Drop Area */}
        <Upload.Dragger
          accept="image/*"
          showUploadList={false}
          beforeUpload={() => false}
          onChange={handleFileChange}
          style={{
            width: '100%',
            padding: previewUrl ? 8 : 16,
            borderRadius: 12,
            border: '2px dashed #cbd5e1',
            background: '#f8fafc',
          }}
        >
          {previewUrl ? (
            <Flex vertical align="center" gap={8}>
              <img
                src={previewUrl}
                alt="Preview"
                style={{
                  maxHeight: 140,
                  maxWidth: '100%',
                  borderRadius: 8,
                  objectFit: 'contain',
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Click or drop another image to replace
              </Text>
            </Flex>
          ) : (
            <Flex vertical align="center" gap={6}>
              <FileImageOutlined style={{ fontSize: 32, color: '#94a3b8' }} />
              <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
                Click or drag image to this area to upload
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Supports PNG, JPG, WEBP photos
              </Text>
            </Flex>
          )}
        </Upload.Dragger>

        {/* Quick Example Presets */}
        <div style={{ width: '100%', textAlign: 'left' }}>
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
            Or pick common visual items:
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {VISUAL_PRESETS.map((preset) => (
              <Tag
                key={preset}
                color={searchQuery === preset ? 'indigo' : 'default'}
                style={{
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                }}
                onClick={() => setSearchQuery(preset)}
              >
                {preset}
              </Tag>
            ))}
          </div>
        </div>

        <Flex gap={10} style={{ width: '100%', marginTop: 8 }}>
          <Button block onClick={onClose} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
          <Button
            type="primary"
            block
            disabled={!previewUrl && !searchQuery}
            onClick={handleApply}
            style={{
              borderRadius: 8,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            }}
          >
            Find Matching Stores
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
};

ImageSearchModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
};

export default ImageSearchModal;

