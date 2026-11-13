import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Flex } from 'antd';
import {
  AimOutlined,
  MessageOutlined,
  ThunderboltFilled,
  CheckCircleFilled,
} from '@ant-design/icons';

const NIGHT_STEPS = [
  {
    number: '01',
    badge: 'LIVE RADAR SCANNING',
    title: 'Pinpoint nearby inventory',
    description:
      'Set your street and walking radius. Rquest’s live geospatial radar pings local merchants within 1–5 km who are open and stocked right now.',
    icon: <AimOutlined style={{ fontSize: 22, color: '#D2F82E' }} />,
    accent: '#D2F82E',
  },
  {
    number: '02',
    badge: 'DIRECT STORE CHAT',
    title: 'Confirm shelf stock & craft',
    description:
      'Skip the guesswork. Chat directly with the actual brick-and-mortar shopkeeper in real-time to verify sizes, fresh batches, or custom requests.',
    icon: <MessageOutlined style={{ fontSize: 22, color: '#5690FE' }} />,
    accent: '#5690FE',
  },
  {
    number: '03',
    badge: '100% DIRECT UPI',
    title: 'Collect or dispatch in 15m',
    description:
      'Pay 100% directly to the merchant with ₹0 platform markup. Choose rapid counter pickup or local runner delivery straight to your door.',
    icon: <ThunderboltFilled style={{ fontSize: 22, color: '#F59E0B' }} />,
    accent: '#F59E0B',
  },
];

/**
 * NightShiftSection
 * Cinematic dark mode chapter that transitions the page into a deep midnight
 * urban landscape with glowing neon conduits connecting the 3-step ordering flow.
 */
export const NightShiftSection = ({ onOpenRadar, onOpenChat }) => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="nightshift-container">
      {/* Background Star & Coordinate Grid */}
      <div className="nightshift-grid-bg" aria-hidden="true" />

      {/* Glowing Neon Connecting Track */}
      <div className="nightshift-neon-track" aria-hidden="true" />

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginBottom: 48 }}>
        <div style={{ marginBottom: 14 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 14px',
              borderRadius: 9999,
              background: 'rgba(210, 248, 46, 0.12)',
              border: '1px solid rgba(210, 248, 46, 0.35)',
              color: '#D2F82E',
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#D2F82E',
                boxShadow: '0 0 8px #D2F82E',
              }}
            />
            NEIGHBORHOOD COMMERCE NOCTURNE
          </span>
        </div>

        <h2
          style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.18,
            letterSpacing: '-0.025em',
            margin: '0 auto 14px',
            maxWidth: 720,
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          Effortless local trade,{' '}
          <span style={{ color: '#D2F82E' }}>perfected day & night.</span>
        </h2>

        <p
          style={{
            fontSize: 16,
            color: 'rgba(255, 255, 255, 0.72)',
            maxWidth: 580,
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          No distant warehouse wait times. No algorithmic markups. Pure direct commerce
          between neighborhood residents and trusted store owners.
        </p>
      </div>

      {/* 3 Interactive Cards with Neon Flow */}
      <Row gutter={[24, 24]} style={{ position: 'relative', zIndex: 2 }}>
        {NIGHT_STEPS.map((step, idx) => (
          <Col xs={24} md={8} key={step.number}>
            <div
              className="nightshift-step-card"
              onMouseEnter={() => setActiveStep(idx)}
              style={{
                borderColor:
                  activeStep === idx ? step.accent : 'rgba(255, 255, 255, 0.12)',
              }}
            >
              {/* Card Header: Step number + Icon */}
              <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    color: activeStep === idx ? step.accent : 'rgba(255, 255, 255, 0.4)',
                    transition: 'color 0.25s ease',
                  }}
                >
                  {step.number}
                </span>

                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                  }}
                >
                  {step.icon}
                </div>
              </Flex>

              {/* Eyebrow badge */}
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: step.accent,
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}
              >
                {step.badge}
              </div>

              {/* Title */}
              <h3
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  margin: '0 0 10px',
                  letterSpacing: '-0.01em',
                }}
              >
                {step.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: 13.5,
                  color: 'rgba(255, 255, 255, 0.65)',
                  lineHeight: 1.55,
                  margin: '0 0 24px',
                  minHeight: 64,
                }}
              >
                {step.description}
              </p>

              {/* Interactive Visual Moment Inside Each Card */}
              <div
                style={{
                  background: 'rgba(10, 8, 26, 0.7)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {idx === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="radar-blip-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#D2F82E', display: 'inline-block' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
                        142 Shops Active
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#D2F82E', fontWeight: 600 }}>
                      Radius: 2.0 km
                    </span>
                  </div>
                )}

                {idx === 1 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Sunrise Bakehouse:</span>
                      <span style={{ fontSize: 11, color: '#5690FE', fontWeight: 700 }}>“Hot batch at 7 AM ✓”</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Typing</span>
                      <span className="typing-dot-1" style={{ width: 3, height: 3, borderRadius: '50%', background: '#5690FE' }} />
                      <span className="typing-dot-2" style={{ width: 3, height: 3, borderRadius: '50%', background: '#5690FE' }} />
                      <span className="typing-dot-3" style={{ width: 3, height: 3, borderRadius: '50%', background: '#5690FE' }} />
                    </div>
                  </div>
                )}

                {idx === 2 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13 }}>⚡</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>Direct UPI</div>
                        <div style={{ fontSize: 10, color: '#10B981', fontWeight: 700 }}>₹0 Platform Fee</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, background: 'rgba(210, 248, 46, 0.15)', color: '#D2F82E', padding: '3px 8px', borderRadius: 9999, fontWeight: 700 }}>
                      15 min
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </section>
  );
};

NightShiftSection.propTypes = {
  onOpenRadar: PropTypes.func,
  onOpenChat: PropTypes.func,
};

export default NightShiftSection;
