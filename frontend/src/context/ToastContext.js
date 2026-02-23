'use client';
import { useState, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="toast-container">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast-${t.type} animate-in`}>
                        {t.message}
                    </div>
                ))}
            </div>
            <style jsx>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none;
        }
        .toast {
          padding: 12px 24px;
          border-radius: 50px;
          color: white;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-size: 0.9rem;
          pointer-events: auto;
          text-align: center;
          min-width: 200px;
        }
        .toast-success { background-color: var(--success-color); }
        .toast-error { background-color: #e53935; }
        .toast-warning { background-color: var(--warning-color); }
      `}</style>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
