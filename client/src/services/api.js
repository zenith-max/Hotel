import axios from 'axios';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${backendBaseUrl}/api`,
  withCredentials: true,
});

export default api;
