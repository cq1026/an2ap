// ==================== Toast Context ====================
const { createContext, useState, useContext } = React;

const ToastContext = createContext();

const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast ${toast.type} animate-slide-up`}>
                        {toast.type === 'success' && <Icon name="Check" size={16} />}
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const useToast = () => useContext(ToastContext);

// 暴露到全局对象
Object.assign(globalThis, { ToastContext, ToastProvider, useToast });
