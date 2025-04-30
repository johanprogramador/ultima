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
import { useAuth } from '../components/auth';

const Login = () => {
    const { login } = useAuth();
    const [forgotPassword, setForgotPassword] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [sedeId, setSedeId] = useState('');
    const [sedes, setSedes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [sedesError, setSedesError] = useState(null);
    const [isAdminLogin, setIsAdminLogin] = useState(false);
    const navigate = useNavigate();
    
    // Cargar sedes (solo para login normal/coordinador)
    useEffect(() => {
        const fetchSedes = async () => {
            if (isAdminLogin) return;
            
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

        if (!isAdminLogin) {
            fetchSedes();
        }
    }, [isAdminLogin]);

    const validateForm = () => {
        const newErrors = {};
        if (!username.trim()) newErrors.username = 'Usuario requerido';
        if (!password) newErrors.password = 'Contraseña requerida';
        if (!isAdminLogin && !sedeId) newErrors.sedeId = 'Debe seleccionar una sede';
        
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
                sede_id: isAdminLogin ? null : sedeId
            });
    
            const userData = {
                username: data.username,
                email: data.email,
                rol: data.rol,
                sede_id: data.sede_id,
                sede_nombre: data.sede_nombre,
            };
    
            await login(data.access, userData);
            sessionStorage.removeItem('failedAttempts');
            
            let redirectPath = '/';
            if (data.rol === 'admin') {
                redirectPath = '/admin/dashboard';
            } else if (data.rol === 'coordinador') {
                redirectPath = '/coordinador/dashboard';
            }
            
            navigate(redirectPath);
            toast.success(`Bienvenido ${data.username} (${data.rol === 'admin' ? 'Administrador' : 'Coordinador'})`);
            
        } catch (error) {
            const newAttempts = failedAttempts + 1;
            setFailedAttempts(newAttempts);
            sessionStorage.setItem('failedAttempts', newAttempts);
            
            let errorMessage = 'Error de autenticación';
            if (error.response) {
                if (error.response.status === 401) {
                    errorMessage = 'Credenciales inválidas';
                } else if (error.response.status === 403) {
                    errorMessage = error.response.data.error || 'No tiene permisos para esta sede';
                } else if (error.response.data) {
                    errorMessage = error.response.data.error || 
                                error.response.data.detail || 
                                error.response.data.message || 
                                'Error en el servidor';
                }
            }
            
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const toggleAdminLogin = () => {
        setIsAdminLogin(!isAdminLogin);
        setUsername('');
        setPassword('');
        setSedeId('');
        setErrors({});
    };

    if (forgotPassword) {
        return <ForgotPassword onBackToLogin={() => setForgotPassword(false)} />;
    }

    return (
        <div className="login-container">
            <div className={`container ${isAdminLogin ? 'admin-mode' : ''}`}>
                <div className="form-container sign-in">
                    <form onSubmit={handleSubmit}>
                        <Logo className="logo" style={{ width: '220px', height: 'auto', padding: '10px' }} />
                        <h5>{isAdminLogin ? 'Acceso Administrativo' : 'Iniciar sesión'}</h5>
                        
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
                        
                        {!isAdminLogin && (
                            <>
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
                            </>
                        )}
                        
                        <button 
                            type="submit" 
                            disabled={loading || failedAttempts >= 3}
                        >
                            {loading ? 'Cargando...' : isAdminLogin ? 'Acceder como Admin' : 'Iniciar sesión'}
                        </button>
                        
                        {!isAdminLogin && (
                            <Link to="#" onClick={() => !loading && setForgotPassword(true)}>
                                ¿Olvidaste tu contraseña?
                            </Link>
                        )}

                        {isAdminLogin && (
                            <Link to="#" onClick={toggleAdminLogin} className="back-to-normal">
                                ← Volver al inicio de sesión normal
                            </Link>
                        )}
                        
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
                            <img src={EInventoryLogo || "/placeholder.svg"} alt="Logo de E-Inventory" className="logo-e" />
                            <p>Sistema de inventario y control</p>
                            {!isAdminLogin && (
                                <button 
                                    className="admin-login-btn" 
                                    onClick={toggleAdminLogin}
                                >
                                    Ingresar como administrador
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;