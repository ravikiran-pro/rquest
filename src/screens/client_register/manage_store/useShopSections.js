import { useCallback, useEffect, useRef, useState } from 'react';
import { netWorkCall, apiConfig } from '../../../app/utils';
import { apiErrorText } from '../../../app/utils/catalogue_api';

const bySortOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.name).localeCompare(String(b.name));

/**
 * The shop's sections for the owner: GET sections/manage/:shop_id (spec §E3).
 * All sections, including hidden and empty ones, in sort order.
 */
const useShopSections = (shopId) => {
  const [sections, setSectionsState] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const reload = useCallback(
    async ({ silent = false } = {}) => {
      if (!shopId) return;
      const id = ++seq.current;
      if (!silent) setLoading(true);
      setError('');
      try {
        const res = await netWorkCall(`${apiConfig.sections_manage}/${shopId}`, 'GET', null, true);
        if (id !== seq.current) return;
        if (res?.success && Array.isArray(res.data)) setSectionsState([...res.data].sort(bySortOrder));
        else setError(apiErrorText(res, 'Could not load your sections.'));
      } catch (err) {
        if (id === seq.current) setError('Could not load your sections. Check your connection.');
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setLoaded(true);
        }
      }
    },
    [shopId]
  );

  useEffect(() => {
    setSectionsState([]);
    setLoaded(false);
    reload();
  }, [reload]);

  const setSections = useCallback((next) => {
    setSectionsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      return Array.isArray(value) ? value : prev;
    });
  }, []);

  return { sections, loading, loaded, error, reload, setSections };
};

export default useShopSections;
