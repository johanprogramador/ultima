import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ReactComponent as Logo } from '../assets/logo.svg';
import EInventoryLogo from '../assets/E-Inventory.png';
import '../styles/Login.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from "react-router-dom";
import ForgotPassword from '../components/ForgotPassword';
import api from '../services/api';
import { useAuth } from '../components/auth';  // 💡 Importamos el contexto de autenticación

const Login = () => {
    const { login } = useAuth();  // 💡 Obtenemos la función login del contexto
    const [forgotPassword, setForgotPassword] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [sedeId, setSedeId] = useState('');
    const [sedes, setSedes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState({});
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [sedesError, setSedesError] = useState(null);
    const navigate = useNavigate();
    
    // Cargar sedes
    useEffect(() => {
        const fetchSedes = async () => {
            setLoading(true);
            setSedesError(null);
            try {
                const response = await api.get('sede/');
                setSedes(response.data.sedes || []);
            } catch (error) {
                setSedesError('Error al cargar las sedes');
                toast.error('Error al cargar las sedes');
            } finally {
                setLoading(false);
            }
        };

        fetchSedes();
    }, []);

    const validateForm = () => {
        const newErrors = {};
        if (!username.trim()) newErrors.username = 'Usuario requerido';
        if (!password) newErrors.password = 'Contraseña requerida';
        if (!sedeId) newErrors.sedeId = 'Debe seleccionar una sede';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
    
        if (failedAttempts >= 3) {
            toast.error('Demasiados intentos fallidos. Espere antes de intentar nuevamente');
            return;
        }
    
        setLoading(true);
        
        try {
            const { data } = await api.post('login/', { 
                username, 
                password,
                sede_id: sedeId, // Asegúrate que el backend use este parámetro
            });
    
            // 💡 Datos extendidos para el contexto de autenticación
            const userData = {
                username: data.username,
                email: data.email,
                is_admin: data.is_admin || false, // Nuevo campo desde el backend
                sede_id: data.sede_id || sedeId, // ID de la sede
                sede_nombre: data.sede_nombre || sedes.find(s => s.id === parseInt(sedeId))?.nombre,
                // ... otros campos que necesites conservar
            };
    
            // 💡 Login con datos extendidos
            await login(data.access, userData, rememberMe);
    
            // Resetear intentos fallidos
            sessionStorage.removeItem('failedAttempts');
            
            // 💡 Redirección según rol
            const redirectPath = userData.is_admin ? '/admin/dashboard' : '/dashboard';
            navigate(redirectPath);
            
            toast.success(`Bienvenido ${data.username} (${userData.is_admin ? 'Admin' : 'Usuario'})`);
            
        } catch (error) {
            setFailedAttempts(prev => prev + 1);
            sessionStorage.setItem('failedAttempts', failedAttempts + 1);
            
            let errorMessage = 'Error de autenticación';
            if (error.response) {
                if (error.response.status === 401) {
                    errorMessage = 'Credenciales inválidas';
                } else if (error.response.status === 403) {
                    errorMessage = 'No tiene permisos para esta sede';
                } else if (error.response.data) {
                    errorMessage = error.response.data.detail || 
                                   error.response.data.message || 
                                   'Error en el servidor';
                }
            }
            
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    if (forgotPassword) {
        return <ForgotPassword onBackToLogin={() => setForgotPassword(false)} />;
    }

    return (
        <div className="login-container">
            <div className="container">
                <div className="form-container sign-in">
                    <form onSubmit={handleSubmit}>
                        <Logo className="logo" style={{ width: '220px', height: 'auto', padding: '10px' }} />
                        <span>Iniciar sesión</span>
                        
                        <input
                            type="text"
                            placeholder="Nombre de usuario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            disabled={loading || failedAttempts >= 3}
                            className={errors.username ? 'error-input' : ''}
                        />
                        {errors.username && <span className="error-message">{errors.username}</span>}
                        
                        <input
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            disabled={loading || failedAttempts >= 3}
                            className={errors.password ? 'error-input' : ''}
                        />
                        {errors.password && <span className="error-message">{errors.password}</span>}
                        
                        <select 
                            value={sedeId} 
                            onChange={(e) => setSedeId(e.target.value)} 
                            disabled={loading || sedes.length === 0 || failedAttempts >= 3}
                            className={errors.sedeId ? 'error-input' : ''}
                        >
                            <option value="">Seleccionar sede</option>
                            {sedes.map(sede => (
                                <option key={sede.id} value={sede.id}>
                                    {sede.nombre} - {sede.ciudad}
                                </option>
                            ))}
                        </select>
                        {errors.sedeId && <span className="error-message">{errors.sedeId}</span>}
                        
                        {sedesError && <span className="error-message">{sedesError}</span>}
                        
                        <div className="remember-me">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                disabled={loading}
                            />
                            <label htmlFor="rememberMe">Recordar sesión</label>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading || failedAttempts >= 3}
                        >
                            {loading ? 'Cargando...' : 'Entrar'}
                        </button>
                        
                        <Link to="#" onClick={() => !loading && setForgotPassword(true)}>
                            ¿Olvidaste tu contraseña?
                        </Link>
                        
                        {failedAttempts >= 3 && (
                            <p className="error-message">
                                Demasiados intentos fallidos. Intente más tarde.
                            </p>
                        )}
                    </form>
                </div>

                <div className="toggle-container">
                    <div className="toggle">
                        <div className="toggle-panel toggle-right">
                            <img src={EInventoryLogo} alt="Logo de E-Inventory" className="logo-e" />
                            <p>Sistema de inventario y control</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
