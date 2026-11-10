require('dotenv').config();
const express = require('express');
const router = express.Router();

const cache = new Map();
const MAX_CACHE_ENTRIES = 1000;

const OSM_HEADERS = {
  'User-Agent': 'RQuest-Hyperlocal-Platform/1.0 (contact@rquest.local)',
};

const getGoogleApiKey = () =>
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY;

const getLocationIqKey = () =>
  process.env.LOCATIONIQ_API_KEY || process.env.VITE_LOCATIONIQ_API_KEY;

const setCache = (key, value) => {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, value);
};

const cleanAdminPrefix = (name) =>
  name ? name.replace(/^(Zone\s+\d+|Ward\s+\d+)\s*/i, '').trim() : '';

const formatLocationName = (address, displayName, lat, lng) => {
  if (!address) {
    if (displayName) {
      return displayName.split(',').slice(0, 2).join(', ').trim();
    }
    return `${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}`;
  }

  const rawLocality =
    address.suburb ||
    address.neighbourhood ||
    address.quarter ||
    address.residential ||
    address.subdistrict ||
    address.city_district ||
    address.village ||
    address.town;

  const cleanLocality = cleanAdminPrefix(rawLocality);

  const city =
    address.city ||
    address.town ||
    address.municipality ||
    address.state_district ||
    address.county ||
    '';

  const state = address.state || '';

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

/**
 * Extracts normalized locality/city/state/pincode parts from Google Geocoding (v3/v4)
 * and Google Places API (New) addressComponents arrays.
 */
const extractGoogleAddressParts = (components = []) => {
  const findComponent = (types) => {
    for (const type of types) {
      const match = components.find(
        (c) => Array.isArray(c.types) && c.types.includes(type)
      );
      if (match) return match.longText || match.long_name || '';
    }
    return '';
  };

  const sublocality = findComponent([
    'sublocality_level_1',
    'sublocality',
    'neighborhood',
    'sublocality_level_2',
    'route',
  ]);
  const city = findComponent([
    'locality',
    'administrative_area_level_3',
    'administrative_area_level_2',
  ]);
  const state = findComponent(['administrative_area_level_1']);
  const pincode = findComponent(['postal_code']);

  return { sublocality, city, state, pincode };
};

const formatGoogleLocationName = (components, formattedAddress, lat, lng) => {
  const { sublocality, city, state } = extractGoogleAddressParts(components);
  const cleanLocality = cleanAdminPrefix(sublocality);

  if (cleanLocality && city) {
    if (!cleanLocality.toLowerCase().includes(city.toLowerCase())) {
      return `${cleanLocality}, ${city}`;
    }
    return cleanLocality;
  }

  if (cleanLocality) return cleanLocality;
  if (city) return state ? `${city}, ${state}` : city;

  if (formattedAddress) {
    return formattedAddress.split(',').slice(0, 2).join(', ').trim();
  }

  return `${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}`;
};

const reverseWithGoogle = async (lat, targetLon, googleKey) => {
  // Primary: Google Geocoding API v4
  try {
    const v4Url = `https://geocode.googleapis.com/v4/geocode/location?location.latitude=${encodeURIComponent(
      lat
    )}&location.longitude=${encodeURIComponent(targetLon)}`;
    const v4Res = await fetch(v4Url, {
      headers: { 'X-Goog-Api-Key': googleKey },
      signal: AbortSignal.timeout?.(5000),
    });
    if (v4Res.ok) {
      const v4Data = await v4Res.json();
      const first = v4Data.results?.[0];
      if (first) {
        const addressParts = extractGoogleAddressParts(first.addressComponents);
        return {
          success: true,
          name: formatGoogleLocationName(
            first.addressComponents,
            first.formattedAddress,
            lat,
            targetLon
          ),
          formatted_address: first.formattedAddress,
          address_parts: addressParts,
          place_id: first.placeId,
          source: 'google_geocoding_v4',
        };
      }
    }
  } catch (err) {
    console.warn('Google Geocoding v4 reverse fallback:', err.message);
  }

  // Fallback: Legacy Google Geocoding API v3
  try {
    const v3Url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
      lat
    )},${encodeURIComponent(targetLon)}&key=${googleKey}`;
    const v3Res = await fetch(v3Url, { signal: AbortSignal.timeout?.(5000) });
    const v3Data = await v3Res.json();
    if (v3Data.status === 'OK' && v3Data.results?.length > 0) {
      const first = v3Data.results[0];
      const addressParts = extractGoogleAddressParts(first.address_components);
      return {
        success: true,
        name: formatGoogleLocationName(
          first.address_components,
          first.formatted_address,
          lat,
          targetLon
        ),
        formatted_address: first.formatted_address,
        address_parts: addressParts,
        place_id: first.place_id,
        source: 'google',
      };
    }
  } catch (err) {
    console.warn('Google Geocoding v3 reverse fallback:', err.message);
  }

  return null;
};

const reverseWithLocationIq = async (lat, targetLon, locationIqKey) => {
  try {
    const liqUrl = `https://us1.locationiq.com/v1/reverse?key=${locationIqKey}&lat=${lat}&lon=${targetLon}&format=json`;
    const liqRes = await fetch(liqUrl, { signal: AbortSignal.timeout?.(5000) });
    if (liqRes.ok) {
      const liqData = await liqRes.json();
      const formattedName = formatLocationName(
        liqData?.address,
        liqData?.display_name,
        lat,
        targetLon
      );
      return {
        success: true,
        name: formattedName,
        address: liqData?.address,
        display_name: liqData?.display_name,
        source: 'locationiq',
      };
    }
  } catch (liqError) {
    console.warn('LocationIQ reverse geocode fallback:', liqError.message);
  }
  return null;
};

