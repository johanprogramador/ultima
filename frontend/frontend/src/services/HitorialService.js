// src/services/apiService.js
import axios from 'axios';
import { store } from '../store';
import { logout } from '../features/auth/authSlice';

// Configuración base de axios
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para añadir token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/refresh/`,
          { refresh: refreshToken }
        );
        
        localStorage.setItem('access_token', response.data.access);
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Servicio específico para Historial
export const historialService = {
  getHistorial: async (params = {}) => {
    try {
      const response = await apiClient.get('/historial/', { params });
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al obtener el historial',
        status: error.response?.status || 500
      };
    }
  },
  
  getFilterOptions: async () => {
    try {
      const response = await apiClient.get('/historial/opciones_filtro/');
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al obtener opciones de filtro',
        status: error.response?.status || 500
      };
    }
  }
};

// Exportación por defecto (opcional)
export default apiClient;