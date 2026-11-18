import React, { useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip } from 'antd';
import { CompassOutlined, StarFilled } from '@ant-design/icons';
import ChatIcon from '../common/ChatIcon';
import CardMedia from './CardMedia';
import { useChatStore, useGlobalStore, useCartStore } from '../../services';
import { formatDistance } from '../../utils';
import { useHistory } from 'react-router-dom';
import './shop-list.css';

// Below this width of the list itself, the table cannot hold its columns and rows stack instead
const TABLE_MIN_WIDTH = 860;

const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') return null;
  return `₹${Number(value).toLocaleString('en-IN')}`;
};

const directionsFor = (name, address, directions) => {
  if (directions) return directions;
  if (!address && !name) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name || ''} ${address || ''}`.trim())}`;
};

// One shape for both stores and items, built only from fields the backend returns
const toRow = (item, searchMode) => {
  if (searchMode === 'shops') {
    return {
      key: item.id,
      id: item.id,
      ownerId: item.owner_id,
      name: item.shop_name || 'Store',
      img: item.img_url,
      rating: Number(item.rating) || 0,
      meta: item.shopCategory?.name || item.shop_type || '',
      area: item.area || '',
      address: item.address || '',
      distance: item.distance,
      directionsUrl: directionsFor(item.shop_name, item.address, item.directions),
      isShop: true,
    };
  }
  const shop = item.shop || {};
  return {
    key: item.id,
    id: shop.id,
    ownerId: shop.owner_id,
    name: item.name || 'Item',
    img: item.img_url,
    rating: Number(shop.rating) || 0,
    meta: shop.shop_name || '',
    area: shop.area || '',
    address: shop.address || '',
    distance: shop.distance,
    directionsUrl: directionsFor(shop.shop_name, shop.address, shop.directions),
    isShop: false,
    price: formatPrice(item.price),
    mrp: formatPrice(item.mrp),
    unit: item.unit || '',
    isAvailable: item.is_available !== false,
    shop,
    item,
  };
};