const searchPlacesWithGoogle = async (query, lat, targetLon, sessionToken, googleKey) => {
  const hasBias =
    lat && targetLon && !isNaN(Number(lat)) && !isNaN(Number(targetLon));

  // Primary: Google Places API (New) Autocomplete
  try {
    const body = {
      input: query,
      includedRegionCodes: ['in'],
    };
    if (sessionToken) {
      body.sessionToken = sessionToken;
    }
    if (hasBias) {
      body.locationBias = {
        circle: {
          center: { latitude: Number(lat), longitude: Number(targetLon) },
          radius: 50000.0,
        },
      };
    }

    const pRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout?.(5000),
    });

    const pData = await pRes.json();
    if (pRes.ok && !pData.error) {
      const suggestions = Array.isArray(pData.suggestions) ? pData.suggestions : [];
      const results = suggestions
        .filter((s) => s.placePrediction?.placeId)
        .map((s) => {
          const pred = s.placePrediction;
          return {
            place_id: pred.placeId,
            name: pred.structuredFormat?.mainText?.text || pred.text?.text,
            display_name:
              pred.text?.text || pred.structuredFormat?.secondaryText?.text || '',
            secondary_text: pred.structuredFormat?.secondaryText?.text || '',
            types: pred.types || [],
            source: 'google_places',
          };
        });
      return { results, source: 'google_places', ok: true };
    }
    console.warn('Google Places (New) autocomplete error:', pData.error?.message || pRes.status);
  } catch (err) {
    console.warn('Google Places (New) autocomplete fallback:', err.message);
  }

  // Fallback: Legacy Google Places Autocomplete
  try {
    let gUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query
    )}&components=country:in&key=${googleKey}`;
    if (hasBias) {
      gUrl += `&location=${Number(lat)},${Number(targetLon)}&radius=50000`;
    }
    const gRes = await fetch(gUrl, { signal: AbortSignal.timeout?.(5000) });
    const gData = await gRes.json();
    if (gData.status === 'OK' && gData.predictions?.length > 0) {
      const results = gData.predictions.map((p) => ({
        place_id: p.place_id,
        name: p.structured_formatting?.main_text || p.description,
        display_name: p.description,
        secondary_text: p.structured_formatting?.secondary_text || '',
        source: 'google',
      }));
      return { results, source: 'google', ok: true };
    }
  } catch (err) {
    console.warn('Google Places legacy autocomplete fallback:', err.message);
  }

  return null;
};

const fetchPlaceDetailsWithGoogle = async (placeId, sessionToken, googleKey) => {
  // Primary: Google Places API (New) Place Details
  try {
    const querySuffix = sessionToken
      ? `?sessionToken=${encodeURIComponent(sessionToken)}`
      : '';
    const dRes = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}${querySuffix}`,
      {
        headers: {
          'X-Goog-Api-Key': googleKey,
          'X-Goog-FieldMask':
            'id,displayName,formattedAddress,location,addressComponents',
        },
        signal: AbortSignal.timeout?.(5000),
      }
    );
    const dData = await dRes.json();
    if (dRes.ok && dData.location) {
      const addressParts = extractGoogleAddressParts(dData.addressComponents);
      return {
        place_id: dData.id || placeId,
        name: dData.displayName?.text || addressParts.sublocality || dData.formattedAddress,
        display_name: dData.formattedAddress || '',
        lat: dData.location.latitude,
        lon: dData.location.longitude,
        address_parts: addressParts,
        source: 'google_places',
      };
    }
    console.warn('Google Places (New) details error:', dData.error?.message || dRes.status);
  } catch (err) {
    console.warn('Google Places (New) details fallback:', err.message);
  }

  // Fallback: Legacy Google Place Details
  try {
    const legacyUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=place_id,name,formatted_address,geometry,address_component&key=${googleKey}`;
    const lRes = await fetch(legacyUrl, { signal: AbortSignal.timeout?.(5000) });
    const lData = await lRes.json();
    if (lData.status === 'OK' && lData.result?.geometry?.location) {
      const r = lData.result;
      const addressParts = extractGoogleAddressParts(r.address_components);
      return {
        place_id: r.place_id || placeId,
        name: r.name || addressParts.sublocality || r.formatted_address,
        display_name: r.formatted_address || '',
        lat: r.geometry.location.lat,
        lon: r.geometry.location.lng,
        address_parts: addressParts,
        source: 'google',
      };
    }
  } catch (err) {
    console.warn('Google Places legacy details fallback:', err.message);
  }

  return null;
};

const geocodeWithGoogle = async (address, googleKey) => {
  // Primary: Google Geocoding API v4 (address -> lat/lon)
  try {
    const v4Url = `https://geocode.googleapis.com/v4/geocode/address?addressQuery=${encodeURIComponent(
      address
    )}`;
    const v4Res = await fetch(v4Url, {
      headers: { 'X-Goog-Api-Key': googleKey },
      signal: AbortSignal.timeout?.(5000),
    });
    if (v4Res.ok) {
      const v4Data = await v4Res.json();
      if (Array.isArray(v4Data.results) && v4Data.results.length > 0) {
        return {
          source: 'google_geocoding_v4',
          results: v4Data.results.map((r) => {
            const addressParts = extractGoogleAddressParts(r.addressComponents);
            return {
              place_id: r.placeId,
              name:
                addressParts.sublocality ||
                addressParts.city ||
                r.formattedAddress?.split(',')[0] ||
                address,
              display_name: r.formattedAddress,
              lat: r.location?.latitude,
              lon: r.location?.longitude,
              address_parts: addressParts,
              source: 'google_geocoding_v4',
            };
          }),
        };
      }
    }
  } catch (err) {
    console.warn('Google Geocoding v4 forward fallback:', err.message);
  }

  // Secondary: Google Places Text Search (New)
  try {
    const tRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents',
      },
      body: JSON.stringify({
        textQuery: address,
        regionCode: 'IN',
        maxResultCount: 5,
      }),
      signal: AbortSignal.timeout?.(5000),
    });
    if (tRes.ok) {
      const tData = await tRes.json();
      if (Array.isArray(tData.places) && tData.places.length > 0) {
        return {
          source: 'google_places_text',
          results: tData.places.map((p) => ({
            place_id: p.id,
            name: p.displayName?.text || p.formattedAddress,
            display_name: p.formattedAddress,
            lat: p.location?.latitude,
            lon: p.location?.longitude,
            address_parts: extractGoogleAddressParts(p.addressComponents),
            source: 'google_places_text',
          })),
        };
      }
    }
  } catch (err) {
    console.warn('Google Places Text Search forward fallback:', err.message);
  }

  return null;
};

const searchWithLocationIq = async (query, lat, targetLon, locationIqKey) => {
  try {
    const numLat = lat && !isNaN(Number(lat)) ? parseFloat(lat) : 12.9631025;
    const numLon = targetLon && !isNaN(Number(targetLon)) ? parseFloat(targetLon) : 80.25476;

    let results = [];
    const delta = 1.4;
    const minLon = (numLon - delta).toFixed(4);
    const maxLat = (numLat + delta).toFixed(4);
    const maxLon = (numLon + delta).toFixed(4);
    const minLat = (numLat - delta).toFixed(4);

    const localUrl = `https://api.locationiq.com/v1/autocomplete?key=${locationIqKey}&q=${encodeURIComponent(
      query
    )}&viewbox=${minLon},${maxLat},${maxLon},${minLat}&bounded=1&countrycodes=in&limit=8&format=json`;

    const localRes = await fetch(localUrl, { signal: AbortSignal.timeout?.(4000) });
    if (localRes.ok) {
      const localData = await localRes.json();
      if (Array.isArray(localData) && localData.length > 0) {
        results = localData;
      }
    }

    if (results.length === 0) {
      const nationalUrl = `https://api.locationiq.com/v1/autocomplete?key=${locationIqKey}&q=${encodeURIComponent(
        query
      )}&countrycodes=in&limit=8&format=json`;

      const natRes = await fetch(nationalUrl, { signal: AbortSignal.timeout?.(4000) });
      if (natRes.ok) {
        const natData = await natRes.json();
        if (Array.isArray(natData)) {
          results = natData;
        }
      }
    }

    if (results.length > 0) {
      const mapped = results.map((item) => {
        const itemLat = parseFloat(item.lat);
        const itemLon = parseFloat(item.lon);
        const dist = Math.hypot(itemLat - numLat, itemLon - numLon);
        return {
          name:
            item.display_place ||
            (item.display_name ? item.display_name.split(',')[0].trim() : item.name),
          display_name: item.display_name,
          lat: itemLat,
          lon: itemLon,
          dist,
          source: 'locationiq',
        };
      });

      mapped.sort((a, b) => a.dist - b.dist);

      const seen = new Set();
      const unique = [];
      for (const item of mapped) {
        if (item.display_name && !seen.has(item.display_name)) {
          seen.add(item.display_name);
          unique.push(item);
        }
      }

      return unique;
    }
  } catch (liqError) {
    console.warn('LocationIQ search autocomplete fallback:', liqError.message);
  }
  return null;
};

// 1. Reverse Geocode: lat, lon/lng -> address name
router.get('/reverse', async (req, res) => {
  const { lat, lon, lng } = req.query;
  const targetLon = lon || lng;
  if (!lat || !targetLon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  const key = `rev_${Number(lat).toFixed(4)}_${Number(targetLon).toFixed(4)}`;
  if (cache.has(key)) {
    return res.json(cache.get(key));
  }

  try {
    const googleKey = getGoogleApiKey();
    if (googleKey) {
      const googleResult = await reverseWithGoogle(lat, targetLon, googleKey);
      if (googleResult) {
        setCache(key, googleResult);
        return res.json(googleResult);
      }
    }

    const locationIqKey = getLocationIqKey();
    if (locationIqKey) {
      const liqResult = await reverseWithLocationIq(lat, targetLon, locationIqKey);
      if (liqResult) {
        setCache(key, liqResult);
        return res.json(liqResult);
      }
    }

    // Fallback: OpenStreetMap Nominatim with valid User-Agent
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${targetLon}`;
    const osmRes = await fetch(osmUrl, {
      headers: OSM_HEADERS,
      signal: AbortSignal.timeout?.(5000),
    });

    const osmData = await osmRes.json();
    const formattedName = formatLocationName(
      osmData?.address,
      osmData?.display_name,
      lat,
      targetLon
    );

    const result = {
      success: true,
      name: formattedName,
      address: osmData?.address,
      display_name: osmData?.display_name,
      source: 'osm',
    };

    setCache(key, result);
    return res.json(result);
  } catch (error) {
    console.error('Error in /location/reverse:', error);
    const fallbackLat = !isNaN(Number(lat)) ? Number(lat).toFixed(3) : lat;
    const fallbackLon = !isNaN(Number(targetLon)) ? Number(targetLon).toFixed(3) : targetLon;
    return res.json({
      success: true,
      name: `${fallbackLat}, ${fallbackLon}`,
      fallback: true,
    });
  }
});

