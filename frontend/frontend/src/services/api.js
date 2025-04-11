import axios from 'axios';
import AuthService from './AuthService'; // Si tienes un servicio para login/logout

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
});

// Interceptor para agregar el token a las solicitudes
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

// Interceptor para manejar respuestas de error y refrescar el token si expira
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      console.warn("Token expirado, intentando refrescar...");

      const refreshToken = sessionStorage.getItem('refresh') || localStorage.getItem('refresh');
      if (!refreshToken) {
        console.error("No hay refresh token, cerrando sesión...");
        AuthService.logout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('http://localhost:8000/api/auth/refresh/', { refresh: refreshToken });
        const newToken = response.data.access;
        
        sessionStorage.setItem('token', newToken);
        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        // Reintenta la solicitud original con el nuevo token
        error.config.headers['Authorization'] = `Bearer ${newToken}`;
        return api(error.config);
      } catch (refreshError) {
        console.error("Error al refrescar token, cerrando sesión...");
        AuthService.logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
