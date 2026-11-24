import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Drawer, Empty, Grid, Row, Skeleton } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { usePagedShopListings } from './useStorefrontSections';
import './storefront.css';

/**
 * A paged grid of one store's listings with infinite scroll (30 at a time).
 * Used for search results and for a section's "See all".
 */
export const PagedListingGrid = ({ shopId, q, sectionId, renderItem, filterItem, gutter, emptyText, header }) => {
  const list = usePagedShopListings(shopId, { q, sectionId }, { pageSize: 30 });
  const sentinel = useRef(null);
  const { hasMore, loading, loadingMore, loadMore, items } = list;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading || loadingMore || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), { rootMargin: '400px 0px' });
    io.observe(el);
    return () => io.disconnect();
    // loadMore changes with the item count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, loadingMore, items.length]);

  const visible = items.filter(filterItem);

  if (list.loading && !list.loaded) {
    return (
      <div className="sf-block-skeleton">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} active avatar={{ shape: 'square', size: 76 }} paragraph={{ rows: 2 }} />
        ))}
      </div>
    );
  }
  if (list.error && items.length === 0) {
    return (
      <Alert
        type="error"
        showIcon
        message={list.error}
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={list.reload}>
            Retry
          </Button>
        }
      />
    );
  }
  return (
    <>
      {header && header(list.total)}
      {visible.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      ) : (
        <Row gutter={gutter}>{visible.map(renderItem)}</Row>
      )}
      <div ref={sentinel} style={{ height: 1 }} />
      {hasMore && (
        <div className="sf-more">
          <Button onClick={loadMore} loading={loadingMore}>
            Show more
          </Button>
        </div>
      )}
    </>
  );
};

PagedListingGrid.propTypes = {
  shopId: PropTypes.string.isRequired,
  q: PropTypes.string,
  sectionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  renderItem: PropTypes.func.isRequired,
  filterItem: PropTypes.func.isRequired,
  gutter: PropTypes.array,
  emptyText: PropTypes.string,
  header: PropTypes.func,
};

/** "See all" for one section: a full-height sheet on phones, a wide drawer on desktop. */
const SectionGridDrawer = ({ shopId, section, onClose, renderItem, filterItem, gutter }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  return (
    <Drawer
      open={Boolean(section)}
      onClose={onClose}
      title={section ? `${section.name} (${section.count})` : ''}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '100%' : undefined}
      width={isMobile ? undefined : 'min(1000px, 92vw)'}
      destroyOnClose
      rootClassName="sf-grid-drawer"
    >
      {section && (
        <PagedListingGrid
          shopId={shopId}
          sectionId={section.id}
          renderItem={renderItem}
          filterItem={filterItem}
          gutter={gutter}
          emptyText="No items in this section"
        />
      )}
    </Drawer>
  );
};

SectionGridDrawer.propTypes = {
  shopId: PropTypes.string.isRequired,
  section: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  renderItem: PropTypes.func.isRequired,
  filterItem: PropTypes.func.isRequired,
  gutter: PropTypes.array,
};

export default SectionGridDrawer;
