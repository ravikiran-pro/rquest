import { config } from './config';

const debounce = (func, delay) => {
  let timer;
  return function (...args) {
    const context = this;
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(context, args), delay);
  };
};

const storageKeys = {
  auth_token: 'auth_token',
  user_data: 'user_data',
};

const netWorkCall = async (endpoint, method, payload, isAuth = false) => {
  let body = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
  };

  const token =
    sessionStorage.getItem(storageKeys.auth_token) ||
    localStorage.getItem(storageKeys.auth_token);

  if ((isAuth || token) && token) {
    body.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${config.api_url}/api/v1/${endpoint}`, body);
  let data = await response.json();
  return data;
};

const distanceConvertor = (distance) =>
  parseFloat((distance / 1000).toFixed(2));

const getColorByName = (username) => {
  // Simple hash function to generate a number from the username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert the hash to a 6-digit hexadecimal color code
  const color = ((hash & 0x00ffffff) | 0x400000).toString(16);

  return `#${color}`;
};

const USER_ROLES = {
  USER: 'c0f93a2f-16c9-49cf-b47b-e0c0a38a5a4d',
  MERCHANT: 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5',
};

const checkUserRole = (userData) => {
  if (!userData || !userData.user_id) {
    return { isMerchant: false, isUser: false, isAdmin: false, role: 'guest' };
  }
  const roleId = userData.role_id;
  const roleName = (userData.role || userData.role_name || '').toLowerCase();
  const isMerchant =
    roleId === USER_ROLES.MERCHANT ||
    roleName === 'client' ||
    roleName === 'merchant' ||
    roleName === 'owner';
  const isUser = !isMerchant;
  return {
    isMerchant,
    isUser,
    isAdmin: false,
    role: isMerchant ? 'owner' : 'user',
  };
};

const locationNameCache = new Map();

const formatLocationName = (address, displayName, lat, lng) => {
  if (!address) {
    if (displayName) {
      return displayName.split(',').slice(0, 2).join(', ').trim();
    }
    return `${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}`;
  }

  // 1. Locality / Suburb / Neighbourhood
  const rawLocality =
    address.suburb ||
    address.neighbourhood ||
    address.quarter ||
    address.residential ||
    address.subdistrict ||
    address.city_district ||
    address.village ||
    address.town;

  // Clean administrative prefixes like "Zone 14", "Ward 185"
  const cleanLocality = rawLocality
    ? rawLocality.replace(/^(Zone\s+\d+|Ward\s+\d+)\s*/i, '').trim()
    : '';

  // 2. City or main district
  const city =
    address.city ||
    address.town ||
    address.municipality ||
    address.state_district ||
    address.county ||
    '';

  // 3. State
  const state = address.state || '';

  // Construct recognizable, accurate name
  if (cleanLocality && city) {
    if (!cleanLocality.toLowerCase().includes(city.toLowerCase())) {
      return `${cleanLocality}, ${city}`;
    }
    return cleanLocality;
  }

  if (cleanLocality) return cleanLocality;
  if (city) return state ? `${city}, ${state}` : city;

  if (displayName) {
    return displayName.split(',').slice(0, 2).join(', ').trim();
  }

  return `${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}`;
};

const getLocationName = async (lat, lng) => {
  if (!lat || !lng) return '';

  const cacheKey = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  if (locationNameCache.has(cacheKey)) {
    return locationNameCache.get(cacheKey);
  }

  try {
    // 1. Try our reliable backend proxy (includes valid User-Agent & optional Google API)
    const backendRes = await fetch(
      `${config.api_url}/api/v1/location/reverse?lat=${lat}&lon=${lng}`
    );
    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data?.name) {
        locationNameCache.set(cacheKey, data.name);
        return data.name;
      }
    }
  } catch (backendError) {
    console.warn('Backend reverse geocoding fallback to direct:', backendError);
  }

  try {
    // 2. Direct browser fallback
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    );

    const data = await response.json();
    const name = formatLocationName(data.address, data.display_name, lat, lng);
    locationNameCache.set(cacheKey, name);
    return name;
  } catch (error) {
    console.error('Failed to get location name:', error);
    return `${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}`;
  }
};

const searchLocations = async (query) => {
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await fetch(
      `${config.api_url}/api/v1/location/search?q=${encodeURIComponent(query.trim())}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.data) {
        return data.data;
      }
    }
  } catch (err) {
    console.error('Error in searchLocations:', err);
  }

  return [];
};

const getPreciseUserLocation = async (forceFresh = true) => {
  let permissionDenied = false;

  // Helper to query browser geolocation
  const queryBrowserGeo = (highAccuracy, timeout) =>
    new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return reject(new Error('Geolocation not supported by this browser'));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
        (err) => {
          if (err.code === 1) {
            permissionDenied = true;
          }
          reject(err);
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeout,
          maximumAge: forceFresh ? 0 : 30000,
        }
      );
    });

  // Step 1: Try GPS high accuracy (8 seconds timeout)
  try {
    const coords = await queryBrowserGeo(true, 8000);
    return coords;
  } catch (gpsError) {
    // If user explicitly denied permission, throw with clear info
    if (permissionDenied) {
      const err = new Error('PERMISSION_DENIED');
      err.isPermissionDenied = true;
      throw err;
    }

    // Step 2: Fall back to standard Wi-Fi/cellular triangulation
    try {
      const coords = await queryBrowserGeo(false, 6000);
      return coords;
    } catch (networkError) {
      console.warn('Browser geolocation unavailable or timed out:', networkError);
    }
  }

  // Step 3: Fall back to IP-based approximate location
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return [parseFloat(data.latitude), parseFloat(data.longitude)];
      }
    }
  } catch (ipError) {
    console.warn('IP geolocation fallback failed:', ipError);
  }

  // Step 4: Default fallback coordinates (Chennai center)
  return [12.9631025, 80.25476];
};

export {
  debounce,
  storageKeys,
  netWorkCall,
  distanceConvertor,
  getColorByName,
  USER_ROLES,
  checkUserRole,
  getLocationName,
  searchLocations,
  getPreciseUserLocation,
};
