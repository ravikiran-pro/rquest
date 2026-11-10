import React from 'react';
import PropTypes from 'prop-types';
import {
  ShopOutlined,
  TagOutlined,
  CompassOutlined,
  SlidersOutlined,
  WalletOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { MerchantHero, ShopperHero } from '../../app/components/assets';

export const GoogleIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.16z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.34 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.99 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const TruecallerIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <circle cx="12" cy="12" r="12" fill="#0087FF" />
    <path
      d="M7.5 8.5C7.5 7.67 8.17 7 9 7H10.5C10.9 7 11.25 7.24 11.4 7.61L12.2 9.87C12.33 10.22 12.23 10.62 11.94 10.86L10.94 11.71C11.65 13.15 12.81 14.31 14.25 15.02L15.1 13.99C15.34 13.7 15.74 13.6 16.09 13.74L18.35 14.65C18.72 14.8 18.96 15.16 18.96 15.56V17.26C18.96 18.09 18.29 18.76 17.46 18.76C11.79 18.76 7.5 14.47 7.5 8.5Z"
      fill="white"
    />
  </svg>
);

export const WhatsAppIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="#25D366"
    style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.07 7.42C8.91 7.42 8.75 7.43 8.61 7.44C8.42 7.46 8.24 7.56 8.14 7.74C7.96 8.04 7.38 8.67 7.38 9.87C7.38 11.07 8.25 12.22 8.37 12.38C8.5 12.54 10.07 14.96 12.5 16C14.5 16.87 14.92 16.7 15.36 16.66C15.96 16.6 17.26 15.89 17.53 15.13C17.8 14.37 17.8 13.72 17.72 13.58C17.64 13.44 17.48 13.36 17.24 13.24C17 13.12 15.82 12.54 15.6 12.46C15.38 12.38 15.22 12.34 15.06 12.58C14.86 12.87 14.37 13.44 14.21 13.62C14.05 13.8 13.89 13.82 13.65 13.7C13.41 13.58 12.63 13.33 11.71 12.51C10.99 11.87 10.5 11.08 10.38 10.84C10.26 10.6 10.37 10.47 10.49 10.35C10.6 10.24 10.74 10.06 10.86 9.92C10.98 9.78 11.02 9.68 11.1 9.52C11.18 9.36 11.14 9.22 11.08 9.1C11.02 8.98 10.54 7.8 10.34 7.32C10.14 6.84 9.94 6.9 9.79 6.9C9.65 6.9 9.49 6.9 9.33 6.9L9.07 7.42Z" />
  </svg>
);

const CONTEXT_CONTENT = {
  shopper: {
    headline: 'Your neighbourhood has what you need.',
    subtitle:
      "Find nearby shops, check what's available and buy directly from the people who run them.",
    features: [
      {
        key: 'nearby',
        title: 'Shops just around the corner',
        desc: 'Discover kiranas, food stores and local services near you.',
        tone: 'navy',
        icon: <ShopOutlined />,
      },
      {
        key: 'price',
        title: "The same price you'd pay in store",
        desc: 'No additional marketplace markup. Pay the shop directly.',
        tone: 'amber',
        icon: <TagOutlined />,
      },
      {
        key: 'check',
        title: 'Check before you visit',
        desc: "Know what's available at your nearby stores.",
        tone: 'navy',
        icon: <CheckCircleOutlined />,
      },
    ],
  },
  merchant: {
    headline: 'Your shop deserves to be found.',
    subtitle:
      'Put your store in front of nearby customers. List your products, receive orders and connect directly with your neighbourhood.',
    features: [
      {
        key: 'reach',
        title: 'Reach more local customers',
        desc: 'Help people nearby discover your store.',
        tone: 'navy',
        icon: <CompassOutlined />,
      },
      {
        key: 'control',
        title: "You're in control",
        desc: 'Manage your products, availability and prices.',
        tone: 'amber',
        icon: <SlidersOutlined />,
      },
      {
        key: 'paid',
        title: 'Get paid directly',
        desc: 'Receive payments without marketplace commission.',
        tone: 'navy',
        icon: <WalletOutlined />,
      },
    ],
  },
};

export const AuthLeftShowcase = ({
  audience = 'shopper',
  photoVariant,
}) => {
  const isMerchant = audience === 'merchant';
  const copy = isMerchant ? CONTEXT_CONTENT.merchant : CONTEXT_CONTENT.shopper;

  // Use real shopkeeper photo for Store Owner (or explicit storekeeper variant on Login),
  // and real neighbourhood shopper photo when Shopper / Neighbour is selected.
  const useMerchantPhoto =
    photoVariant === 'merchant' || (photoVariant !== 'shopper' && isMerchant);
  const photoSrc = useMerchantPhoto ? MerchantHero : ShopperHero;
  const photoAlt = useMerchantPhoto
    ? 'Local store owner arranging products in their neighbourhood shop'
    : 'Shopper choosing fresh produce at a local neighbourhood market';

  return (
    <div className="rq-auth-showcase-col">
      <div className="rq-showcase-content-pad">
        {/* Clean Minimal Editorial Copy — Spoken Directly to the Selected Audience */}
        <div className="rq-showcase-hero-copy">
          <h1 className="rq-showcase-title">{copy.headline}</h1>
          <p className="rq-showcase-desc">{copy.subtitle}</p>
        </div>

        {/* Minimal List Items */}
        <div className="rq-showcase-features-list">
          {copy.features.map((feat) => (
            <div key={feat.key} className="rq-showcase-feature-row">
              <div className={`rq-feature-icon-tile tone-${feat.tone}`}>
                {feat.icon}
              </div>
              <div className="rq-feature-text-col">
                <div className="rq-feature-title">{feat.title}</div>
                <div className="rq-feature-desc">{feat.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real Neighbourhood Photograph Feathered Cleanly into Warm Parchment Ground */}
      <div className="rq-showcase-photo-wrap">
        <img
          src={photoSrc}
          alt={photoAlt}
          className={`rq-showcase-photo-img ${useMerchantPhoto ? 'focus-merchant' : 'focus-shopper'}`}
        />
        <div className="rq-showcase-photo-feather" aria-hidden="true" />
      </div>
    </div>
  );
};

AuthLeftShowcase.propTypes = {
  audience: PropTypes.oneOf(['shopper', 'merchant']),
  photoVariant: PropTypes.oneOf(['shopper', 'merchant']),
};

export const AuthSocialButtons = ({ onSocialAction }) => (
  <>
    <div className="rq-auth-divider">
      <span className="rq-auth-divider-line" />
      <span className="rq-auth-divider-text">OR CONTINUE WITH</span>
      <span className="rq-auth-divider-line" />
    </div>

    <div className="rq-auth-social-row">
      <button
        type="button"
        className="rq-social-btn"
        onClick={() => onSocialAction('Truecaller')}
      >
        <TruecallerIcon />
        <span>Truecaller</span>
      </button>

      <button
        type="button"
        className="rq-social-btn"
        onClick={() => onSocialAction('Google')}
      >
        <GoogleIcon />
        <span>Google</span>
      </button>
    </div>
  </>
);

AuthSocialButtons.propTypes = {
  onSocialAction: PropTypes.func.isRequired,
};
