import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Flex } from 'antd';
import { ArrowUpOutlined, CheckCircleFilled, BellFilled } from '@ant-design/icons';

/**
 * LiveDashboardMock
 * Interactive browser-chrome preview card showing real-time seller stats,
 * counting-up metrics, and simulated incoming order notifications.
 */
export const LiveDashboardMock = () => {
  const [ordersCount, setOrdersCount] = useState(32);
  const [revenue, setRevenue] = useState(12800);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Animate stats counting up slightly to give a pulse of life
    const timer1 = setTimeout(() => {
      setOrdersCount(38);
      setRevenue(14250);
    }, 800);

    const timer2 = setTimeout(() => {
      setShowToast(true);
    }, 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="seller-dashboard-chrome" style={{ position: 'relative' }}>
      {/* Chrome Top Header Bar */}
      <div
        style={{
          background: '#FAF6F0',
          padding: '10px 16px',
          borderBottom: '1px solid #EADBCC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="chrome-traffic-lights">
            <span className="chrome-dot" style={{ background: '#EF4444' }} />
            <span className="chrome-dot" style={{ background: '#F59E0B' }} />
            <span className="chrome-dot" style={{ background: '#10B981' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1C1917' }}>
            🏪 Sunrise Bakehouse — Merchant Console
          </span>
        </div>

        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: '#15803D',
            background: '#DCFCE7',
            padding: '2px 8px',
            borderRadius: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#15803D' }} />
          Live Radar
        </span>
      </div>

      {/* Metrics Row */}
      <div style={{ padding: '16px 18px', background: '#FFFFFF' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#FAF6F0', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10.5, color: '#6B7280', fontWeight: 600 }}>Orders Today</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1C1917', marginTop: 2 }}>
              {ordersCount}{' '}
              <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>
                <ArrowUpOutlined style={{ fontSize: 9 }} /> 12%
              </span>
            </div>
          </div>

          <div style={{ background: '#FAF6F0', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10.5, color: '#6B7280', fontWeight: 600 }}>Revenue</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1C1917', marginTop: 2 }}>
              ₹{revenue.toLocaleString()}
            </div>
          </div>

          <div style={{ background: '#ECFDF5', borderRadius: 12, padding: '10px 12px', border: '1px solid #A7F3D0' }}>
            <div style={{ fontSize: 10.5, color: '#047857', fontWeight: 700 }}>Saved Cut</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#047857', marginTop: 2 }}>
              0% Fee
            </div>
          </div>
        </div>

        {/* Live Order Row */}
        <div
          style={{
            background: '#FAF6F0',
            borderRadius: 12,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🥐</span>
            <div>
              <strong style={{ color: '#1C1917' }}>Multi-grain boule (2x)</strong>
              <div style={{ fontSize: 10.5, color: '#6B7280' }}>Koramangala 4th Blk · 0.4 km away</div>
            </div>
          </div>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              background: '#E0F2FE',
              color: '#0284C7',
              padding: '2px 8px',
              borderRadius: 9999,
            }}
          >
            Ready for Pickup
          </span>
        </div>
      </div>

      {/* Simulated Live Incoming Order Toast */}
      {showToast && (
        <div className="incoming-order-toast">
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#D2F82E',
              color: '#110E28',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            <BellFilled />
          </div>
          <div>
            <div style={{ color: '#D2F82E', fontWeight: 800, fontSize: 11 }}>
              NEW ORDER RECEIVED
            </div>
            <div style={{ color: '#FFFFFF', fontSize: 11.5 }}>
              Almond Croissant (2x) · ₹340
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDashboardMock;
