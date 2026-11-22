import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Checkbox, Drawer, Empty, Grid, Input, Progress, Result, Skeleton, message } from 'antd';
import { SearchOutlined, ReloadOutlined, ArrowLeftOutlined, CheckCircleFilled, WarningOutlined } from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../../app/utils';
import { getShopSubCategoryIds } from '../../../app/utils/shopSubCategories';
import { toQuery, apiErrorText, codeText, fetchResolvedForm, isCatalogueUnavailable } from '../../../app/utils/catalogue_api';
import { CatalogueFacts } from '../../../app/components/listings/SchemaField';
import BulkAddSheet, { initialRow, rowProblems, hasProblems } from './BulkAddSheet';
import { ListingThumb } from './ListingBits';
import './manage_store_catalog.css';

const PAGE = 30;
const MAX_SELECTED = 200;
const PUBLISH_BATCH = 50;

const problemText = (p) =>
  [p.price, p.stock, ...Object.values(p.fields || {}), ...Object.values(p.statutory || {})].filter(Boolean).join(' · ');

/**
 * Catalogue picker (spec §F3): tick items into a tray, fill one sheet of store-only
 * fields, review, then publish through catalog/import-bulk in batches of 50.
 */
const CataloguePicker = ({ open, onClose, shop, sections, subCategories, onCreateCustom, onPublished }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const shopId = shop?.id;
  const subIds = useMemo(() => getShopSubCategoryIds(shop), [shop]);

  const [step, setStep] = useState('pick');
  const [searchText, setSearchText] = useState('');
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('all');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const seq = useRef(0);
  const sentinelRef = useRef(null);

  const [selected, setSelected] = useState(() => new Map());
  const [rows, setRows] = useState({});
  const [forms, setForms] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  // Fresh start each time the picker opens
  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setSearchText('');
    setQ('');
    setScope('all');
    setSelected(new Map());
    setRows({});
    setServerErrors({});
    setShowErrors(false);
    setResult(null);
    setProgress(0);
  }, [open, shopId]);

  useEffect(() => {
    const t = setTimeout(() => setQ(searchText.trim()), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  /* ---------- Browse ---------- */
  const fetchPage = async (offset) => {
    if (!shopId) return;
    const id = ++seq.current;
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const query = toQuery({ shop_id: shopId, sub_category_id: scope, q: q || undefined, limit: PAGE, offset });
      const res = await netWorkCall(`${apiConfig.catalog_browse}${query}`, 'GET', null, true);
      if (id !== seq.current) return;
      if (isCatalogueUnavailable(res)) {
        setUnavailable(true);
        setResults([]);
        setTotal(0);
      } else if (Array.isArray(res?.data)) {
        setUnavailable(false);
        setResults((prev) => (offset === 0 ? res.data : [...prev, ...res.data.filter((r) => !prev.some((p) => p.id === r.id))]));
        setTotal(Number(res.count) || 0);
      } else {
        setError(apiErrorText(res, 'Could not load the catalogue.'));
      }
    } catch (err) {
      if (id === seq.current) setError('Could not reach the catalogue. Check your connection.');
    } finally {
      if (id === seq.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    if (open && step === 'pick') fetchPage(0);
    // fetchPage reads the current filters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shopId, q, scope, reloadTick]);

  const hasMore = results.length < total;

  // Infinite scroll: load the next page when the end of the list comes into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || loadingMore || step !== 'pick' || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) fetchPage(results.length);
      },
      { rootMargin: '200px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, loadingMore, results.length, step]);

  /* ---------- Selection ---------- */
  const toggle = (item, checked) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) {
        if (next.size >= MAX_SELECTED) {
          message.warning(`You can add up to ${MAX_SELECTED} items at a time`);
          return prev;
        }
        next.set(item.id, item);
      } else next.delete(item.id);
      return next;
    });
  };

  const selectedItems = useMemo(() => Array.from(selected.values()), [selected]);

  const goToSheet = () => {
    setRows((prev) => {
      const next = { ...prev };
      selectedItems.forEach((item) => {
        if (!next[item.id]) next[item.id] = initialRow(item, { subIds, sections });
      });
      return next;
    });
    setStep('sheet');
  };

  // Forms of the sub-categories in the sheet, for their required store fields
  useEffect(() => {
    if (step !== 'sheet' || !shopId) return;
    const needed = new Set(Object.values(rows).map((r) => r.sub_category_id).filter((id) => id !== null && id !== undefined));
    needed.forEach((subId) => {
      if (forms[subId]) return;
      fetchResolvedForm(shopId, subId)
        .then((data) => setForms((f) => ({ ...f, [subId]: data })))
        .catch(() => setForms((f) => ({ ...f, [subId]: { fields: [] } })));
    });
  }, [step, rows, shopId, forms]);

  const changeRow = (id, patch) => {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setServerErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const removeRow = (id) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.delete(id);
      if (next.size === 0) setStep('pick');
      return next;
    });
  };

  /* ---------- Review & publish ---------- */
  const reviewed = useMemo(
    () => selectedItems.map((item) => ({ item, problems: rows[item.id] ? rowProblems(rows[item.id], forms) : { price: 'Enter a price' } })),
    [selectedItems, rows, forms]
  );
  const ready = reviewed.filter((r) => !hasProblems(r.problems));
  const needFix = reviewed.filter((r) => hasProblems(r.problems));
  // Rx / Schedule H answers are needed before Review (see BulkAddSheet rowProblems)
  const statutoryPending = reviewed.some((r) => r.problems.statutory);

  const publish = async () => {
    if (ready.length === 0) return;
    setPublishing(true);
    setProgress(0);
    const created = [];
    const skipped = [];
    let failure = null;
    let sentUpTo = 0;
    const payloadItems = ready.map(({ item }) => {
      const row = rows[item.id];
      return {
        item_id: item.id,
        price: Number(row.price),
        ...(row.mrp !== null && row.mrp !== undefined ? { mrp: Number(row.mrp) } : {}),
        ...(row.sub_category_id ? { sub_category_id: row.sub_category_id } : {}),
        ...(row.section_id ? { section_id: row.section_id } : {}),
        stock_mode: row.stock_mode,
        ...(row.stock_mode === 'tracked'
          ? { stock_qty: Number(row.stock_qty), ...(row.low_stock_threshold !== null ? { low_stock_threshold: Number(row.low_stock_threshold) } : {}) }
          : {}),
        metadata: row.metadata || {},
        statutory: row.statutory || {},
      };
    });
    for (let start = 0; start < payloadItems.length; start += PUBLISH_BATCH) {
      const batch = payloadItems.slice(start, start + PUBLISH_BATCH);
      try {
        const res = await netWorkCall(
          apiConfig.catalog_import_bulk,
          'POST',
          JSON.stringify({ shop_id: shopId, defaults: { section_id: null }, items: batch }),
          true
        );
        if (isCatalogueUnavailable(res)) {
          failure = 'Catalogue not available yet. Nothing more was added.';
          break;
        }
        if (!Array.isArray(res?.created)) {
          failure = apiErrorText(res, 'Some items could not be added. Try again.');
          break;
        }
        created.push(...res.created);
        skipped.push(...(Array.isArray(res.skipped) ? res.skipped : []));
        sentUpTo = start + batch.length;
      } catch (err) {
        failure = 'Network error. Some items may not have been added. Check your store before trying again.';
        break;
      }
      setProgress(Math.min(start + PUBLISH_BATCH, payloadItems.length));
    }
    setPublishing(false);
    const createdIds = new Set(created.map((c) => (c && typeof c === 'object' ? c.item_id : c)));
    setResult({
      created: created.length,
      skipped: skipped.map((s) => ({ ...s, name: selected.get(s.item_id)?.name || s.item_id })),
      unsent: payloadItems.slice(sentUpTo).map((p) => p.item_id),
      failure,
    });
    // Created items leave the tray; skipped ones stay for "Fix and retry"
    setSelected((prev) => {
      const next = new Map(prev);
      createdIds.forEach((id) => next.delete(id));
      return next;
    });
    setStep('result');
    if (created.length > 0) onPublished?.(created.length);
  };

  const fixAndRetry = () => {
    const errs = {};
    (result?.skipped || []).forEach((s) => {
      if (s.reason !== 'already_added' && s.reason !== 'not_found') errs[s.item_id] = s;
    });
    setSelected((prev) => {
      const next = new Map();
      prev.forEach((item, id) => {
        if (errs[id] || (result?.unsent || []).includes(id) || needFix.some((n) => n.item.id === id)) next.set(id, item);
      });
      return next;
    });
    setServerErrors(errs);
    setShowErrors(true);
    setStep('sheet');
  };

  /* ---------- Render ---------- */
  const scopeChips = [{ id: 'all', name: 'All my categories' }, ...subCategories];

  const renderCard = (item) => {
    const inStore = Boolean(item.already_added);
    const checked = selected.has(item.id);
    const meta = [item.brand, item.size || item.quantity_label, item.unit].filter(Boolean).join(' · ');
    const content = (
      <>
        <ListingThumb src={item.image_url} alt="" className="mc-pick-thumb" />
        <div className="mc-pick-body">
          <div className="mc-pick-name">{item.name}</div>
          {meta && <div className="ms-muted">{meta}</div>}
          <CatalogueFacts facts={item.facts} max={2} />
        </div>
      </>
    );
    if (inStore) {
      return (
        <div key={item.id} className="mc-pick-card is-in-store">
          {content}
          <span className="mc-in-store">
            <CheckCircleFilled aria-hidden="true" /> In your store
          </span>
        </div>
      );
    }
    return (
      <label key={item.id} className={`mc-pick-card ${checked ? 'is-checked' : ''}`}>
        {content}
        <Checkbox checked={checked} onChange={(e) => toggle(item, e.target.checked)} aria-label={`Select ${item.name}`} />
      </label>
    );
  };

  const renderPick = () => {
    if (unavailable) {
      return (
        <Result
          status="info"
          title="Catalogue not available yet"
          subTitle="You can still create custom items or import a CSV."
          extra={
            <Button type="primary" className="ms-btn-primary" onClick={() => onCreateCustom?.('')}>
              Create custom item
            </Button>
          }
        />
      );
    }
    return (
      <>
        <div className="mc-pick-top">
          <Input
            allowClear
            size="large"
            prefix={<SearchOutlined className="ms-muted" />}
            placeholder="Search by name or brand"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Search the catalogue"
            maxLength={100}
          />
          {subCategories.length > 1 && (
            <div className="mc-chips" role="radiogroup" aria-label="Category">
              {scopeChips.map((s) => {
                const on = String(scope) === String(s.id);
                return (
                  <button key={s.id} type="button" role="radio" aria-checked={on} className={`lc-chip ${on ? 'is-active' : ''}`} onClick={() => setScope(s.id)}>
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && results.length === 0 ? (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" icon={<ReloadOutlined />} onClick={() => setReloadTick((n) => n + 1)}>
                Retry
              </Button>
            }
          />
        ) : loading ? (
          <div className="mc-pick-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mc-pick-card">
                <Skeleton active avatar={{ shape: 'square', size: 56 }} title={{ width: '70%' }} paragraph={{ rows: 1, width: '40%' }} />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={q ? `No match for "${q}" in your categories.` : 'No catalogue items for your categories yet.'}>
            <Button type="link" onClick={() => onCreateCustom?.(q)}>
              Create it as a custom item
            </Button>
          </Empty>
        ) : (
          <>
            <div className="ms-muted mc-pick-count">{total} items</div>
            <div className="mc-pick-grid">{results.map(renderCard)}</div>
            <div ref={sentinelRef} className="mc-sentinel" />
            {hasMore && (
              <div className="ms-list-footer">
                <Button onClick={() => fetchPage(results.length)} loading={loadingMore}>
                  Load more
                </Button>
              </div>
            )}
            {error && <Alert type="warning" showIcon message={error} style={{ marginTop: 8 }} />}
          </>
        )}
      </>
    );
  };

  const renderReview = () => (
    <div className="mc-review">
      <Alert
        type={needFix.length ? 'warning' : 'success'}
        showIcon
        message={`${ready.length} ready · ${needFix.length} need fixing`}
        description={needFix.length ? 'Items that need fixing are not published. Go back to fix them, or publish the rest now.' : undefined}
      />
      {needFix.length > 0 && (
        <ul className="mc-review-list is-fix">
          {needFix.map(({ item, problems }) => (
            <li key={item.id}>
              <WarningOutlined aria-hidden="true" /> <strong>{item.name}</strong>
              <span className="ms-muted"> · {problemText(problems)}</span>
            </li>
          ))}
        </ul>
      )}
      <ul className="mc-review-list">
        {ready.map(({ item }) => {
          const row = rows[item.id];
          return (
            <li key={item.id}>
              <strong>{item.name}</strong>
              <span className="ms-muted">
                {' '}
                · ₹{row.price}
                {row.stock_mode === 'tracked' ? ` · ${row.stock_qty} in stock` : row.stock_mode === 'always' ? ' · Always available' : ' · On/Off'}
              </span>
            </li>
          );
        })}
      </ul>
      {publishing && <Progress percent={Math.round((progress / Math.max(ready.length, 1)) * 100)} size="small" />}
    </div>
  );

  const renderResult = () => {
    const skipped = result?.skipped || [];
    const fixable = skipped.filter((s) => s.reason !== 'already_added' && s.reason !== 'not_found').length + (result?.unsent?.length || 0);
    return (
      <div className="mc-review">
        <Result
          status={result.created > 0 ? 'success' : 'warning'}
          title={`${result.created} added · ${skipped.length + (result.unsent?.length || 0)} skipped`}
          subTitle={result.created > 0 ? 'They are live on your storefront now.' : undefined}
        />
        {result.failure && <Alert type="error" showIcon message={result.failure} style={{ marginBottom: 12 }} />}
        {skipped.length > 0 && (
          <ul className="mc-review-list is-fix">
            {skipped.map((s) => (
              <li key={`${s.item_id}-${s.reason}`}>
                <strong>{s.name}</strong>
                <span className="ms-muted">
                  {' '}
                  · {Array.isArray(s.errors) && s.errors.length ? s.errors.map((e) => e.message).join('. ') : s.message || codeText(s.reason, 'Could not be added')}
                </span>
              </li>
            ))}
          </ul>
        )}
        {fixable === 0 && skipped.length > 0 && <div className="ms-muted">Items already in your store were left as they are.</div>}
      </div>
    );
  };

  const fixableCount = result
    ? result.skipped.filter((s) => s.reason !== 'already_added' && s.reason !== 'not_found').length + (result.unsent?.length || 0)
    : 0;

  const footer = (() => {
    if (step === 'pick') {
      return (
        <div className="mc-tray">
          <span className="mc-tray-count">{selected.size} selected</span>
          {selected.size > 0 && (
            <Button type="text" onClick={() => setSelected(new Map())}>
              Clear
            </Button>
          )}
          <Button type="primary" className="ms-btn-primary" disabled={selected.size === 0} onClick={goToSheet}>
            Next
          </Button>
        </div>
      );
    }
    if (step === 'sheet') {
      return (
        <div className="mc-tray">
          <Button icon={<ArrowLeftOutlined />} onClick={() => setStep('pick')}>
            Add more
          </Button>
          <Button
            type="primary"
            className="ms-btn-primary"
            disabled={statutoryPending}
            onClick={() => {
              setShowErrors(true);
              setStep('review');
            }}
          >
            Review {selected.size}
          </Button>
        </div>
      );
    }
    if (step === 'review') {
      return (
        <div className="mc-tray">
          <Button icon={<ArrowLeftOutlined />} onClick={() => setStep('sheet')} disabled={publishing}>
            Back
          </Button>
          <Button type="primary" className="ms-btn-primary" onClick={publish} loading={publishing} disabled={ready.length === 0}>
            {publishing ? `Publishing ${progress}/${ready.length}` : `Publish ${ready.length}`}
          </Button>
        </div>
      );
    }
    return (
      <div className="mc-tray">
        {fixableCount > 0 && <Button onClick={fixAndRetry}>Fix and retry</Button>}
        <Button type="primary" className="ms-btn-primary" onClick={onClose}>
          Done
        </Button>
      </div>
    );
  })();

  const titles = { pick: 'Search catalogue', sheet: 'Price and stock', review: 'Review', result: 'Done' };

  return (
    <Drawer
      open={open}
      onClose={publishing ? undefined : onClose}
      closable={!publishing}
      maskClosable={!publishing && selected.size === 0}
      title={titles[step]}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '100%' : undefined}
      width={isMobile ? undefined : 760}
      rootClassName="mc-picker"
      footer={footer}
      destroyOnClose
    >
      {step === 'pick' && renderPick()}
      {step === 'sheet' && (
        <BulkAddSheet
          items={selectedItems}
          rows={rows}
          onRowChange={changeRow}
          onRemove={removeRow}
          sections={sections}
          subCategories={subCategories}
          forms={forms}
          serverErrors={serverErrors}
          showErrors={showErrors}
          isMobile={isMobile}
        />
      )}
      {step === 'review' && renderReview()}
      {step === 'result' && result && renderResult()}
    </Drawer>
  );
};

CataloguePicker.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  shop: PropTypes.object.isRequired,
  sections: PropTypes.array.isRequired,
  subCategories: PropTypes.array.isRequired,
  onCreateCustom: PropTypes.func,
  onPublished: PropTypes.func,
};

export default CataloguePicker;
