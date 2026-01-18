// ==================== 模态框组件 ====================
const { useState, useEffect, useRef } = React;

const PasswordModal = ({ isOpen, onClose, onConfirm, title = "密码验证", message = "请输入管理员密码" }) => {
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password.trim()) {
            return;
        }
        setIsSubmitting(true);
        await onConfirm(password);
        setIsSubmitting(false);
        setPassword('');
    };

    const handleClose = () => {
        setPassword('');
        setIsSubmitting(false);
        onClose();
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="modal-overlay animate-fade-in">
            <div className="modal-container max-w-md animate-slide-up">
                <div className="modal-header">
                    <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon name="Lock" size={18} /> {title}
                    </h3>
                    <button onClick={handleClose} className="modal-close" disabled={isSubmitting}>
                        <Icon name="X" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <p style={{ marginBottom: '16px', color: 'var(--zinc-600)' }}>{message}</p>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="请输入密码"
                            className="form-input"
                            autoFocus
                            disabled={isSubmitting}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid var(--zinc-300)',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                    <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            取消
                        </Button>
                        <Button
                            type="submit"
                            disabled={!password.trim() || isSubmitting}
                        >
                            {isSubmitting ? '验证中...' : '确认'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return ReactDOM.createPortal(
        React.createElement('div', {
            className: 'modal-overlay animate-fade-in',
            style: { zIndex: 100 }
        },
            React.createElement('div', {
                className: 'confirm-modal animate-slide-up'
            },
                React.createElement('div', { className: 'confirm-modal-content' },
                    React.createElement('h3', { className: 'confirm-modal-title' }, title),
                    React.createElement('p', { className: 'confirm-modal-message' }, message)
                ),
                React.createElement('div', { className: 'confirm-modal-footer' },
                    React.createElement(Button, { variant: 'secondary', size: 'sm', onClick: onClose }, '取消'),
                    React.createElement(Button, { variant: 'danger', size: 'sm', onClick: onConfirm }, '确定')
                )
            )
        ),
        document.body
    );
};

const TokenDetailModal = ({ isOpen, onClose, token, onSave }) => {
    const [form, setForm] = useState({ projectId: '', email: '' });
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (token) {
            setForm({ projectId: token.projectId || '', email: token.email || '' });
        }
    }, [token]);

    if (!isOpen || !token) return null;

    const handleCopy = (text, label) => {
        navigator.clipboard.writeText(text).then(() => {
            addToast(`${label} 已复制`, 'success');
        }).catch(() => addToast('复制失败', 'error'));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(token.id, form);
            onClose();
        } catch (error) {
            addToast('保存失败: ' + error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const expireTime = formatTime(token.timestamp + token.expires_in * 1000);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Token 详情与编辑" footer={
            <>
                <Button variant="secondary" size="sm" onClick={onClose}>取消</Button>
                <Button size="sm" onClick={handleSubmit} loading={isSaving}>保存修改</Button>
            </>
        }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label">Access Token (只读)</label>
                        <button onClick={() => handleCopy(token.access_token || '', 'Access Token')} className="btn btn-ghost btn-icon" style={{ padding: '4px' }}>
                            <Icon name="Copy" size={14} />
                        </button>
                    </div>
                    <div className="font-mono" style={{
                        padding: '8px 12px',
                        background: 'var(--zinc-50)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--zinc-500)',
                        wordBreak: 'break-all',
                        maxHeight: '96px',
                        overflowY: 'auto'
                    }}>
                        {token.access_token || '暂无数据'}
                    </div>
                </div>

                <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label">Refresh Token (只读)</label>
                        <button onClick={() => handleCopy(token.id, 'Token ID')} className="btn btn-ghost btn-icon" style={{ padding: '4px' }}>
                            <Icon name="Copy" size={14} />
                        </button>
                    </div>
                    <div className="font-mono" style={{
                        padding: '8px 12px',
                        background: 'var(--zinc-50)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--zinc-500)',
                        wordBreak: 'break-all',
                        maxHeight: '96px',
                        overflowY: 'auto'
                    }}>
                        {token.id}
                    </div>
                </div>

                <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label">Project ID</label>
                        <button
                            onClick={async () => {
                                try {
                                    const response = await fetch(`/admin/tokens/${encodeURIComponent(token.id)}/fetch-project-id`, {
                                        method: 'POST',
                                        credentials: 'include'
                                    });
                                    const data = await response.json();
                                    if (data.success) {
                                        setForm({ ...form, projectId: data.projectId });
                                        addToast(`Project ID 获取成功: ${data.projectId}`, 'success');
                                    } else {
                                        addToast(`获取失败: ${data.message || '未知错误'}`, 'error');
                                    }
                                } catch (error) {
                                    addToast(`获取失败: ${error.message}`, 'error');
                                }
                            }}
                            className="btn btn-ghost btn-icon"
                            style={{ padding: '4px' }}
                            title="从API获取Project ID"
                        >
                            <Icon name="Globe" size={14} />
                        </button>
                    </div>
                    <input
                        className="form-input"
                        value={form.projectId}
                        onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                        placeholder="输入 Google Cloud Project ID"
                    />
                </div>

                <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="输入关联邮箱"
                />

                <div className="form-group">
                    <label className="form-label">过期时间</label>
                    <input className="form-input" value={expireTime} readOnly disabled />
                </div>
            </div>
        </Modal>
    );
};