const ShopTableView = ({ items = [], searchMode = 'shops', onOpenMap }) => {
  const history = useHistory();
  const { handleChatOpen } = useChatStore((state) => state);
  const { user_data } = useGlobalStore((state) => state);
  const { addItem, openCart } = useCartStore((state) => state);

  const rootRef = useRef(null);
  const [width, setWidth] = useState(null);

  // Measure the list itself, not the viewport: the results column changes with the sidebar
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!items || items.length === 0) return null;

  const compact = width !== null && width < TABLE_MIN_WIDTH;
  const isShop = searchMode === 'shops';
  const rows = items.map((item) => toRow(item, searchMode));

  const openStore = (row) => {
    if (row.isShop) {
      history.push(`/shop/${row.id}`);
    }
  };

  const orderItem = (row) => {
    addItem(row.shop, row.item);
    openCart();
  };

  const renderActions = (row) => (
    <div className="rq-shop-list-actions">
      {row.isShop ? (
        <Button type="primary" onClick={() => openStore(row)}>
          View store
        </Button>
      ) : (
        <Button type="primary" disabled={!row.isAvailable} onClick={() => orderItem(row)}>
          {row.isAvailable ? 'Order' : 'Unavailable'}
        </Button>
      )}
      <Tooltip title={user_data?.user_id ? 'Chat with owner' : 'Sign in to chat'}>
        <Button
          className="rq-shop-list-icon"
          aria-label="Chat with owner"
          icon={<ChatIcon />}
          disabled={!user_data?.user_id}
          onClick={() => handleChatOpen(row.ownerId, row.id, { shop_name: row.isShop ? row.name : row.shop?.shop_name })}
        />
      </Tooltip>
      {row.directionsUrl && (
        <Button
          className="rq-shop-list-icon"
          aria-label="Get directions"
          title="Get directions"
          icon={<CompassOutlined />}
          href={row.directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
        />
      )}
    </div>
  );

  const renderRating = (row) =>
    row.rating > 0 ? (
      <span className="rq-shop-list-rating">
        <StarFilled />
        {row.rating.toFixed(1)}
      </span>
    ) : (
      <span className="rq-shop-list-muted">New</span>
    );

  const renderMapLink = (row, item) =>
    onOpenMap ? (
      <Button type="link" size="small" className="rq-shop-list-map" onClick={() => onOpenMap(item)}>
        View on map
      </Button>
    ) : null;

  if (compact) {
    return (
      <div className="rq-shop-list" ref={rootRef}>
        <div className="rq-shop-list-stack">
          {rows.map((row, index) => {
            const item = items[index];
            return (
              <article key={row.key || index} className="rq-shop-row">
                <div className="rq-shop-row-head">
                  <div className="rq-shop-row-media">
                    <CardMedia src={row.img} alt={row.name} size="sm" />
                  </div>
                  <div className="rq-shop-row-main">
                    <div className="rq-shop-list-name" title={row.name}>
                      {row.name}
                    </div>
                    <div className="rq-shop-row-line">
                      {renderRating(row)}
                      {row.meta && <span className="rq-shop-list-sub" title={row.meta}>{row.meta}</span>}
                    </div>
                    <div className="rq-shop-row-line">
                      <span className="rq-shop-list-sub" title={row.area || row.address}>
                        {row.area || row.address || 'Area not listed'}
                      </span>
                      {renderMapLink(row, item)}
                    </div>
                  </div>
                  <div className="rq-shop-row-distance">{formatDistance(row.distance) || '—'}</div>
                </div>

                {!isShop && (
                  <div className="rq-shop-row-price">
                    <span className="rq-shop-row-price-now">{row.price || 'Price on request'}</span>
                    {row.mrp && row.mrp !== row.price && <span className="rq-shop-row-price-was">{row.mrp}</span>}
                    {row.unit && <span className="rq-shop-list-muted">/ {row.unit}</span>}
                    <span className={`rq-shop-stock${row.isAvailable ? '' : ' is-out'}`}>
                      {row.isAvailable ? 'In stock' : 'Out of stock'}
                    </span>
                  </div>
                )}

                {renderActions(row)}
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rq-shop-list" ref={rootRef}>
      <div className="rq-shop-table-wrap">
        <table className={`rq-shop-table${isShop ? ' is-shops' : ' is-items'}`}>
          <thead>
            <tr>
              {isShop ? (
                <>
                  <th scope="col">Store</th>
                  <th scope="col">Location</th>
                  <th scope="col">Rating</th>
                </>
              ) : (
                <>
                  <th scope="col">Item</th>
                  <th scope="col">Store</th>
                  <th scope="col">Price</th>
                </>
              )}
              <th scope="col" className="is-num">Distance</th>
              <th scope="col" className="is-actions">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const item = items[index];
              return (
                <tr key={row.key || index}>
                  {isShop ? (
                    <>
                      <td>
                        <div className="rq-shop-list-identity">
                          <div className="rq-shop-list-avatar">
                            <CardMedia src={row.img} alt={row.name} size="sm" />
                          </div>
                          <div className="rq-shop-list-name-block">
                            <button type="button" className="rq-shop-list-name rq-shop-list-link" onClick={() => openStore(row)}>
                              {row.name}
                            </button>
                            <div className="rq-shop-list-sub" title={row.meta}>{row.meta || 'Local store'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rq-shop-list-name-block">
                          <div className="rq-shop-list-sub is-strong" title={row.area || row.address}>
                            {row.area || row.address || 'Area not listed'}
                          </div>
                          {renderMapLink(row, item)}
                        </div>
                      </td>
                      <td>{renderRating(row)}</td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div className="rq-shop-list-identity">
                          <div className="rq-shop-list-avatar">
                            <CardMedia src={row.img} alt={row.name} size="sm" />
                          </div>
                          <div className="rq-shop-list-name-block">
                            <div className="rq-shop-list-name" title={row.name}>{row.name}</div>
                            <div className="rq-shop-list-sub">
                              {row.unit ? `Sold per ${row.unit}` : 'Listed item'}
                              {' · '}
                              <span className={row.isAvailable ? 'is-in' : 'is-out'}>
                                {row.isAvailable ? 'In stock' : 'Out of stock'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rq-shop-list-name-block">
                          <div className="rq-shop-list-name" title={row.meta}>{row.meta || 'Local store'}</div>
                          <div className="rq-shop-list-sub" title={row.area}>{row.area || 'Area not listed'}</div>
                        </div>
                      </td>
                      <td>
                        <div className="rq-shop-list-price">
                          <span className="rq-shop-list-price-now">{row.price || 'On request'}</span>
                          {row.mrp && row.mrp !== row.price && <span className="rq-shop-row-price-was">{row.mrp}</span>}
                        </div>
                      </td>
                    </>
                  )}
                  <td className="is-num">{formatDistance(row.distance) || '—'}</td>
                  <td className="is-actions">{renderActions(row)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

ShopTableView.propTypes = {
  items: PropTypes.array,
  searchMode: PropTypes.oneOf(['items', 'shops']),
  onOpenMap: PropTypes.func,
};

export default ShopTableView;
