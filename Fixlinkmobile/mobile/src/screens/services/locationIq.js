import axios from 'axios';

export const LOCATIONIQ_ACCESS_TOKEN = 'pk.0070e64f51684d84b2f6f79af4b4870d';
const BASE_URL = 'https://us1.locationiq.com/v1';

export const getLocationIqTileUrl = () => (
  `https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_ACCESS_TOKEN}`
);

export const getDrivingRoute = async (startCoords, endCoords) => {
  try {
    const coordsString = `${startCoords.longitude},${startCoords.latitude};${endCoords.longitude},${endCoords.latitude}`;
    const response = await axios.get(`${BASE_URL}/directions/driving/${coordsString}`, {
      params: {
        key: LOCATIONIQ_ACCESS_TOKEN,
        steps: true,
        geometries: 'geojson',
      },
    });
    return response.data.routes[0];
  } catch (error) {
    console.error('Directions Error:', error);
    return null;
  }
};

export const geocodeAddress = async (address) => {
  if (!String(address || '').trim()) return null;
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        key: LOCATIONIQ_ACCESS_TOKEN,
        q: address,
        format: 'json',
        limit: 1,
      },
    });
    const result = response.data?.[0];
    if (!result) return null;
    return { latitude: Number(result.lat), longitude: Number(result.lon) };
  } catch (error) {
    console.error('Geocoding Error:', error);
    return null;
  }
};