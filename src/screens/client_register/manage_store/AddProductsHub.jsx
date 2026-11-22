import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Drawer, Grid } from 'antd';
import { SearchOutlined, EditOutlined, UploadOutlined, BarcodeOutlined, RightOutlined } from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../../app/utils';
import { isCatalogueUnavailable } from '../../../app/utils/catalogue_api';
import './manage_store_catalog.css';

/**
 * Whether the master catalogue can be browsed for this shop, and roughly how many items it has.
 * status: 'loading' | 'ready' | 'unavailable' | 'error'
 */
export const useCatalogueStatus = (shopId) => {
  const [state, setState] = useState({ status: 'loading', count: null });
  useEffect(() => {
    if (!shopId) return undefined;
    let cancelled = false;
    setState({ status: 'loading', count: null });
    netWorkCall(`${apiConfig.catalog_browse}?shop_id=${encodeURIComponent(shopId)}&limit=1&offset=0`, 'GET', null, true)
      .then((res) => {
        if (cancelled) return;
        if (isCatalogueUnavailable(res)) setState({ status: 'unavailable', count: null });
        else if (Array.isArray(res?.data)) setState({ status: 'ready', count: Number(res.count) || 0 });
        else setState({ status: 'error', count: null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', count: null });
      });
    return () => {
      cancelled = true;
    };
  }, [shopId]);
  return state;
};

const approx = (n) => {
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 100) return String(n);
  if (n < 1000) return `${Math.floor(n / 50) * 50}`;
  return `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, '')}k`;
};

/** The three ways to add products, as large cards. Used in the hub sheet and the empty Products tab. */
export const HubCards = ({ catalogue, subNames, onSearchCatalogue, onCreateCustom, onImportCsv }) => {
  const unavailable = catalogue?.status === 'unavailable';
  const count = approx(catalogue?.count);
  const subText = subNames && subNames.length ? subNames.join(', ') : 'your categories';
  let catalogueSub = count ? `From ~${count} items for ${subText}` : `Ready-made items for ${subText}`;
  if (catalogue?.status === 'loading') catalogueSub = 'Checking the catalogue…';
  if (unavailable) catalogueSub = 'Catalogue not available yet';
  if (catalogue?.status === 'ready' && catalogue.count === 0) catalogueSub = `No catalogue items for ${subText} yet`;

  const cards = [
    {
      key: 'catalogue',
      icon: <SearchOutlined />,
      title: 'Search catalogue',
      sub: catalogueSub,
      onClick: onSearchCatalogue,
      disabled: unavailable,
      highlight: !unavailable,
    },
    {
      key: 'custom',
      icon: <EditOutlined />,
      title: 'Create custom',
      sub: 'For your own items, dishes or services',
      onClick: onCreateCustom,
    },
    {
      key: 'csv',
      icon: <UploadOutlined />,
      title: 'Import CSV',
      sub: 'Upload a spreadsheet (up to 500 rows)',
      onClick: onImportCsv,
    },
    {
      key: 'barcode',
      icon: <BarcodeOutlined />,
      title: 'Scan barcode',
      sub: 'Soon',
      disabled: true,
      soon: true,
    },
  ];

  return (
    <div className="mc-hub-cards">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          className={`mc-hub-card ${card.highlight ? 'is-highlight' : ''} ${card.disabled ? 'is-disabled' : ''}`}
          onClick={card.disabled ? undefined : card.onClick}
          disabled={card.disabled}
          aria-disabled={card.disabled}
        >
          <span className="mc-hub-icon" aria-hidden="true">
            {card.icon}
          </span>
          <span className="mc-hub-text">
            <span className="mc-hub-title">
              {card.title}
              {card.soon && <span className="mc-soon">Soon</span>}
            </span>
            {!card.soon && <span className="mc-hub-sub">{card.sub}</span>}
          </span>
          {!card.disabled && <RightOutlined className="mc-hub-arrow" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
};

HubCards.propTypes = {
  catalogue: PropTypes.shape({ status: PropTypes.string, count: PropTypes.number }),
  subNames: PropTypes.arrayOf(PropTypes.string),
  onSearchCatalogue: PropTypes.func,
  onCreateCustom: PropTypes.func,
  onImportCsv: PropTypes.func,
};

/** Bottom sheet on phones, right drawer on desktop (spec §F2). */
const AddProductsHub = ({ open, onClose, ...cardProps }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const pick = (fn) => () => {
    onClose();
    fn?.();
  };
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add products"
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? 'auto' : undefined}
      width={isMobile ? undefined : 440}
      rootClassName="mc-hub-drawer"
    >
      <HubCards
        {...cardProps}
        onSearchCatalogue={pick(cardProps.onSearchCatalogue)}
        onCreateCustom={pick(cardProps.onCreateCustom)}
        onImportCsv={pick(cardProps.onImportCsv)}
      />
    </Drawer>
  );
};

AddProductsHub.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  catalogue: PropTypes.object,
  subNames: PropTypes.arrayOf(PropTypes.string),
  onSearchCatalogue: PropTypes.func,
  onCreateCustom: PropTypes.func,
  onImportCsv: PropTypes.func,
};

export default AddProductsHub;
