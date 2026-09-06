import axios from 'axios';

// IMPORTANT NOTE FOR MOBILE TESTING:
// - If using Android Emulator, use 'http://10.0.2.2:5000'
// - If using iOS Simulator, use 'http://localhost:5000'
// - If using a physical device, use your computer's local network IP address (e.g., 'http://192.168.x.x:5000')
const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Repair Requests API calls
export const submitRepairRequest = async (requestData) => {
  try {
    const response = await api.post('/requests', requestData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network Error' };
  }
};

export const fetchRepairRequests = async () => {
  try {
    const response = await api.get('/requests');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network Error' };
  }
};

export default api;