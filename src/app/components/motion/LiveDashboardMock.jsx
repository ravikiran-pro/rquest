import React, { useState, useEffect } from 'react';
import { ArrowUpOutlined, CoffeeOutlined, BellFilled } from '@ant-design/icons';

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
          padding: '10px 14px',
          borderBottom: '1px solid #EADBCC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <div className="chrome-traffic-lights" style={{ flexShrink: 0 }}>
            <span className="chrome-dot" style={{ background: '#EF4444' }} />
            <span className="chrome-dot" style={{ background: '#F59E0B' }} />
            <span className="chrome-dot" style={{ background: '#10B981' }} />
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#2A2620',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Sunrise Bakehouse Console
          </span>
        </div>

        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#15803D',
            background: '#DCFCE7',
            padding: '2px 7px',
            borderRadius: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#15803D' }} />
          Live Radar
        </span>
      </div>

      {/* Metrics Row */}
      <div style={{ padding: '14px 12px', background: '#FFFFFF' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
          <div style={{ background: '#FAF6F0', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' }}>Orders Today</div>
            <div style={{ fontSize: 'clamp(13px, 3.6vw, 17px)', fontWeight: 800, color: '#2A2620', marginTop: 2, whiteSpace: 'nowrap' }}>
              {ordersCount}{' '}
              <span style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>
                <ArrowUpOutlined style={{ fontSize: 8 }} /> 12%
              </span>
            </div>
          </div>

          <div style={{ background: '#FAF6F0', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' }}>Revenue</div>
            <div style={{ fontSize: 'clamp(13px, 3.6vw, 17px)', fontWeight: 800, color: '#2A2620', marginTop: 2, whiteSpace: 'nowrap' }}>
              ₹{revenue.toLocaleString()}
            </div>
          </div>

          <div style={{ background: '#ECFDF5', borderRadius: 10, padding: '8px 6px', border: '1px solid #A7F3D0', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#047857', fontWeight: 700, whiteSpace: 'nowrap' }}>Saved Cut</div>
            <div style={{ fontSize: 'clamp(13px, 3.6vw, 17px)', fontWeight: 800, color: '#047857', marginTop: 2, whiteSpace: 'nowrap' }}>
              0% Fee
            </div>
          </div>
        </div>

        {/* Live Order Row */}
        <div
          style={{
            background: '#FAF6F0',
            borderRadius: 10,
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            fontSize: 11.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <CoffeeOutlined style={{ fontSize: 13, color: '#78716C', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#2A2620', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Multi-grain boule (2x)
              </div>
              <div style={{ fontSize: 10, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                0.4 km away
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: '#E0F2FE',
              color: '#0284C7',
              padding: '2px 7px',
              borderRadius: 9999,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Ready
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
              background: '#E2A63D',
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
            <div style={{ color: '#E2A63D', fontWeight: 800, fontSize: 11 }}>
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
