import { useCallback, useEffect, useRef, useState } from 'react';
import { netWorkCall, apiConfig } from '../../../app/utils';
import { toQuery, apiErrorText } from '../../../app/utils/catalogue_api';

const EMPTY_SUMMARY = { total: 0, in_stock: 0, low: 0, out: 0, needs_details: 0 };

/**
 * Paged owner listings: GET listings/manage/:shop_id (spec §E2).
 * filters: { q, section_id, sub_category_id, stock, needs_details, sort }
 * Returns the loaded rows plus the shop-wide summary, with "Load more" paging.
 */
const useShopListings = (shopId, filters, { pageSize = 30, enabled = true } = {}) => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const seq = useRef(0);
  const filterKey = JSON.stringify(filters || {});

  const fetchPage = useCallback(
    async (offset, { append = false, silent = false } = {}) => {
      if (!shopId) return;
      const id = ++seq.current;
      if (append) setLoadingMore(true);
      else if (!silent) setLoading(true);
      setError('');
      try {
        const query = toQuery({ ...JSON.parse(filterKey), limit: pageSize, offset });
        const res = await netWorkCall(`${apiConfig.listings_manage}/${shopId}${query}`, 'GET', null, true);
        if (id !== seq.current) return;
        if (res?.success && Array.isArray(res.data)) {
          setItems((prev) => {
            if (!append) return res.data;
            const seen = new Set(prev.map((i) => i.id));
            return [...prev, ...res.data.filter((i) => !seen.has(i.id))];
          });
          setTotal(Number(res.total) || 0);
          if (res.summary) setSummary({ ...EMPTY_SUMMARY, ...res.summary });
        } else {
          setError(apiErrorText(res, 'Could not load your products.'));
        }
      } catch (err) {
        if (id === seq.current) setError('Could not load your products. Check your connection.');
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setLoadingMore(false);
          setLoaded(true);
        }
      }
    },
    [shopId, filterKey, pageSize]
  );

  // A new shop or new filters start from the first page
  useEffect(() => {
    if (!enabled) return;
    fetchPage(0);
  }, [fetchPage, enabled]);

  useEffect(() => {
    setItems([]);
    setTotal(0);
    setSummary(EMPTY_SUMMARY);
    setLoaded(false);
  }, [shopId]);

  const reload = useCallback(({ silent = true } = {}) => fetchPage(0, { silent }), [fetchPage]);
  const loadMore = useCallback(() => fetchPage(items.length, { append: true }), [fetchPage, items.length]);

  /** Merge updated rows in place (after an edit or inventory save). */
  const mergeItems = useCallback((updated) => {
    const list = (Array.isArray(updated) ? updated : [updated]).filter((u) => u && u.id);
    if (list.length === 0) return;
    const byId = new Map(list.map((u) => [u.id, u]));
    setItems((prev) => prev.map((i) => (byId.has(i.id) ? { ...i, ...byId.get(i.id) } : i)));
  }, []);

  /** Local-only change for optimistic updates. */
  const patchItem = useCallback((id, patch) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const removeItems = useCallback((ids) => {
    const set = new Set(ids);
    setItems((prev) => prev.filter((i) => !set.has(i.id)));
    setTotal((t) => Math.max(0, t - set.size));
  }, []);

  return {
    items,
    total,
    summary,
    loading,
    loadingMore,
    loaded,
    error,
    hasMore: items.length < total,
    reload,
    loadMore,
    mergeItems,
    patchItem,
    removeItems,
  };
};

export default useShopListings;
