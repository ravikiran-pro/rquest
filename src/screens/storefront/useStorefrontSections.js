import { useCallback, useEffect, useRef, useState } from 'react';
import { netWorkCall, apiConfig } from '../../app/utils';
import { toQuery, apiErrorText } from '../../app/utils/catalogue_api';

export const PER_SECTION = 10;
// Listings with no section render in a virtual block at the end (spec §C4)
export const UNSECTIONED_ID = 'none';

/**
 * Storefront sections: GET listings/shop/:shop_id/storefront (spec §E2), then each block's
 * first items on demand through the paged list with section_id.
 */
export const useStorefront = (shopId) => {
  const [state, setState] = useState({ status: 'loading', error: '', total: 0, filterFields: [], forms: {} });
  const [sections, setSections] = useState([]);
  const seq = useRef(0);
  const inflight = useRef(new Set());

  const load = useCallback(async () => {
    if (!shopId) return;
    const id = ++seq.current;
    inflight.current = new Set();
    setState((s) => ({ ...s, status: 'loading', error: '' }));
    try {
      const res = await netWorkCall(`${apiConfig.listings_storefront}/${shopId}/storefront?per_section=${PER_SECTION}&prefetch=3`, 'GET', null, false);
      if (id !== seq.current) return;
      if (!res?.success || !Array.isArray(res.sections)) {
        setState((s) => ({ ...s, status: 'error', error: apiErrorText(res, 'Could not load this store.') }));
        return;
      }
      const list = res.sections.map((sec) => {
        const items = Array.isArray(sec.items) ? sec.items : [];
        return { ...sec, items, loaded: items.length > 0 || !sec.count, loading: false, error: '' };
      });
      const unsectioned = Number(res.unsectioned_count) || 0;
      if (unsectioned > 0) {
        list.push({ id: UNSECTIONED_ID, name: 'More items', count: unsectioned, items: [], loaded: false, loading: false, error: '', virtual: true });
      }
      setSections(list);
      setState({
        status: 'ready',
        error: '',
        total: Number(res.total) || list.reduce((n, s) => n + (Number(s.count) || 0), 0),
        filterFields: Array.isArray(res.filter_fields) ? res.filter_fields : [],
        forms: res.forms && typeof res.forms === 'object' ? res.forms : {},
      });
    } catch (err) {
      if (id === seq.current) setState((s) => ({ ...s, status: 'error', error: 'Could not load this store. Check your connection.' }));
    }
  }, [shopId]);

  useEffect(() => {
    setSections([]);
    load();
  }, [load]);

  /** First items of a block that was not prefetched. */
  const loadSection = useCallback(
    async (sectionId) => {
      if (!shopId || inflight.current.has(sectionId)) return;
      inflight.current.add(sectionId);
      const id = seq.current;
      setSections((list) => list.map((s) => (s.id === sectionId ? { ...s, loading: true, error: '' } : s)));
      try {
        const query = toQuery({ section_id: sectionId, limit: PER_SECTION, offset: 0 });
        const res = await netWorkCall(`${apiConfig.listings_by_shop}/${shopId}${query}`, 'GET', null, false);
        if (id !== seq.current) return;
        if (res?.success && Array.isArray(res.data)) {
          setSections((list) =>
            list.map((s) =>
              s.id === sectionId ? { ...s, items: res.data, count: Number(res.total) || s.count, loaded: true, loading: false } : s
            )
          );
        } else if (sectionId === UNSECTIONED_ID) {
          // Servers without a "no section" filter: drop the virtual block quietly
          setSections((list) => list.filter((s) => s.id !== UNSECTIONED_ID));
        } else {
          setSections((list) => list.map((s) => (s.id === sectionId ? { ...s, loading: false, error: apiErrorText(res, 'Could not load') } : s)));
        }
      } catch (err) {
        if (id === seq.current) {
          setSections((list) => list.map((s) => (s.id === sectionId ? { ...s, loading: false, error: 'Could not load. Check your connection.' } : s)));
        }
      } finally {
        inflight.current.delete(sectionId);
      }
    },
    [shopId]
  );

  return { ...state, sections, reload: load, loadSection };
};

/**
 * One paged list of a store's listings (a section's "See all", or a search):
 * GET listings/shop/:shop_id?section_id|q&limit&offset.
 */
export const usePagedShopListings = (shopId, { q, sectionId } = {}, { pageSize = 30, enabled = true } = {}) => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const seq = useRef(0);

  const fetchPage = useCallback(
    async (offset) => {
      if (!shopId || !enabled) return;
      const id = ++seq.current;
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      setError('');
      try {
        const query = toQuery({ q: q || undefined, section_id: sectionId ?? undefined, limit: pageSize, offset });
        const res = await netWorkCall(`${apiConfig.listings_by_shop}/${shopId}${query}`, 'GET', null, false);
        if (id !== seq.current) return;
        if (res?.success && Array.isArray(res.data)) {
          setItems((prev) => (offset === 0 ? res.data : [...prev, ...res.data.filter((r) => !prev.some((p) => p.id === r.id))]));
          setTotal(Number(res.total) || 0);
        } else {
          setError(apiErrorText(res, 'Could not load items.'));
        }
      } catch (err) {
        if (id === seq.current) setError('Could not load items. Check your connection.');
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setLoadingMore(false);
          setLoaded(true);
        }
      }
    },
    [shopId, q, sectionId, pageSize, enabled]
  );

  useEffect(() => {
    setItems([]);
    setTotal(0);
    setLoaded(false);
    fetchPage(0);
  }, [fetchPage]);

  return {
    items,
    total,
    loading,
    loadingMore,
    loaded,
    error,
    hasMore: items.length < total,
    loadMore: () => fetchPage(items.length),
    reload: () => fetchPage(0),
  };
};
