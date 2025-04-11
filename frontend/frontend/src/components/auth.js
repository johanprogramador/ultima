import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState(() => {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const userData = JSON.parse(sessionStorage.getItem("userData") || localStorage.getItem("userData") || 'null');
        
        // Inicializar con datos extendidos si existen
        return { 
            token, 
            user: userData ? {
                ...userData,
                isAdmin: userData.is_admin || false,
                sedeId: userData.sede_id || null,
                sedeNombre: userData.sede_nombre || null
            } : null
        };
    });

    const [isVerifyingToken, setIsVerifyingToken] = useState(false);
    const keepaliveIntervalRef = useRef(null);

    const clearKeepaliveInterval = useCallback(() => {
        if (keepaliveIntervalRef.current) {
            clearInterval(keepaliveIntervalRef.current);
            keepaliveIntervalRef.current = null;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('auth/logout/');
        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("userData");
            localStorage.removeItem("token");
            localStorage.removeItem("userData");
            setAuthState({ token: null, user: null });
            clearKeepaliveInterval();
        }
    }, [clearKeepaliveInterval]);

    const verifyToken = useCallback(async (token) => {
        if (!token || isVerifyingToken) return false;

        setIsVerifyingToken(true);
        try {
            const response = await api.get('validate/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data.is_valid;
        } catch (error) {
            console.error('Error verifying token:', error);
            toast.error('Error al verificar el token. Inicia sesión nuevamente.');
            return false;
        } finally {
            setIsVerifyingToken(false);
        }
    }, [isVerifyingToken]);

    const refreshToken = useCallback(async () => {
        try {
            const response = await api.post('auth/refresh/', { token: authState.token });
            if (response.data.token) {
                // Mantener los datos del usuario al refrescar
                const newState = { 
                    token: response.data.token, 
                    user: authState.user 
                };
                setAuthState(newState);
                localStorage.setItem("token", response.data.token);
                sessionStorage.setItem("token", response.data.token);
                return true;
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            toast.warning('Tu sesión ha expirado, por favor inicia sesión de nuevo.');
            logout();
        }
        return false;
    }, [authState.token, authState.user, logout]);

    const startKeepaliveInterval = useCallback((token) => {
        if (keepaliveIntervalRef.current) {
            clearInterval(keepaliveIntervalRef.current);
        }

        keepaliveIntervalRef.current = setInterval(async () => {
            try {
                await api.get('auth/keepalive/', {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.error('Keepalive failed:', error);
                const refreshed = await refreshToken();
                if (!refreshed) {
                    logout();
                }
            }
        }, 5 * 60 * 1000); // 5 minutos
    }, [refreshToken, logout]);

    const login = useCallback(async (token, userData, rememberMe = false) => {
        const storage = rememberMe ? localStorage : sessionStorage;
        const isValid = await verifyToken(token);
        
        if (!isValid) {
            throw new Error('Token inválido o expirado');
        }

        // Estructura extendida del usuario
        const extendedUserData = {
            ...userData,
            isAdmin: userData.is_admin || false,
            sedeId: userData.sede_id || null,
            sedeNombre: userData.sede_nombre || null
        };

        storage.setItem("token", token);
        storage.setItem("userData", JSON.stringify(extendedUserData));
        setAuthState({ token, user: extendedUserData });
        startKeepaliveInterval(token);
        
        return extendedUserData;
    }, [verifyToken, startKeepaliveInterval]);

    // Verificación periódica del token
    useEffect(() => {
        const checkToken = async () => {
            if (authState.token && !isVerifyingToken) {
                const isValid = await verifyToken(authState.token);
                if (!isValid) {
                    const refreshed = await refreshToken();
                    if (!refreshed) {
                        toast.warning('Tu sesión ha expirado');
                        logout();
                    }
                } else {
                    startKeepaliveInterval(authState.token);
                }
            }
        };

        checkToken();
        const interval = setInterval(checkToken, 15 * 60 * 1000); // 15 minutos

        return () => {
            clearInterval(interval);
            clearKeepaliveInterval();
        };
    }, [authState.token, verifyToken, refreshToken, logout, isVerifyingToken, startKeepaliveInterval, clearKeepaliveInterval]);

    // Limpieza al desmontar
    useEffect(() => {
        return () => {
            clearKeepaliveInterval();
        };
    }, [clearKeepaliveInterval]);

    const value = {
        token: authState.token,
        user: authState.user,
        isAuthenticated: !!authState.token,
        isAdmin: authState.user?.isAdmin || false,
        sedeId: authState.user?.sedeId || null,
        sedeNombre: authState.user?.sedeNombre || null,
        isVerifyingToken,
        login,
        logout,
        verifyToken,
        refreshToken
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
};