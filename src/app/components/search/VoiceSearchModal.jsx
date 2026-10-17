import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Typography, Flex, message } from 'antd';
import { AudioOutlined, AudioMutedOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const VoiceSearchModal = ({ open, onClose, onSearch }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Default to Indian English

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let current = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current);
    };

    recognition.onerror = (event) => {
      console.warn('Voice search error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        message.error('Microphone access was denied. Please allow microphone permissions in your browser.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Auto-start when modal opens
  useEffect(() => {
    if (open && isSupported && recognitionRef.current) {
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        // already started
      }
    } else if (!open && recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
    }
  }, [open, isSupported]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Ignore
      }
    }
  };

  const handleApply = () => {
    if (transcript.trim()) {
      onSearch(transcript.trim());
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={420}
      styles={{
        body: {
          padding: '28px 24px',
          textAlign: 'center',
        },
      }}
    >
      <Flex vertical align="center" gap={16}>
        <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
          Voice Search
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {isListening ? 'Listening... Speak what you are looking for' : 'Tap the microphone to speak'}
        </Text>

        {/* Pulsing Mic Circle */}
        <div
          onClick={toggleListening}
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            background: isListening
              ? 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)'
              : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 32,
            cursor: 'pointer',
            boxShadow: isListening
              ? '0 0 0 12px rgba(239, 68, 68, 0.2)'
              : '0 4px 16px rgba(79, 70, 229, 0.3)',
            transition: 'all 0.25s ease',
            margin: '12px 0',
          }}
        >
          {isListening ? <AudioOutlined /> : <AudioMutedOutlined />}
        </div>

        {/* Real-time transcript preview */}
        <div
          style={{
            minHeight: 48,
            width: '100%',
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '12px 16px',
            fontSize: 14,
            color: transcript ? '#0f172a' : '#94a3b8',
            fontStyle: transcript ? 'normal' : 'italic',
            fontWeight: 500,
          }}
        >
          {transcript || 'e.g. "Plumber near me" or "Grocery store"'}
        </div>

        {!isSupported && (
          <Text type="danger" style={{ fontSize: 12 }}>
            Speech recognition is not supported in this browser. Please use Chrome or Edge.
          </Text>
        )}

        <Flex gap={10} style={{ width: '100%', marginTop: 8 }}>
          <Button block onClick={onClose} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
          <Button
            type="primary"
            block
            disabled={!transcript.trim()}
            onClick={handleApply}
            style={{
              borderRadius: 8,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            }}
          >
            Search Now
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
};

VoiceSearchModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
};

export default VoiceSearchModal;

