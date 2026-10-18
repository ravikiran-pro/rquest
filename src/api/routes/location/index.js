require('dotenv').config();
const express = require('express');
const router = express.Router();

const cache = new Map();

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

  const cleanLocality = rawLocality
    ? rawLocality.replace(/^(Zone\s+\d+|Ward\s+\d+)\s*/i, '').trim()
    : '';

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
    const locationIqKey = process.env.LOCATIONIQ_API_KEY || process.env.VITE_LOCATIONIQ_API_KEY;
    if (locationIqKey) {
      try {
        const liqUrl = `https://us1.locationiq.com/v1/reverse?key=${locationIqKey}&lat=${lat}&lon=${targetLon}&format=json`;
        const liqRes = await fetch(liqUrl, { signal: AbortSignal.timeout?.(5000) });
        if (liqRes.ok) {
          const liqData = await liqRes.json();
          const formattedName = formatLocationName(liqData?.address, liqData?.display_name, lat, targetLon);
          const result = {
            success: true,
            name: formattedName,
            address: liqData?.address,
            display_name: liqData?.display_name,
            source: 'locationiq',
          };
          cache.set(key, result);
          return res.json(result);
        }
      } catch (liqError) {
        console.warn('LocationIQ reverse geocode fallback to secondary:', liqError);
      }
    }

    const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (googleKey) {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${targetLon}&key=${googleKey}`;
      const gRes = await fetch(gUrl, { signal: AbortSignal.timeout?.(5000) });
      const gData = await gRes.json();
      if (gData.status === 'OK' && gData.results?.length > 0) {
        const first = gData.results[0];
        const result = {
          success: true,
          name: first.formatted_address.split(',').slice(0, 2).join(', ').trim(),
          formatted_address: first.formatted_address,
          source: 'google',
        };
        cache.set(key, result);
        return res.json(result);
      }
    }

    // Default: OpenStreetMap Nominatim with valid User-Agent
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${targetLon}`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'RQuest-Hyperlocal-Platform/1.0 (contact@rquest.local)',
      },
      signal: AbortSignal.timeout?.(5000),
    });

    const osmData = await osmRes.json();
    const formattedName = formatLocationName(osmData?.address, osmData?.display_name, lat, targetLon);

    const result = {
      success: true,
      name: formattedName,
      address: osmData?.address,
      display_name: osmData?.display_name,
      source: 'osm',
    };

    cache.set(key, result);
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

// 2. Search Autocomplete: q -> list of matching areas/cities
router.get('/search', async (req, res) => {
  const { q, lat, lon, lng } = req.query;
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
    const locationIqKey = process.env.LOCATIONIQ_API_KEY || process.env.VITE_LOCATIONIQ_API_KEY;
    if (locationIqKey) {
      try {
        let liqUrl = `https://api.locationiq.com/v1/autocomplete?key=${locationIqKey}&q=${encodeURIComponent(
          query
        )}&countrycodes=in&limit=8&format=json`;

        if (lat && targetLon && !isNaN(Number(lat)) && !isNaN(Number(targetLon))) {
          liqUrl += `&proximity=${Number(lat).toFixed(4)},${Number(targetLon).toFixed(4)}`;
        }

        const liqRes = await fetch(liqUrl, { signal: AbortSignal.timeout?.(5000) });
        if (liqRes.ok) {
          const liqData = await liqRes.json();
          if (Array.isArray(liqData)) {
            const results = liqData.map((item) => ({
              name: item.display_place || (item.display_name ? item.display_name.split(',')[0].trim() : item.name),
              display_name: item.display_name,
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon),
              source: 'locationiq',
            }));
            const responseData = { success: true, data: results, source: 'locationiq' };
            cache.set(key, responseData);
            return res.json(responseData);
          }
        }
      } catch (liqError) {
        console.warn('LocationIQ search autocomplete fallback to secondary:', liqError);
      }
    }

    const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (googleKey) {
      const gUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&components=country:in&key=${googleKey}`;
      const gRes = await fetch(gUrl, { signal: AbortSignal.timeout?.(5000) });
      const gData = await gRes.json();
      if (gData.status === 'OK' && gData.predictions?.length > 0) {
        const results = gData.predictions.map((p) => ({
          place_id: p.place_id,
          name: p.structured_formatting?.main_text || p.description,
          display_name: p.description,
          source: 'google',
        }));
        const responseData = { success: true, data: results, source: 'google' };
        cache.set(key, responseData);
        return res.json(responseData);
      }
    }

    // Default: OpenStreetMap Nominatim search
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&countrycodes=in&limit=6`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'RQuest-Hyperlocal-Platform/1.0 (contact@rquest.local)',
      },
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
    cache.set(key, responseData);
    return res.json(responseData);
  } catch (error) {
    console.error('Error in /location/search:', error);
    return res.json({ success: true, data: [] });
  }
});

module.exports = router;

