import axios from 'axios';

// Configuración de axios
const API_BASE_URL = 'http://127.0.0.1:8000/'; // Ajusta según tu backend

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para agregar el token de autenticación (si es necesario)
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token'); // Obtén el token desde el localStorage
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response.status === 401) {
            // Redirigir al usuario a la página de login si no está autenticado
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;