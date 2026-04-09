import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// INTERCEPTOR DE RESPOSTA
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;

    // 🛡️ Se for erro 429, dispara um alarme global para o Vue.js escutar
    if (status === 429) {
      window.dispatchEvent(new CustomEvent('api-rate-limit'));
      return Promise.reject(error);
    }

    // O seu código original...
    if (status === 401 || status === 403) {
      if (window.location.pathname === '/login' || (error.config && error.config.url.includes('/login'))) {
        return Promise.reject(error);
      }
      localStorage.clear();
      window.location.href = '/login'; 
    }
    
    return Promise.reject(error);
  }
);

export default api;