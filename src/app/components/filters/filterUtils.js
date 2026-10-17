export const DEFAULT_FILTERS = {
  maxDistance: null, // null = unlimited / any distance, or number in km
  categories: [],    // array of category IDs/keys
  minPrice: null,    // number or null
  maxPrice: null,    // number or null
  minRating: null,   // number or null (e.g. 4.0)
  listingType: 'all',// 'all', 'product', 'service', 'food', 'rentals'
  onlyAvailable: false,
  sortBy: 'distance_asc', // 'distance_asc' | 'price_asc' | 'price_desc' | 'rating_desc' | 'name_asc'
};

export const DISTANCE_PRESETS = [
  { label: 'Within 2 km', shortLabel: '2 km', value: 2, icon: null},
  { label: 'Within 5 km', shortLabel: '5 km', value: 5, icon: null},
  { label: 'Within 10 km', shortLabel: '10 km', value: 10, icon: null},
  { label: 'Within 25 km', shortLabel: '25 km', value: 25, icon: null},
  { label: 'Any Distance', shortLabel: 'All', value: null, icon: null},
];

export const FILTER_CATEGORIES = [
  { id: 'Provision Store', label: 'Groceries & Marts', icon: '🛒', aliases: ['groceries', 'supermarket', 'mart', 'provision'] },
  { id: 'Food & Dining', label: 'Food & Dining', icon: '🍽️', aliases: ['food', 'dining', 'restaurant', 'eatery', 'cafe'] },
  { id: 'Health & Medicine', label: 'Pharmacy & Health', icon: '💊', aliases: ['pharmacy', 'health', 'medicine', 'wellness'] },
  { id: 'Technicians', label: 'Repairs & Services', icon: '🔧', aliases: ['technician', 'repairs', 'services', 'tools', 'electrician', 'plumber'] },
  { id: 'Dress Shop', label: 'Fashion & Boutique', icon: '👗', aliases: ['dress', 'fashion', 'boutique', 'clothing', 'retail'] },
  { id: 'Rentals', label: 'Rentals & Equipment', icon: '📦', aliases: ['rental', 'rentals', 'equipment'] },
  { id: 'Small business', label: 'Other Local Stores', icon: '🏪', aliases: ['small business', 'store', 'other', 'miscellaneous'] },
];

export const PRICE_PRESETS = [
  { label: 'Under ₹100', min: 0, max: 100 },
  { label: '₹100 - ₹500', min: 100, max: 500 },
  { label: '₹500 - ₹1,500', min: 500, max: 1500 },
  { label: '₹1,500+', min: 1500, max: 10000 },
];

export const RATING_PRESETS = [
  { label: 'Any Rating', value: null },
  { label: '4.5+ ★', value: 4.5 },
  { label: '4.0+ ★', value: 4.0 },
  { label: '3.5+ ★', value: 3.5 },
];

export const LISTING_TYPE_OPTIONS = [
  { label: 'All Items & Services', value: 'all', icon: '✨' },
  { label: 'Products (Retail Goods)', value: 'product', icon: '📦' },
  { label: 'Dishes & Food', value: 'food', icon: '🍽️' },
  { label: 'Services & Tasks', value: 'service', icon: '🔧' },
  { label: 'Rentals', value: 'rental', icon: '🏠' },
];

export const SORT_OPTIONS = [
  { label: 'Nearest First', value: 'distance_asc', icon: null },
  { label: 'Price: Low to High', value: 'price_asc', icon: null, itemsOnly: true },
  { label: 'Price: High to Low', value: 'price_desc', icon: null, itemsOnly: true },
  { label: 'Highest Rated', value: 'rating_desc', icon: null },
  { label: 'Name (A to Z)', value: 'name_asc', icon: null },
];

/**
 * Filter and sort results based on active filters
 */
