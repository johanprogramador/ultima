    import { useEffect } from 'react';
    import api from '../services/api';
    import { useAuth } from './auth';

    const InactivityHandler = () => {
    const { token, logout } = useAuth();

    useEffect(() => {
        if (!token) return;

        let inactivityTimer;
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        const resetTimer = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            logout();
            window.location.href = '/login';
        }, 1800000); // 30 minutos
        };

        const setupListeners = () => {
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });
        resetTimer(); // Inicia el timer por primera vez
        };

        const keepalive = async () => {
        try {
            await api.post('auth/keepalive/', {}, {
            headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Keepalive error:', error);
            logout();
            window.location.href = '/login';
        }
        };

        setupListeners();
        const keepaliveInterval = setInterval(keepalive, 350000); // 4 minutos

        return () => {
        events.forEach(event => {
            window.removeEventListener(event, resetTimer);
        });
        clearTimeout(inactivityTimer);
        clearInterval(keepaliveInterval);
        };
    }, [token, logout]);

    return null;
    };

    export default InactivityHandler;