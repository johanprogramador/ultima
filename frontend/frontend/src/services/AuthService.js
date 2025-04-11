// src/services/AuthService.js
import axios from "axios";

const API_BASE_URL = "http://localhost:8000/auth"; // Ajusta con la URL de tu backend

const AuthService = {
  login: async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login/`, { username, password });

      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.access}`;

      return response.data;
    } catch (error) {
      console.error("Error en login:", error.response?.data || error.message);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    delete axios.defaults.headers.common["Authorization"];
    window.location.href = "/login";
  },

  refreshToken: async () => {
    try {
      const refresh = localStorage.getItem("refresh");
      if (!refresh) throw new Error("No hay refresh token disponible.");

      const { data } = await axios.post(`${API_BASE_URL}/refresh/`, { refresh });

      localStorage.setItem("access", data.access);
      axios.defaults.headers.common["Authorization"] = `Bearer ${data.access}`;

      return data.access;
    } catch (error) {
      console.error("Error al refrescar token:", error);
      AuthService.logout();
    }
  }
};

export default AuthService;