export const applySearchFilters = (items, filters, searchMode = 'items') => {
  if (!Array.isArray(items)) return [];

  let result = items.filter((item) => {
    // 1. Distance filter (in kilometers)
    if (filters.maxDistance !== null && filters.maxDistance !== undefined) {
      const rawDistance = searchMode === 'shops' ? item.distance : item.shop?.distance;
      if (rawDistance !== undefined && rawDistance !== null) {
        const km = rawDistance / 1000;
        if (km > filters.maxDistance) return false;
      }
    }

    // 2. Category filter
    if (filters.categories && filters.categories.length > 0) {
      const targetStr =
        searchMode === 'shops'
          ? `${item.shop_type || ''} ${item.shopCategory?.name || ''} ${item.shopSubCategory?.name || ''} ${item.shop_name || ''}`.toLowerCase()
          : `${item.shop?.shop_type || ''} ${item.shop?.shopCategory?.name || ''} ${item.listing_type || ''} ${item.name || ''}`.toLowerCase();

      const matchesCategory = filters.categories.some((catId) => {
        const def = FILTER_CATEGORIES.find((c) => c.id === catId);
        if (def && def.aliases) {
          return def.aliases.some((alias) => targetStr.includes(alias.toLowerCase()));
        }
        return targetStr.includes(catId.toLowerCase());
      });

      if (!matchesCategory) return false;
    }

    // 3. Rating filter
    if (filters.minRating !== null && filters.minRating !== undefined) {
      const rating = searchMode === 'shops' ? item.rating : item.shop?.rating;
      const numRating = rating !== null && rating !== undefined ? parseFloat(rating) : 5.0; // unrated new shops given benefit or compared
      if (numRating < filters.minRating) return false;
    }

    // 4. Availability filter (both items & shops)
    if (filters.onlyAvailable) {
      if (searchMode === 'shops') {
        if (item.is_open === false || item.is_available === false) return false;
      } else {
        if (item.is_available === false || item.shop?.is_open === false) return false;
      }
    }

    // Items-specific filters
    if (searchMode === 'items') {
      // 5. Price range filter
      if (filters.minPrice !== null && filters.minPrice !== undefined) {
        const price = parseFloat(item.price) || 0;
        if (price < filters.minPrice) return false;
      }
      if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
        const price = parseFloat(item.price) || 0;
        if (price > filters.maxPrice) return false;
      }

      // 6. Listing type filter
      if (filters.listingType && filters.listingType !== 'all') {
        const itemType = (item.listing_type || '').toLowerCase();
        if (itemType !== filters.listingType.toLowerCase()) return false;
      }
    }

    return true;
  });

  // Apply Sorting
  const sortBy = filters.sortBy || 'distance_asc';
  result.sort((a, b) => {
    if (sortBy === 'distance_asc') {
      const distA = searchMode === 'shops' ? a.distance ?? 9999999 : a.shop?.distance ?? 9999999;
      const distB = searchMode === 'shops' ? b.distance ?? 9999999 : b.shop?.distance ?? 9999999;
      return distA - distB;
    }
    if (sortBy === 'price_asc' && searchMode === 'items') {
      return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
    }
    if (sortBy === 'price_desc' && searchMode === 'items') {
      return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
    }
    if (sortBy === 'rating_desc') {
      const rateA = (searchMode === 'shops' ? a.rating : a.shop?.rating) ?? 0;
      const rateB = (searchMode === 'shops' ? b.rating : b.shop?.rating) ?? 0;
      return parseFloat(rateB) - parseFloat(rateA);
    }
    if (sortBy === 'name_asc') {
      const nameA = searchMode === 'shops' ? a.shop_name || '' : a.name || '';
      const nameB = searchMode === 'shops' ? b.shop_name || '' : b.name || '';
      return nameA.localeCompare(nameB);
    }
    return 0;
  });

  return result;
};

/**
 * Count active non-default filters
 */
export const countActiveFilters = (filters, searchMode = 'items') => {
  let count = 0;
  if (filters.maxDistance !== null && filters.maxDistance !== undefined) count++;
  if (filters.categories && filters.categories.length > 0) count += filters.categories.length;
  if (filters.minRating !== null && filters.minRating !== undefined) count++;
  if (filters.sortBy && filters.sortBy !== 'distance_asc') count++;

  if (filters.onlyAvailable) count++;

  if (searchMode === 'items') {
    if (filters.minPrice !== null || filters.maxPrice !== null) count++;
    if (filters.listingType && filters.listingType !== 'all') count++;
  }
  return count;
};

