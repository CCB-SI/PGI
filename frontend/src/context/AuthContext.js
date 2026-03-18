'use client';
import { createContext, useContext, useSyncExternalStore } from 'react';

const AuthContext = createContext();

const SERVER_SNAPSHOT = { user: null, token: null, ready: false };

function getServerAuthSnapshot() {
    return SERVER_SNAPSHOT;
}

// Cache last-seen raw values so we can return the same object reference
// when nothing has changed — required to avoid infinite loops in useSyncExternalStore.
let _cachedToken = undefined;
let _cachedUserStr = undefined;
let _cachedSnapshot = SERVER_SNAPSHOT;

function readClientAuthSnapshot() {
    if (typeof window === 'undefined') {
        return SERVER_SNAPSHOT;
    }

    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    // Return same reference when localStorage hasn't changed
    if (storedToken === _cachedToken && storedUser === _cachedUserStr) {
        return _cachedSnapshot;
    }

    _cachedToken = storedToken;
    _cachedUserStr = storedUser;

    if (storedToken && storedUser) {
        try {
            _cachedSnapshot = { user: JSON.parse(storedUser), token: storedToken, ready: true };
        } catch (e) {
            console.error('Erro ao carregar sessão', e);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            _cachedToken = null;
            _cachedUserStr = null;
            _cachedSnapshot = { user: null, token: null, ready: true };
        }
    } else {
        _cachedSnapshot = { user: null, token: null, ready: true };
    }

    return _cachedSnapshot;
}

function subscribeAuth(callback) {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const onStorage = (event) => {
        if (!event.key || event.key === 'token' || event.key === 'user') {
            callback();
        }
    };

    const onAuthChange = () => callback();

    window.addEventListener('storage', onStorage);
    window.addEventListener('auth-change', onAuthChange);

    return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('auth-change', onAuthChange);
    };
}

function notifyAuthChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-change'));
    }
}

export function AuthProvider({ children }) {
    const authState = useSyncExternalStore(
        subscribeAuth,
        readClientAuthSnapshot,
        getServerAuthSnapshot,
    );

    const { user, token } = authState;
    const loading = !authState.ready;

    const login = (newToken, newUserData) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUserData));
        notifyAuthChanged();
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        notifyAuthChanged();
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
