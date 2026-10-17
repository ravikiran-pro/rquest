import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Typography, Flex, Input, Tag } from 'antd';
import { ThunderboltOutlined, SendOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const AI_PROMPT_PRESETS = [
  'Plumber near me with visiting under ₹400',
  'Pharmacy with home delivery within 3 km',
  'Fresh groceries and vegetables within 2 km',
  'AC repair technician available now',
  'Authentic biryani food delivery under ₹250',
];

const AiSearchModal = ({ open, onClose, onAiApply }) => {
  const [prompt, setPrompt] = useState('');

  const parseAiQuery = (text) => {
    const query = text.trim();
    let detectedKeyword = query;
    let detectedCategory = null;
    let detectedMaxDistance = null;
    let detectedMaxPrice = null;
    let detectedOnlyAvailable = false;

    const lower = query.toLowerCase();

    // 1. Distance extraction
    const distMatch = lower.match(/(?:within|under|less than|in)\s*(\d+)\s*(?:km|kms|kilometer|kilometers)/i);
    if (distMatch && distMatch[1]) {
      detectedMaxDistance = parseInt(distMatch[1], 10);
    } else if (lower.includes('near me') || lower.includes('nearby') || lower.includes('walkable')) {
      detectedMaxDistance = 3;
    }

    // 2. Price extraction
    const priceMatch = lower.match(/(?:under|below|less than|within|around)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
    if (priceMatch && priceMatch[1] && !distMatch) {
      detectedMaxPrice = parseInt(priceMatch[1], 10);
    }

    // 3. Category & Keyword detection
    if (lower.includes('plumber') || lower.includes('plumbing')) {
      detectedCategory = 'Technicians';
      detectedKeyword = 'Plumber';
    } else if (lower.includes('electrician') || lower.includes('ac repair') || lower.includes('technician') || lower.includes('repair')) {
      detectedCategory = 'Technicians';
      detectedKeyword = lower.includes('electrician') ? 'Electrician' : 'Technician';
    } else if (lower.includes('grocery') || lower.includes('vegetable') || lower.includes('atta') || lower.includes('supermarket')) {
      detectedCategory = 'Provision Store';
      detectedKeyword = 'Groceries';
    } else if (lower.includes('medicine') || lower.includes('pharmacy') || lower.includes('chemist')) {
      detectedCategory = 'Health & Medicine';
      detectedKeyword = 'Pharmacy';
    } else if (lower.includes('food') || lower.includes('biryani') || lower.includes('meal') || lower.includes('restaurant')) {
      detectedCategory = 'Food & Dining';
      detectedKeyword = lower.includes('biryani') ? 'Biryani' : 'Food';
    }

    // 4. Availability
    if (lower.includes('available now') || lower.includes('open now') || lower.includes('emergency') || lower.includes('instant')) {
      detectedOnlyAvailable = true;
    }

    return {
      keyword: detectedKeyword,
      category: detectedCategory,
      maxDistance: detectedMaxDistance,
      maxPrice: detectedMaxPrice,
      onlyAvailable: detectedOnlyAvailable,
    };
  };

  const handleApply = () => {
    if (!prompt.trim()) return;
    const result = parseAiQuery(prompt);
    onAiApply(result);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={480}
      styles={{
        body: {
          padding: '24px 20px',
        },
      }}
    >
      <Flex vertical gap={14}>
        <Flex align="center" gap={12}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            <ThunderboltOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
              AI Smart Search
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Describe what you need in plain words, our AI auto-configures filters.
            </Text>
          </div>
        </Flex>

        <Input.TextArea
          rows={3}
          placeholder="e.g. I need an emergency plumber near me under ₹400 visiting charge..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleApply();
            }
          }}
          style={{
            borderRadius: 12,
            border: '1px solid #cbd5e1',
            padding: '10px 14px',
            fontSize: 14,
          }}
        />

        <div>
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
            Try these AI prompts:
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {AI_PROMPT_PRESETS.map((p) => (
              <Tag
                key={p}
                style={{
                  cursor: 'pointer',
                  padding: '5px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  border: '1px solid #e2e8f0',
                  background: prompt === p ? '#eef2ff' : '#f8fafc',
                  color: prompt === p ? '#4f46e5' : '#334155',
                }}
                onClick={() => setPrompt(p)}
              >
                ✨ {p}
              </Tag>
            ))}
          </div>
        </div>

        <Flex gap={10} style={{ marginTop: 8 }}>
          <Button block onClick={onClose} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
          <Button
            type="primary"
            block
            icon={<SendOutlined />}
            disabled={!prompt.trim()}
            onClick={handleApply}
            style={{
              borderRadius: 8,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            }}
          >
            Ask AI & Filter
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
};

AiSearchModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAiApply: PropTypes.func.isRequired,
};

export default AiSearchModal;

