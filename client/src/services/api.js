import axios from 'axios';
import { getToken } from '../context/AuthContext';

const API_BASE = 'https://llms.webypixels.com/api';
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lldms_token');
      localStorage.removeItem('lldms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
