    import { useEffect } from 'react';
    import api from '../services/api';
    import { useAuth } from './auth';

    const InactivityHandler = () => {
    const { token, logout } = useAuth();

    useEffect(() => {
        if (!token) return;

        let inactivityTimer;
        let keepaliveInterval;
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        const resetTimer = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            // Primero intentar hacer keepalive antes de cerrar sesión
            const performLogout = async () => {
            try {
                await api.post('auth/keepalive/', {}, {
                headers: { Authorization: `Bearer ${token}` }
                });
                // Si el keepalive tiene éxito, reiniciamos el timer
                resetTimer();
            } catch (error) {
                console.error('Keepalive error:', error);
                logout();
                window.location.href = '/login';
            }
            };
            performLogout();
        }, 1800000000000); // 30 minutos de inactividad
        };

        const setupListeners = () => {
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });
        resetTimer(); // Inicia el timer por primera vez
        };

        setupListeners();

        return () => {
        events.forEach(event => {
            window.removeEventListener(event, resetTimer);
        });
        clearTimeout(inactivityTimer);
        if (keepaliveInterval) clearInterval(keepaliveInterval);
        };
    }, [token, logout]);

    return null;
    };

    export default InactivityHandler;