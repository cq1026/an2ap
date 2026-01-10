// ==================== 基础UI组件 ====================
const { useState, useEffect, useRef } = React;

const Button = ({ children, variant = 'primary', size = 'md', className = "", onClick, loading, disabled, title, type = "button" }) => {
    const variantClass = `btn-${variant}`;
    const sizeClass = `btn-${size}`;
    const loadingClass = loading ? 'btn-loading' : '';

    return (
        <button
            type={type}
            className={`btn ${variantClass} ${sizeClass} ${loadingClass} ${className}`}
            onClick={onClick}
            disabled={disabled || loading}
            title={title}
        >
            {children}
        </button>
    );
};

const Card = ({ children, className = "", ...props }) => (
    <div className={`card ${className}`} {...props}>{children}</div>
);

const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = "max-w-lg" }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="modal-overlay animate-fade-in">
            <div className={`modal-container ${maxWidth} animate-slide-up`}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button onClick={onClose} className="modal-close">
                        <Icon name="X" />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>,
        document.body
    );
};

const Input = ({ label, help, className = "", ...props }) => (
    <div className={`form-group ${className}`}>
        {label && <label className="form-label">{label}</label>}
        <input className="form-input" {...props} />
        {help && <p className="form-help">{help}</p>}
    </div>
);

const Select = ({ label, help, options, className = "", ...props }) => (
    <div className={`form-group ${className}`}>
        {label && <label className="form-label">{label}</label>}
        <select className="form-select" {...props}>
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {help && <p className="form-help">{help}</p>}
    </div>
);

const Toggle = ({ label, checked, onChange, help, className = "" }) => (
    <div className={`toggle-wrapper ${className}`}>
        <div className="toggle-switch" onClick={() => onChange(!checked)} style={{ cursor: 'pointer' }}>
            <input type="checkbox" className="toggle-input" checked={checked} onChange={() => { }} />
            <span className="toggle-slider"></span>
        </div>
        <div className="toggle-label" style={{ cursor: 'default' }}>
            <span className="toggle-label-text">{label}</span>
            {help && <span className="toggle-label-help">{help}</span>}
        </div>
    </div>
);

// 暴露到全局对象
Object.assign(globalThis, { Button, Card, Modal, Input, Select, Toggle });