// 2. Forward Geocode: address/location string -> lat, lon
router.get('/geocode', async (req, res) => {
  const address = (req.query.address || req.query.q || '').trim();
  if (!address) {
    return res.status(400).json({ error: 'address or q query parameter is required' });
  }

  const key = `geo_${address.toLowerCase()}`;
  if (cache.has(key)) {
    return res.json(cache.get(key));
  }

  try {
    const googleKey = getGoogleApiKey();
    if (googleKey) {
      const googleGeo = await geocodeWithGoogle(address, googleKey);
      if (googleGeo && googleGeo.results.length > 0) {
        const first = googleGeo.results[0];
        const responseData = {
          success: true,
          lat: first.lat,
          lon: first.lon,
          formatted_address: first.display_name,
          address_parts: first.address_parts,
          data: googleGeo.results,
          source: googleGeo.source,
        };
        setCache(key, responseData);
        return res.json(responseData);
      }
    }

    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}&countrycodes=in&limit=5`;
    const osmRes = await fetch(osmUrl, {
      headers: OSM_HEADERS,
      signal: AbortSignal.timeout?.(5000),
    });
    const osmData = await osmRes.json();
    const results = Array.isArray(osmData)
      ? osmData.map((item) => ({
          name: item.name,
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          source: 'osm',
        }))
      : [];

    const first = results[0];
    const responseData = {
      success: true,
      lat: first?.lat,
      lon: first?.lon,
      formatted_address: first?.display_name,
      data: results,
      source: 'osm',
    };
    setCache(key, responseData);
    return res.json(responseData);
  } catch (error) {
    console.error('Error in /location/geocode:', error);
    return res.status(500).json({ success: false, error: 'Failed to geocode address', data: [] });
  }
});

// 3. Search Autocomplete: q -> list of matching areas/cities
router.get('/search', async (req, res) => {
  const { q, lat, lon, lng, sessionToken } = req.query;
  const targetLon = lon || lng;

  if (!q || q.trim().length < 2) {
    return res.json({ success: true, data: [] });
  }

  const query = q.trim();
  const key = `search_${query.toLowerCase()}_${lat || ''}_${targetLon || ''}`;
  if (cache.has(key)) {
    return res.json(cache.get(key));
  }

  try {
    const googleKey = getGoogleApiKey();
    if (googleKey) {
      const googleSearch = await searchPlacesWithGoogle(
        query,
        lat,
        targetLon,
        sessionToken,
        googleKey
      );
      if (googleSearch && googleSearch.results.length > 0) {
        const responseData = {
          success: true,
          data: googleSearch.results,
          source: googleSearch.source,
        };
        setCache(key, responseData);
        return res.json(responseData);
      }
    }

    const locationIqKey = getLocationIqKey();
    if (locationIqKey) {
      const liqResults = await searchWithLocationIq(
        query,
        lat,
        targetLon,
        locationIqKey
      );
      if (liqResults && liqResults.length > 0) {
        const responseData = {
          success: true,
          data: liqResults,
          source: 'locationiq',
        };
        setCache(key, responseData);
        return res.json(responseData);
      }
    }

    // Fallback: OpenStreetMap Nominatim search
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&countrycodes=in&limit=6`;
    const osmRes = await fetch(osmUrl, {
      headers: OSM_HEADERS,
      signal: AbortSignal.timeout?.(5000),
    });

    const osmData = await osmRes.json();
    const results = Array.isArray(osmData)
      ? osmData.map((item) => ({
          name: item.name,
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          source: 'osm',
        }))
      : [];

    const responseData = { success: true, data: results, source: 'osm' };
    setCache(key, responseData);
    return res.json(responseData);
  } catch (error) {
    console.error('Error in /location/search:', error);
    return res.json({ success: true, data: [] });
  }
});

// 4. Place Details: resolve a Google Places place_id into lat/lon and address components
router.get('/place-details', async (req, res) => {
  const { place_id, sessionToken } = req.query;
  if (!place_id) {
    return res.status(400).json({ success: false, error: 'place_id is required' });
  }

  const key = `place_${place_id}`;
  if (cache.has(key)) {
    return res.json(cache.get(key));
  }

  try {
    const googleKey = getGoogleApiKey();
    if (!googleKey) {
      return res.status(400).json({
        success: false,
        error: 'Google Places API key is not configured on the server',
      });
    }

    const details = await fetchPlaceDetailsWithGoogle(place_id, sessionToken, googleKey);
    if (!details) {
      return res.status(404).json({
        success: false,
        error: 'Could not resolve place details for the given place_id',
      });
    }

    const responseData = { success: true, data: details, source: details.source };
    setCache(key, responseData);
    return res.json(responseData);
  } catch (error) {
    console.error('Error in /location/place-details:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch place details' });
  }
});

module.exports = router;
