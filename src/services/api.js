import axios from 'axios';

// Log para debug (aparecerá no F12 do navegador)
console.log("Conectando em:", import.meta.env.VITE_API_BASE_URL);

const api = axios.create({
  // Garanta que a baseURL termina com /api
  baseURL: import.meta.env.VITE_API_BASE_URL + '/api'
});

// Interceptor para adicionar o Token JWT automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;