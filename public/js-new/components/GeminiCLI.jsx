// ==================== GeminiCLI (CLI Token 管理) ====================
const { useState, useEffect } = React;

const GeminiCLI = () => {
    const [tokens, setTokens] = useState([]);
    const [isOAuthModalOpen, setIsOAuthModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });
    const [hideSensitive, setHideSensitive] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'enabled' | 'disabled'
    const [passwordModal, setPasswordModal] = useState({ isOpen: false, type: '', onConfirm: null });
    const [importModal, setImportModal] = useState({ isOpen: false, data: null });
    const [importMethodModal, setImportMethodModal] = useState({ isOpen: false });
    const [jsonTextInput, setJsonTextInput] = useState('');
    const [parseStatus, setParseStatus] = useState({ success: false, message: '' });
    const [oauthCallbackUrl, setOauthCallbackUrl] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshingTokens, setRefreshingTokens] = useState(new Set());
    const { addToast } = useToast();

    // OAuth 配置
    const GEMINICLI_CLIENT_ID = '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com';
    const GEMINICLI_SCOPES = [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/cloud-platform'
    ].join(' ');
    const [oauthPort, setOauthPort] = useState(null);

    const getOAuthUrl = () => {
        const port = oauthPort || Math.floor(Math.random() * 10000) + 50000;
        if (!oauthPort) setOauthPort(port);
        const redirectUri = `http://localhost:${port}/oauth-callback`;
        return `https://accounts.google.com/o/oauth2/v2/auth?` +
            `access_type=offline&client_id=${GEMINICLI_CLIENT_ID}&prompt=consent&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&` +
            `scope=${encodeURIComponent(GEMINICLI_SCOPES)}&state=geminicli_${Date.now()}`;
    };

    useEffect(() => {
        loadTokens();
    }, []);

    const loadTokens = async (showSuccessToast = false) => {
        if (showSuccessToast) {
            setIsRefreshing(true);
        }
        try {
            const response = await authFetch('/admin/geminicli/tokens');
            const data = await response.json();
            if (data.success) {
                setTokens(data.data);
                if (showSuccessToast) {
                    addToast('刷新成功', 'success');
                }
            } else {
                addToast('加载失败: ' + data.message, 'error');
            }
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                addToast('加载失败: ' + error.message, 'error');
            }
        } finally {
            if (showSuccessToast) {
                // 延迟一小段时间，确保旋转动画可见
                setTimeout(() => setIsRefreshing(false), 300);
            }
        }
    };

    const handleOAuthSubmit = async () => {
        if (!oauthCallbackUrl.trim()) {
            addToast('请输入回调URL', 'warning');
            return;
        }

        try {
            const url = new URL(oauthCallbackUrl);
            const code = url.searchParams.get('code');
            const port = new URL(url.origin).port || (url.protocol === 'https:' ? 443 : 80);

            if (!code) {
                addToast('URL中未找到授权码', 'error');
                return;
            }

            const response = await authFetch('/admin/oauth/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, port, mode: 'geminicli' })
            });

            const result = await response.json();
            if (result.success) {
                const account = result.data;
                const addResponse = await authFetch('/admin/geminicli/tokens', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(account)
                });

                const addResult = await addResponse.json();
                if (addResult.success) {
                    setIsOAuthModalOpen(false);
                    setOauthCallbackUrl('');
                    addToast('CLI Token添加成功', 'success');
                    loadTokens();
                } else {
                    addToast('添加失败: ' + addResult.message, 'error');
                }
            } else {
                addToast('交换失败: ' + result.message, 'error');
            }
        } catch (error) {
            addToast('处理失败: ' + error.message, 'error');
        }
    };

    const handleRefresh = async (tokenId) => {
        setRefreshingTokens(prev => new Set(prev).add(tokenId));
        try {
            const response = await authFetch(`/admin/geminicli/tokens/${encodeURIComponent(tokenId)}/refresh`, {
                method: 'POST'
            });
            const data = await response.json();
            if (data.success) {
                addToast('Token 刷新成功', 'success');
                loadTokens();
            } else {
                addToast(`刷新失败: ${data.message || '未知错误'}`, 'error');
            }
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                addToast(`刷新失败: ${error.message}`, 'error');
            }
        } finally {
            setRefreshingTokens(prev => {
                const newSet = new Set(prev);
                newSet.delete(tokenId);
                return newSet;
            });
        }
    };

    const handleToggle = (tokenId, currentEnable) => {
        const newEnable = !currentEnable;
        const action = newEnable ? '启用' : '禁用';
        setConfirmModal({
            isOpen: true,
            title: `${action}确认`,
            message: `确定要${action}这个Token吗？`,
            action: async () => {
                try {
                    const response = await authFetch(`/admin/geminicli/tokens/${encodeURIComponent(tokenId)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enable: newEnable })
                    });

                    const data = await response.json();
                    if (data.success) {
                        addToast(`已${action}`, 'success');
                        loadTokens();
                    } else {
                        addToast(data.message || '操作失败', 'error');
                    }
                } catch (error) {
                    addToast('操作失败: ' + error.message, 'error');
                }
                setConfirmModal({ isOpen: false });
            }
        });
    };

    const handleDelete = (tokenId) => {
        setConfirmModal({
            isOpen: true,
            title: '删除确认',
            message: '删除后无法恢复，确定要删除这个Token吗？',
            action: async () => {
                try {
                    const response = await authFetch(`/admin/geminicli/tokens/${encodeURIComponent(tokenId)}`, {
                        method: 'DELETE'
                    });

                    const data = await response.json();
                    if (data.success) {
                        addToast('已删除', 'success');
                        loadTokens();
                    } else {
                        addToast(data.message || '删除失败', 'error');
                    }
                } catch (error) {
                    addToast('删除失败: ' + error.message, 'error');
                }
                setConfirmModal({ isOpen: false });
            }
        });
    };

    const handleExport = () => {
        setPasswordModal({
            isOpen: true,
            type: 'export',
            title: '导出 CLI Token',
            onConfirm: async (password) => {
                try {
                    const response = await authFetch('/admin/geminicli/tokens/export', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password })
                    });

                    const data = await response.json();
                    if (data.success) {
                        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `geminicli-tokens-export-${new Date().toISOString().slice(0, 10)}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        addToast('导出成功', 'success');
                        setPasswordModal({ isOpen: false });
                    } else {
                        addToast(data.message || '导出失败', 'error');
                    }
                } catch (error) {
                    addToast('导出失败: ' + error.message, 'error');
                }
            }
        });
    };

    const handleImport = () => {
        setImportMethodModal({ isOpen: true });
        setJsonTextInput('');
        setParseStatus({ success: false, message: '' });
    };

    const handleFileImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                const importData = Array.isArray(parsed) ? { tokens: parsed } : parsed;

                addToast('文件解析成功', 'success');
                setImportMethodModal({ isOpen: false });
                setImportModal({ isOpen: true, data: importData });
            } catch (error) {
                addToast('读取文件失败: ' + error.message, 'error');
            }
        };
        input.click();
    };

    const confirmImport = async (password, mode) => {
        try {
            const response = await authFetch('/admin/geminicli/tokens/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    data: importModal.data,
                    mode
                })
            });

            const data = await response.json();
            if (data.success) {
                addToast(`导入成功！${data.message || ''}`, 'success');
                setImportModal({ isOpen: false, data: null });
                loadTokens();
            } else {
                addToast(data.message || '导入失败', 'error');
            }
        } catch (error) {
            addToast('导入失败: ' + error.message, 'error');
        }
    };

    return (
        <div className="page-container animate-fade-in">
            {/* Stats */}
            <div className="stats-grid">
                <Card
                    className={`stat-card ${filterStatus === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('all')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="stat-info">
                        <div className="stat-label">总 Token 数</div>
                        <div className="stat-value">{tokens.length}</div>
                    </div>
                    <div className="stat-icon">
                        <Icon name="Terminal" />
                    </div>
                </Card>
                <Card
                    className={`stat-card success ${filterStatus === 'enabled' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('enabled')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="stat-info">
                        <div className="stat-label">已启用</div>
                        <div className="stat-value">{tokens.filter(t => t.enable).length}</div>
                    </div>
                    <div className="stat-icon">
                        <Icon name="Check" />
                    </div>
                </Card>
                <Card
                    className={`stat-card danger ${filterStatus === 'disabled' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('disabled')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="stat-info">
                        <div className="stat-label">已禁用</div>
                        <div className="stat-value">{tokens.filter(t => !t.enable).length}</div>
                    </div>
                    <div className="stat-icon">
                        <Icon name="X" />
                    </div>
                </Card>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mb-6">
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>凭证列表</h2>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setHideSensitive(!hideSensitive)} title={hideSensitive ? "显示敏感信息" : "隐藏敏感信息"}>
                        <Icon name={hideSensitive ? "EyeOff" : "Eye"} size={16} />
                    </Button>
                    <Button variant="secondary" onClick={() => loadTokens(true)} disabled={isRefreshing}>
                        <Icon name="RefreshCw" size={16} className={isRefreshing ? 'loading' : ''} />
                    </Button>
                    <Button variant="secondary" onClick={handleExport} title="导出Token">
                        <Icon name="Download" size={16} />
                    </Button>
                    <Button variant="secondary" onClick={handleImport} title="导入Token">
                        <Icon name="Upload" size={16} />
                    </Button>
                    <Button onClick={() => setIsOAuthModalOpen(true)}>
                        OAuth 授权
                    </Button>
                </div>
            </div>

            {/* Token Table */}
            {(() => {
                const filteredTokens = tokens.filter(token => {
                    if (filterStatus === 'enabled') return token.enable;
                    if (filterStatus === 'disabled') return !token.enable;
                    return true;
                });

                return (
                    <>
                        {/* Desktop Table */}
                        <div className="token-desktop-view">
                            <Card>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th style={{ minWidth: '200px' }}>账号信息</th>
                                                <th style={{ minWidth: '180px' }}>Project ID</th>
                                                <th style={{ minWidth: '140px' }}>Token 详情</th>
                                                <th className="text-center">状态</th>
                                                <th className="text-center" style={{ minWidth: '180px' }}>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTokens.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center" style={{ padding: '48px 24px' }}>
                                                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                                                        <div style={{ color: 'var(--zinc-400)' }}>
                                                            {filterStatus === 'all' ? '暂无 CLI Token，点击上方「OAuth 授权」按钮添加' :
                                                                filterStatus === 'enabled' ? '暂无已启用的 CLI Token' :
                                                                    '暂无已禁用的 CLI Token'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredTokens.map((token, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <div className={`font-semibold ${hideSensitive ? 'blur-text' : ''}`} style={{ color: 'var(--text-primary)' }}>
                                                            {token.email || 'N/A'}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: 'var(--zinc-500)' }}>
                                                            Token #{idx + 1}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontSize: '13px', color: token.projectId ? 'var(--emerald-600)' : 'var(--red-500)', fontWeight: 500 }}>
                                                            {token.projectId || '未获取'}
                                                        </div>
                                                    </td>
                                                    <td className="font-mono" style={{ fontSize: '12px', color: 'var(--zinc-500)' }}>
                                                        <div className={hideSensitive ? 'blur-text' : ''}>Access: {token.access_token?.substring(0, 10)}...</div>
                                                        <div>ID: {token.id?.substring(0, 8) || 'N/A'}...</div>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`status-badge ${token.enable ? 'success' : 'disabled'}`}>
                                                            <span className="status-dot"></span>
                                                            {token.enable ? '启用' : '禁用'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="table-actions">
                                                            <Button variant="secondary" size="sm" onClick={() => handleRefresh(token.id)} disabled={refreshingTokens.has(token.id)}>
                                                                <Icon name="RefreshCw" size={14} className={refreshingTokens.has(token.id) ? 'loading' : ''} />
                                                            </Button>
                                                            <Button variant={token.enable ? "secondary" : "primary"} size="sm" onClick={() => handleToggle(token.id, token.enable)}>
                                                                {token.enable ? "禁用" : "启用"}
                                                            </Button>
                                                            <Button variant="danger" size="sm" onClick={() => handleDelete(token.id)} title="删除">
                                                                <Icon name="Trash2" size={14} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>

                        {/* Mobile Cards */}
                        <div className="token-mobile-view">
                            {filteredTokens.length === 0 ? (
                                <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                                    <div style={{ color: 'var(--zinc-400)' }}>
                                        {filterStatus === 'all' ? '暂无 CLI Token，点击上方「OAuth 授权」按钮添加' :
                                            filterStatus === 'enabled' ? '暂无已启用的 CLI Token' :
                                                '暂无已禁用的 CLI Token'}
                                    </div>
                                </Card>
                            ) : filteredTokens.map((token, idx) => (
                                <div key={idx} className="token-mobile-card">
                                    <div className="token-card-header">
                                        <div className="token-card-info">
                                            <div className={`token-card-email ${hideSensitive ? 'blur-text' : ''}`}>
                                                {token.email || 'N/A'}
                                            </div>
                                            <div className={`token-card-project ${hideSensitive ? 'blur-text' : ''}`}>
                                                {token.projectId || '未获取'}
                                            </div>
                                        </div>
                                        <span className={`status-badge ${token.enable ? 'success' : 'disabled'}`}>
                                            <span className="status-dot"></span>
                                            {token.enable ? '启用' : '禁用'}
                                        </span>
                                    </div>
                                    <div className="token-card-details">
                                        <div className="token-card-row">
                                            <span>Access Token:</span>
                                            <span className={hideSensitive ? 'blur-text' : ''}>
                                                {token.access_token?.substring(0, 10)}...
                                            </span>
                                        </div>
                                        <div className="token-card-row">
                                            <span>Token ID:</span>
                                            <span>{token.id?.substring(0, 8) || 'N/A'}...</span>
                                        </div>
                                    </div>
                                    <div className="token-card-actions">
                                        <Button variant="secondary" size="sm" onClick={() => handleRefresh(token.id)} disabled={refreshingTokens.has(token.id)}>
                                            <Icon name="RefreshCw" size={14} className={refreshingTokens.has(token.id) ? 'loading' : ''} /> 刷新
                                        </Button>
                                        <Button variant={token.enable ? "secondary" : "primary"} size="sm" onClick={() => handleToggle(token.id, token.enable)}>
                                            {token.enable ? "禁用" : "启用"}
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDelete(token.id)} title="删除">
                                            <Icon name="Trash2" size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                );
            })()}

            {/* OAuth Modal */}
            {isOAuthModalOpen && (
                <Modal
                    isOpen={isOAuthModalOpen}
                    onClose={() => {
                        setIsOAuthModalOpen(false);
                        setOauthCallbackUrl('');
                    }}
                    title="OAuth 授权"
                >
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
                            <Button variant="secondary" className="flex-1" onClick={() => window.open(getOAuthUrl(), '_blank')}>
                                <Icon name="ExternalLink" size={16} style={{ marginRight: '8px' }} /> 打开授权页面
                            </Button>
                            <Button variant="secondary" size="icon" onClick={() => {
                                navigator.clipboard.writeText(getOAuthUrl());
                                addToast('授权链接已复制', 'success');
                            }} title="复制授权链接" style={{ width: '36px' }}>
                                <Icon name="Copy" size={16} />
                            </Button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleOAuthSubmit();
                        }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <Input
                                label="回调 URL"
                                type="text"
                                value={oauthCallbackUrl}
                                onChange={(e) => setOauthCallbackUrl(e.target.value)}
                                placeholder="http://localhost:xxxxx/oauth-callback?code=..."
                            />
                            <Button type="submit" className="w-full">解析并添加</Button>
                        </form>
                    </div>
                </Modal>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false })}
                onConfirm={confirmModal.action}
                title={confirmModal.title}
                message={confirmModal.message}
            />

            {/* Password Modal */}
            {passwordModal.isOpen && (
                <Modal
                    isOpen={passwordModal.isOpen}
                    onClose={() => setPasswordModal({ isOpen: false })}
                    title={passwordModal.title || '请输入密码'}
                >
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const password = e.target.elements.password.value;
                        if (!password) {
                            addToast('请输入密码', 'warning');
                            return;
                        }
                        passwordModal.onConfirm(password);
                    }}>
                        <Input
                            label="管理员密码"
                            type="password"
                            name="password"
                            placeholder="请输入管理员密码"
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" type="button" onClick={() => setPasswordModal({ isOpen: false })}>
                                取消
                            </Button>
                            <Button type="submit">确认</Button>
                        </div>
                    </form>
                </Modal>
            )
            }

            {/* Import Method Modal */}
            {
                importMethodModal.isOpen && (
                    <Modal
                        isOpen={importMethodModal.isOpen}
                        onClose={() => setImportMethodModal({ isOpen: false })}
                        title="选择导入方式"
                        maxWidth="max-w-2xl"
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* 文件上传 */}
                            <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icon name="Folder" size={16} /> 文件上传
                                </h4>
                                <p style={{ fontSize: '13px', color: 'var(--zinc-500)', marginBottom: '12px' }}>选择 JSON 文件导入，支持多种格式自动识别</p>
                                <Button onClick={handleFileImport} variant="secondary">
                                    <Icon name="Upload" size={16} /> 选择文件
                                </Button>
                            </div>

                            {/* 粘贴 JSON */}
                            <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icon name="Clipboard" size={16} /> 粘贴 JSON
                                </h4>
                                <p style={{ fontSize: '13px', color: 'var(--zinc-500)', marginBottom: '12px' }}>
                                    直接粘贴 JSON 文本，支持模糊字段匹配（不区分大小写）
                                </p>
                                <textarea
                                    className="form-textarea"
                                    rows={8}
                                    value={jsonTextInput}
                                    onChange={(e) => setJsonTextInput(e.target.value)}
                                    placeholder='粘贴 JSON 内容...\n支持格式：\n- 标准导出格式\n- 单个对象\n- 对象数组\n- 嵌套对象'
                                    style={{ marginBottom: '8px', fontFamily: 'monospace', fontSize: '12px' }}
                                ></textarea>
                                {parseStatus.message && (
                                    <div style={{
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        marginBottom: '12px',
                                        background: parseStatus.success ? 'var(--green-50)' : 'var(--red-50)',
                                        color: parseStatus.success ? 'var(--green-700)' : 'var(--red-700)',
                                        border: `1px solid ${parseStatus.success ? 'var(--green-200)' : 'var(--red-200)'}`
                                    }}>
                                        {parseStatus.success ? '✅' : '❌'} {parseStatus.message}
                                    </div>
                                )}
                                <Button onClick={() => {
                                    // 处理 JSON 文本
                                    try {
                                        const parsed = JSON.parse(jsonTextInput);
                                        const importData = Array.isArray(parsed) ? { tokens: parsed } : parsed;
                                        setImportMethodModal({ isOpen: false });
                                        setImportModal({ isOpen: true, data: importData });
                                        setParseStatus({ success: true, message: '' });
                                    } catch (error) {
                                        setParseStatus({ success: false, message: '解析失败: ' + error.message });
                                    }
                                }} disabled={!jsonTextInput.trim()}>
                                    <Icon name="Check" size={16} /> 确认导入
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {/* Import Confirm Modal */}
            {
                importModal.isOpen && importModal.data && (
                    <Modal
                        isOpen={importModal.isOpen}
                        onClose={() => setImportModal({ isOpen: false, data: null })}
                        title="导入 CLI Token"
                    >
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const password = e.target.elements.password.value;
                            const mode = e.target.elements.mode.value;
                            if (!password) {
                                addToast('请输入密码', 'warning');
                                return;
                            }
                            confirmImport(password, mode);
                        }}>
                            <div style={{ marginBottom: '16px' }}>
                                <p>文件包含 <strong>{importModal.data.tokens?.length || 0}</strong> 个 Token</p>
                            </div>
                            <Select
                                label="导入模式"
                                name="mode"
                                options={[
                                    { value: 'merge', label: '合并（保留现有，添加新的）' },
                                    { value: 'replace', label: '替换（清空现有，导入新的）' }
                                ]}
                            />
                            <Input
                                label="管理员密码"
                                type="password"
                                name="password"
                                placeholder="请输入管理员密码"
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <Button variant="secondary" type="button" onClick={() => setImportModal({ isOpen: false, data: null })}>
                                    取消
                                </Button>
                                <Button type="submit">确认导入</Button>
                            </div>
                        </form>
                    </Modal >
                )
            }
        </div >
    );
};

// 暴露到全局对象
Object.assign(globalThis, { GeminiCLI });
