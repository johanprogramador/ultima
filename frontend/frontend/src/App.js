import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Importación de autenticación
import { AuthProvider, useAuth } from "./components/auth";

// Importación de componentes globales
import InactivityHandler from "./components/InactivityHandler";
import SidebarMenu from "./components/SidebarMenu";

// Importación de páginas
import Login from "./pages/login";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Records from "./pages/Records";
import Movimiento from "./pages/Movimientos";
import History from "./pages/History";
import Services from "./pages/services";
import Sedes from "./pages/sedes";
import Devices from "./pages/Devices";
import Plans from './pages/plans';

// Componente para proteger rutas privadas
const ProtectedRoute = () => {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div style={{ display: "flex" }}>
      <SidebarMenu /> {/* Sidebar global para rutas protegidas */}
      <div style={{ flex: 1, padding: "20px" }}>
        <Outlet /> {/* Renderiza la página correspondiente */}
      </div>
    </div>
  );
};

// Componente que redirige a /dashboard si el usuario ya está autenticado
const RedirectIfAuthenticated = () => {
  const { token } = useAuth();
  return token ? <Navigate to="/dashboard" replace /> : <Login />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <InactivityHandler /> {/* Manejo de sesión inactiva */}
        {/* Configuración global de ToastContainer */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
        
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<RedirectIfAuthenticated />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Ruta raíz redirige según autenticación */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/services" element={<Services />} />
            <Route path="/sedes" element={<Sedes />} />
            <Route path="/records" element={<Records />} />
            <Route path="/history" element={<History />} />
            <Route path="/movimiento" element={<Movimiento />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/planos" element={<Plans />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;