// ==================== Login 组件 ====================
const { useState } = React;

const Login = ({ onLogin, darkMode, toggleDarkMode }) => {
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { addToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            addToast('请填写用户名和密码', 'warning');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'  // 接收Cookie
            });

            const data = await response.json();
            if (data.success) {
                // 不再使用localStorage存储token，改用HttpOnly Cookie（更安全）
                // Cookie由后端自动设置，前端无需手动处理
                addToast('登录成功！', 'success');
                onLogin();
            } else {
                addToast(data.message || '用户名或密码错误', 'error');
            }
        } catch (error) {
            addToast('登录失败: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-theme-toggle">
                <Button variant="secondary" onClick={toggleDarkMode} size="icon" style={{ width: '40px', height: '40px' }}>
                    {darkMode ? <Icon name="Sun" size={20} /> : <Icon name="Moon" size={20} />}
                </Button>
            </div>
            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon">
                        <Icon name="Zap" size={24} />
                    </div>
                </div>
                <h1 className="login-title">Antigravity Console</h1>
                <p className="login-subtitle">管理员登录</p>
                <form onSubmit={handleSubmit} className="login-form">
                    <Input label="Username" placeholder="" value={username} onChange={(e) => setUsername(e.target.value)} />
                    <Input label="Password" type="password" placeholder="" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <Button type="submit" size="lg" className="w-full" loading={loading}>登 录</Button>
                </form>
                <p className="login-hint">请使用管理员账户登录</p>
            </div>
        </div>
    );
};

// 暴露到全局对象
Object.assign(globalThis, { Login });
