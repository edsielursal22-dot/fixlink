import axios from 'axios';

export const LOCATIONIQ_ACCESS_TOKEN = 'pk.0070e64f51684d84b2f6f79af4b4870d';
const BASE_URL = 'https://us1.locationiq.com/v1';

export const getLocationIqTileUrl = () => (
  `https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_ACCESS_TOKEN}`
);

// In-memory cache to prevent duplicate calls and avoid LocationIQ 429 rate limiting
const routeCache = new Map();
const geocodeCache = new Map();
let lastRouteRequestTime = 0;

// Haversine distance helper
const calculateDistanceKm = (start, end) => {
  if (![start?.latitude, start?.longitude, end?.latitude, end?.longitude].every(Number.isFinite)) return 1;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(end.latitude - start.latitude);
  const dLon = toRad(end.longitude - start.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(start.latitude)) * Math.cos(toRad(end.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getDrivingRoute = async (startCoords, endCoords) => {
  if (!startCoords?.latitude || !startCoords?.longitude || !endCoords?.latitude || !endCoords?.longitude) {
    return null;
  }

  const cacheKey = `${startCoords.latitude.toFixed(4)},${startCoords.longitude.toFixed(4)};${endCoords.latitude.toFixed(4)},${endCoords.longitude.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  // Throttle: Ensure at least 800ms between network requests to respect LocationIQ 2 req/sec limit
  const now = Date.now();
  if (now - lastRouteRequestTime < 800) {
    await new Promise((resolve) => setTimeout(resolve, 800 - (now - lastRouteRequestTime)));
  }
  lastRouteRequestTime = Date.now();

  try {
    const coordsString = `${startCoords.longitude},${startCoords.latitude};${endCoords.longitude},${endCoords.latitude}`;
    const response = await axios.get(`${BASE_URL}/directions/driving/${coordsString}`, {
      params: {
        key: LOCATIONIQ_ACCESS_TOKEN,
        steps: true,
        geometries: 'geojson',
      },
      timeout: 6000,
    });
    const route = response.data?.routes?.[0];
    if (route) {
      routeCache.set(cacheKey, route);
      return route;
    }
  } catch (error) {
    console.warn('LocationIQ Route Notice (falling back to direct road link):', error?.response?.status || error?.message);
  }

  // Fallback: Generate straight-line connection if rate-limited (HTTP 429) or offline
  const fallbackKm = calculateDistanceKm(startCoords, endCoords);
  const fallbackRoute = {
    distance: Math.round(fallbackKm * 1000),
    duration: Math.max(60, Math.round((fallbackKm / 25) * 3600)), // ~25 km/h driving speed
    geometry: {
      coordinates: [
        [startCoords.longitude, startCoords.latitude],
        [endCoords.longitude, endCoords.latitude],
      ],
    },
    isFallback: true,
  };
  routeCache.set(cacheKey, fallbackRoute);
  return fallbackRoute;
};

// Known Bogo City, Cebu locations dictionary for instant, accurate local resolution
const BOGO_LOCAL_COORDS = {
  'lepiten': { latitude: 11.0278, longitude: 124.0355 },
  'san vicente': { latitude: 11.0550, longitude: 124.0216 },
  'p. rodriguez': { latitude: 11.0485, longitude: 124.0038 },
  'rodriguez': { latitude: 11.0485, longitude: 124.0038 },
  'poblacion': { latitude: 11.0485, longitude: 124.0038 },
  'taytayan': { latitude: 11.0430, longitude: 124.0080 },
  'gairan': { latitude: 11.0554, longitude: 124.0217 },
  'cogon': { latitude: 11.0380, longitude: 124.0150 },
  'dakit': { latitude: 11.0620, longitude: 124.0120 },
  'nailon': { latitude: 11.0850, longitude: 124.0350 },
  'libertad': { latitude: 11.0310, longitude: 124.0020 },
  'siocon': { latitude: 11.0680, longitude: 124.0250 },
  'cantecson': { latitude: 11.0410, longitude: 123.9890 },
  'sudtongan': { latitude: 11.0720, longitude: 124.0010 },
  'la paz': { latitude: 11.0720, longitude: 124.0010 },
  'crmc': { latitude: 11.0505, longitude: 124.0045 },
  'cebu roosevelt': { latitude: 11.0505, longitude: 124.0045 },
};

export const geocodeAddress = async (address) => {
  const query = String(address || '').trim();
  if (!query) return null;

  const lower = query.toLowerCase();
  // Check local Bogo City dictionary first
  for (const [key, coords] of Object.entries(BOGO_LOCAL_COORDS)) {
    if (lower.includes(key)) {
      return coords;
    }
  }

  if (geocodeCache.has(query)) {
    return geocodeCache.get(query);
  }

  try {
    const searchQuery = lower.includes('bogo') ? query : `${query}, Bogo City, Cebu`;
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        key: LOCATIONIQ_ACCESS_TOKEN,
        q: searchQuery,
        format: 'json',
        limit: 1,
      },
      timeout: 5000,
    });
    const result = response.data?.[0];
    if (result?.lat && result?.lon) {
      const coords = { latitude: Number(result.lat), longitude: Number(result.lon) };
      geocodeCache.set(query, coords);
      return coords;
    }
  } catch (error) {
    console.warn('Geocoding notice:', error?.response?.status || error?.message);
  }

  // Default near Bogo City center if geocoding cannot resolve
  return { latitude: 11.0505, longitude: 124.0045 };
};