const QuotaModal = ({ isOpen, onClose, token }) => {
    const [loading, setLoading] = useState(false);
    const [quotas, setQuotas] = useState({});
    const [requestCounts, setRequestCounts] = useState({});
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen && token) {
            loadQuotas(false);
        }
    }, [isOpen, token]);

    const loadQuotas = async (forceRefresh) => {
        if (!token) return;

        setLoading(true);
        try {
            const response = await authFetch(`/admin/tokens/${encodeURIComponent(token.id)}/quotas?refresh=${forceRefresh}`);
            const data = await response.json();

            if (data.success) {
                setQuotas(data.data.models);
                setRequestCounts(data.data.requestCounts || {});
                if (forceRefresh) {
                    addToast('额度数据已刷新', 'success');
                }
            } else {
                addToast('加载失败: ' + data.message, 'error');
            }
        } catch (error) {
            addToast('加载失败: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !token) return null;

    const grouped = { claude: [], gemini: [], other: [] };
    Object.entries(quotas).forEach(([modelId, quota]) => {
        const item = { modelId, ...quota };
        if (modelId.toLowerCase().includes('claude')) grouped.claude.push(item);
        else if (modelId.toLowerCase().includes('gemini')) grouped.gemini.push(item);
        else grouped.other.push(item);
    });

    // 对每个分组内的模型按字母顺序排序，确保顺序稳定
    grouped.claude.sort((a, b) => a.modelId.localeCompare(b.modelId));
    grouped.gemini.sort((a, b) => a.modelId.localeCompare(b.modelId));
    grouped.other.sort((a, b) => a.modelId.localeCompare(b.modelId));

    const getBarClass = (pct) => {
        if (pct > 50) return 'high';
        if (pct > 20) return 'medium';
        return 'low';
    };

    // 计算预估请求次数：每次请求消耗 0.6667% 的额度
    // 基于当前阈值计算总的可用次数，然后减去已记录的请求次数
    const calculateEstimatedRequests = (remaining, usedCount = 0) => {
        const percentage = remaining * 100;
        const totalFromThreshold = Math.floor(percentage / 0.6667);
        return Math.max(0, totalFromThreshold - usedCount);
    };

    const renderGroup = (title, emoji, items, groupKey) => {
        if (items.length === 0) return null;

        // 计算该分组的最小剩余额度和总预估次数
        const minRemaining = Math.min(...items.map(item => item.remaining));
        const usedCount = requestCounts[groupKey] || 0;
        const groupEstimated = calculateEstimatedRequests(minRemaining, usedCount);

        return (
            <div className="quota-group">
                <h4 className="quota-group-title">
                    <span>{emoji}</span> {title}
                    {groupEstimated > 0 && (
                        <span style={{
                            marginLeft: '8px',
                            fontSize: '12px',
                            color: 'var(--success)',
                            fontWeight: 'normal'
                        }}>
                            约{groupEstimated}次
                        </span>
                    )}
                </h4>
                <div className="quota-items">
                    {items.map(item => {
                        const pct = (item.remaining * 100).toFixed(1);
                        const estimated = calculateEstimatedRequests(item.remaining, usedCount);
                        return (
                            <div key={item.modelId} className="quota-item">
                                <div className="quota-item-header">
                                    <span className="quota-model-name">{item.modelId}</span>
                                    <div className="quota-reset-time">
                                        <Icon name="Clock" size={10} />
                                        <span>{item.resetTimeRaw ? formatTime(new Date(item.resetTimeRaw).getTime()) : item.resetTime}</span>
                                    </div>
                                </div>
                                <div className="quota-progress-bar">
                                    <div className={`quota-progress-fill ${getBarClass(pct)}`} style={{ width: `${pct}%` }}></div>
                                </div>
                                <div className="quota-progress-footer">
                                    <span className="quota-progress-label">剩余</span>
                                    <span className="quota-progress-value">
                                        {pct}%
                                        {estimated > 0 && (
                                            <span style={{ marginLeft: '6px', color: 'var(--success)', fontSize: '11px' }}>
                                                · 约{estimated}次
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="额度详情" maxWidth="max-w-lg" footer={
            <Button variant="secondary" size="sm" onClick={onClose}>关闭</Button>
        }>
            <div className="quota-header">
                <div className="quota-project">
                    <span className="quota-project-label">Project ID:</span> {token.projectId}
                </div>
                <button onClick={() => loadQuotas(true)} className={`quota-refresh ${loading ? 'loading' : ''}`} title="立即刷新额度">
                    <Icon name="RefreshCw" size={16} />
                </button>
            </div>

            {renderGroup('Claude 模型', '🤖', grouped.claude, 'claude')}
            {renderGroup('Gemini 模型', '💎', grouped.gemini, 'gemini')}
            {renderGroup('其他模型', '🔧', grouped.other, 'other')}
        </Modal>
    );
};

const AddTokenModal = ({ isOpen, onClose, onAdd }) => {
    const [activeTab, setActiveTab] = useState('oauth');
    const [loading, setLoading] = useState(false);
    const [manualForm, setManualForm] = useState({ accessToken: '', refreshToken: '', expiresIn: '3599' });
    const [oauthUrl, setOauthUrl] = useState('');
    const [oauthPort, setOauthPort] = useState(null);
    const { addToast } = useToast();

    useEffect(() => {
        if (!oauthPort) {
            setOauthPort(Math.floor(Math.random() * 10000) + 50000);
        }
    }, []);

    const getOAuthUrl = () => {
        const port = oauthPort || Math.floor(Math.random() * 10000) + 50000;
        const redirectUri = `http://localhost:${port}/oauth-callback`;
        return `https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&client_id=${CLIENT_ID}&prompt=consent&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&state=${Date.now()}`;
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualForm.accessToken || !manualForm.refreshToken) {
            addToast('请填写完整的Token信息', 'warning');
            return;
        }
        setLoading(true);
        try {
            const response = await authFetch('/admin/tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: manualForm.accessToken,
                    refresh_token: manualForm.refreshToken,
                    expires_in: parseInt(manualForm.expiresIn) || 3599
                })
            });

            const data = await response.json();
            if (data.success) {
                addToast('Token添加成功！', 'success');
                onAdd();
                onClose();
                setManualForm({ accessToken: '', refreshToken: '', expiresIn: '3599' });
            } else {
                addToast(data.message || '添加失败', 'error');
            }
        } catch (error) {
            addToast('添加失败: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthSubmit = async (e) => {
        e.preventDefault();
        if (!oauthUrl) {
            addToast('请输入回调URL', 'warning');
            return;
        }
        setLoading(true);
        try {
            const url = new URL(oauthUrl);
            const code = url.searchParams.get('code');
            const port = new URL(url.origin).port || (url.protocol === 'https:' ? 443 : 80);

            if (!code) {
                addToast('URL中未找到授权码', 'error');
                setLoading(false);
                return;
            }

            const response = await authFetch('/admin/oauth/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, port })
            });

            const result = await response.json();
            if (result.success) {
                const account = result.data;
                const addResponse = await authFetch('/admin/tokens', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(account)
                });

                const addResult = await addResponse.json();
                if (addResult.success) {
                    const message = result.fallbackMode
                        ? 'Token添加成功（该账号无资格，已自动使用随机ProjectId）'
                        : 'Token添加成功';
                    addToast(message, result.fallbackMode ? 'warning' : 'success');
                    onAdd();
                    onClose();
                    setOauthUrl('');
                } else {
                    addToast('添加失败: ' + addResult.message, 'error');
                }
            } else {
                addToast('交换失败: ' + result.message, 'error');
            }
        } catch (error) {
            addToast('处理失败: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const openOAuthWindow = () => {
        window.open(getOAuthUrl(), '_blank');
        addToast('请在新窗口完成授权', 'info');
    };

    const copyOAuthLink = () => {
        navigator.clipboard.writeText(getOAuthUrl()).then(() => {
            addToast('授权链接已复制', 'success');
        }).catch(() => {
            addToast('复制失败', 'error');
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="添加 Token 凭证">
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <button
                    style={{
                        padding: '0 16px 8px 16px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'oauth' ? '2px solid var(--text-primary)' : '2px solid transparent',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: activeTab === 'oauth' ? 'var(--text-primary)' : 'var(--zinc-500)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onClick={() => setActiveTab('oauth')}
                >
                    OAuth 自动获取
                </button>
                <button
                    style={{
                        padding: '0 16px 8px 16px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'manual' ? '2px solid var(--text-primary)' : '2px solid transparent',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: activeTab === 'manual' ? 'var(--text-primary)' : 'var(--zinc-500)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onClick={() => setActiveTab('manual')}
                >
                    手动填入
                </button>
            </div>

            {activeTab === 'oauth' ? (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                        background: 'var(--zinc-50)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        fontSize: '13px',
                        color: 'var(--zinc-600)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        lineHeight: '1.5'
                    }}>
                        <p style={{ margin: 0 }}>1. 点击下方按钮打开 Google 授权页面。</p>
                        <p style={{ margin: 0 }}>2. 授权完成后，复制浏览器地址栏的完整 URL。</p>
                        <p style={{ margin: 0 }}>3. 将 URL 粘贴到下方输入框。</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="secondary" className="flex-1" onClick={openOAuthWindow}>
                            <Icon name="ExternalLink" size={16} style={{ marginRight: '8px' }} /> 打开授权页面
                        </Button>
                        <Button variant="secondary" size="icon" onClick={copyOAuthLink} title="复制授权链接" style={{ width: '36px' }}>
                            <Icon name="Copy" size={16} />
                        </Button>
                    </div>
                    <form onSubmit={handleOAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Input label="回调 URL" placeholder="http://localhost:xxxxx/oauth-callback?code=..." value={oauthUrl} onChange={(e) => setOauthUrl(e.target.value)} />
                        <Button type="submit" className="w-full" loading={loading}>解析并添加</Button>
                    </form>
                </div>
            ) : (
                <form onSubmit={handleManualSubmit} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
                    <Input label="Access Token" placeholder="必填" value={manualForm.accessToken} onChange={(e) => setManualForm({ ...manualForm, accessToken: e.target.value })} />
                    <Input label="Refresh Token" placeholder="必填" value={manualForm.refreshToken} onChange={(e) => setManualForm({ ...manualForm, refreshToken: e.target.value })} />
                    <Input label="过期时间 (秒)" type="number" value={manualForm.expiresIn} onChange={(e) => setManualForm({ ...manualForm, expiresIn: e.target.value })} help="默认 3599 秒（约1小时）" />
                    <Button type="submit" className="w-full" loading={loading}>保存凭证</Button>
                </form>
            )}
        </Modal>
    );
};

// 暴露到全局对象
Object.assign(globalThis, { PasswordModal, ConfirmModal, TokenDetailModal, QuotaModal, AddTokenModal });
