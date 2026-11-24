import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Row, Skeleton } from 'antd';
import { RightOutlined, ReloadOutlined } from '@ant-design/icons';
import './storefront.css';

/**
 * One storefront section: title, count, up to 10 cards and "See all (n)".
 * Blocks that were not prefetched load when they come within one viewport (spec §F9).
 */
const SectionBlock = ({ section, renderItem, filterItem, onNeedItems, onSeeAll, gutter }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (section.loaded || section.loading || section.error) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      onNeedItems(section.id);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          onNeedItems(section.id);
        }
      },
      { rootMargin: '100% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [section.loaded, section.loading, section.error, section.id, onNeedItems]);

  const items = (section.items || []).filter(filterItem);
  const hiddenByFilter = (section.items || []).length - items.length;

  return (
    <section ref={ref} id={`sf-sec-${section.id}`} data-section-id={String(section.id)} className="sf-block" aria-labelledby={`sf-sec-title-${section.id}`}>
      <div className="sf-block-head">
        <h2 id={`sf-sec-title-${section.id}`} className="sf-block-title">
          {section.name}
          <span className="sf-block-count">{section.count}</span>
        </h2>
        {section.count > (section.items || []).length && section.loaded && (
          <Button type="link" onClick={() => onSeeAll(section)} className="sf-see-all">
            See all ({section.count}) <RightOutlined />
          </Button>
        )}
      </div>

      {!section.loaded && !section.error && (
        <div className="sf-block-skeleton">
          <Skeleton active avatar={{ shape: 'square', size: 76 }} paragraph={{ rows: 2 }} />
          <Skeleton active avatar={{ shape: 'square', size: 76 }} paragraph={{ rows: 2 }} />
        </div>
      )}

      {section.error && (
        <div className="sf-block-error" role="alert">
          <span>{section.error}</span>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => onNeedItems(section.id, { retry: true })}>
            Retry
          </Button>
        </div>
      )}

      {section.loaded && items.length > 0 && <Row gutter={gutter}>{items.map(renderItem)}</Row>}
      {section.loaded && items.length === 0 && hiddenByFilter > 0 && (
        <div className="sf-block-empty">No items here match your filters.</div>
      )}
    </section>
  );
};

SectionBlock.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    name: PropTypes.string,
    count: PropTypes.number,
    items: PropTypes.array,
    loaded: PropTypes.bool,
    loading: PropTypes.bool,
    error: PropTypes.string,
  }).isRequired,
  renderItem: PropTypes.func.isRequired,
  filterItem: PropTypes.func.isRequired,
  onNeedItems: PropTypes.func.isRequired,
  onSeeAll: PropTypes.func.isRequired,
  gutter: PropTypes.array,
};

export default SectionBlock;
