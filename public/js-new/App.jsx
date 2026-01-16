// ==================== App 主组件 ====================
const { useState, useEffect } = React;

const App = () => {
    const [view, setView] = useState('login');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('darkMode') === 'true';
    });
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    useEffect(() => {
        // 检查是否已登录（通过尝试访问需要认证的接口）
        const checkLoginStatus = async () => {
            try {
                const response = await fetch('/admin/tokens', {
                    credentials: 'include'
                });
                if (response.status === 200) {
                    setView('dashboard');
                }
            } catch (e) {
                // 登录检查失败，保持在登录页面
            }
        };
        checkLoginStatus();
    }, []);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
        }
    }, [darkMode]);

    const toggleDarkMode = () => setDarkMode(!darkMode);

    const handleLogout = async () => {
        try {
            // 调用后端登出接口清除Cookie
            await fetch('/admin/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            // 忽略错误，继续前端登出流程
        }

        // 清除旧版本可能残留的localStorage token
        localStorage.removeItem('authToken');
        setView('login');
        setShowLogoutConfirm(false);
        addToast('已退出登录', 'info');
    };

    if (view === 'login') return <Login onLogin={() => setView('dashboard')} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Icon name="Zap" size={16} />
                    </div>
                    <span className="sidebar-title">Antigravity</span>
                </div>
                <nav className="sidebar-nav">
                    <button onClick={() => setView('dashboard')} className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}>
                        <Icon name="LayoutGrid" size={18} /> Token 管理
                    </button>
                    <button onClick={() => setView('cli')} className={`nav-item ${view === 'cli' ? 'active' : ''}`}>
                        <Icon name="Terminal" size={18} /> CLI Token
                    </button>
                    <button onClick={() => setView('settings')} className={`nav-item ${view === 'settings' ? 'active' : ''}`}>
                        <Icon name="Settings" size={18} /> 系统设置
                    </button>
                    <button onClick={() => setView('logs')} className={`nav-item ${view === 'logs' ? 'active' : ''}`}>
                        <Icon name="FileText" size={18} /> 日志管理
                    </button>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={() => {
                        localStorage.setItem('uiVersion', 'old');
                        window.location.href = '/index.html';
                    }} className="nav-item">
                        <Icon name="ExternalLink" size={18} /> 切换到经典版
                    </button>
                    <button onClick={toggleDarkMode} className="nav-item">
                        {darkMode ? <Icon name="Sun" size={18} /> : <Icon name="Moon" size={18} />}
                        {darkMode ? '切换亮色模式' : '切换暗色模式'}
                    </button>
                    <button onClick={() => setShowLogoutConfirm(true)} className="nav-item logout-btn">
                        <Icon name="LogOut" size={18} /> 退出登录
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Mobile Header */}
                <div className="mobile-header">
                    <div className="mobile-header-title">
                        <Icon name="Zap" size={18} /> Antigravity
                    </div>
                    <div className="mobile-header-actions">
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                className="btn btn-ghost btn-icon"
                                title="菜单"
                            >
                                <Icon name="Menu" size={18} />
                            </button>
                            {showMobileMenu && (
                                <div style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '100%',
                                    marginTop: '8px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    minWidth: '160px',
                                    zIndex: 100
                                }}>
                                    <button
                                        onClick={() => { setView('dashboard'); setShowMobileMenu(false); }}
                                        className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
                                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Icon name="LayoutGrid" size={16} /> Token 管理
                                    </button>
                                    <button
                                        onClick={() => { setView('cli'); setShowMobileMenu(false); }}
                                        className={`nav-item ${view === 'cli' ? 'active' : ''}`}
                                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Icon name="Terminal" size={16} /> CLI Token
                                    </button>
                                    <button
                                        onClick={() => { setView('settings'); setShowMobileMenu(false); }}
                                        className={`nav-item ${view === 'settings' ? 'active' : ''}`}
                                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Icon name="Settings" size={16} /> 系统设置
                                    </button>
                                    <button
                                        onClick={() => { setView('logs'); setShowMobileMenu(false); }}
                                        className={`nav-item ${view === 'logs' ? 'active' : ''}`}
                                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Icon name="FileText" size={16} /> 日志管理
                                    </button>
                                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }}></div>
                                    <button
                                        onClick={() => {
                                            localStorage.setItem('uiVersion', 'old');
                                            window.location.href = '/index.html';
                                        }}
                                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Icon name="ExternalLink" size={16} /> 切换到经典版
                                    </button>
                                    <button
                                        onClick={() => { setShowLogoutConfirm(true); setShowMobileMenu(false); }}
                                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red-500)' }}
                                    >
                                        <Icon name="LogOut" size={16} /> 退出登录
                                    </button>
                                </div>
                            )}
                        </div>
                        <button onClick={toggleDarkMode} className="btn btn-ghost btn-icon" title={darkMode ? '切换亮色模式' : '切换暗色模式'}>
                            {darkMode ? <Icon name="Sun" size={18} /> : <Icon name="Moon" size={18} />}
                        </button>
                    </div>
                </div>
                <div className="content-wrapper">
                    {view === 'dashboard' && <Dashboard />}
                    {view === 'cli' && <GeminiCLI />}
                    {view === 'settings' && <Settings darkMode={darkMode} />}
                    {view === 'logs' && <Logs />}
                </div>
            </main>

            {/* Logout Confirm */}
            <ConfirmModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="退出确认"
                message="确定要退出登录吗？"
            />
        </div>
    );
};

// 暴露到全局对象
Object.assign(globalThis, { App });
