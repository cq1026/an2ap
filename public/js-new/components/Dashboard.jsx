// ==================== Dashboard (Token 管理) ====================
const { useState, useEffect } = React;

// 判断是否为随机生成的 projectId
const isRandomProjectId = (projectId) => {
    if (!projectId) return true;
    // 随机格式：word-word-alphanumeric (如 useful-fuze-abc12)
    const randomPattern = /^[a-z]+-[a-z]+-[a-z0-9]{5}$/;
    return randomPattern.test(projectId);
};

// 获取单个 Token 的 Project ID
// silent=true 时不显示 toast（用于批量获取）
const fetchProjectIdForToken = async (tokenId, addToast, silent = false) => {
    try {
        const response = await fetch(`/admin/tokens/${encodeURIComponent(tokenId)}/fetch-project-id`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            if (!silent) addToast(`Project ID 获取成功: ${data.projectId}`, 'success');
            return { success: true, projectId: data.projectId };
        } else {
            if (!silent) addToast(`获取失败: ${data.message || '未知错误'}`, 'error');
            return { success: false };
        }
    } catch (error) {
        if (!silent) addToast(`获取失败: ${error.message}`, 'error');
        return { success: false };
    }
};

// 批量获取所有启用 Token 的 Project ID
const batchFetchProjectIds = async (tokens, addToast, setIsBatchFetching, loadTokens) => {
    const enabledTokens = tokens.filter(t => t.enable);
    if (enabledTokens.length === 0) {
        addToast('没有启用的 Token', 'warning');
        return;
    }

    setIsBatchFetching(true);
    addToast(`正在批量获取 Project ID (0/${enabledTokens.length})...`, 'info');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < enabledTokens.length; i++) {
        const token = enabledTokens[i];

        const result = await fetchProjectIdForToken(token.id, addToast, true); // silent=true
        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }

        // 防止请求过快，每个请求间隔 500ms
        if (i < enabledTokens.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    setIsBatchFetching(false);
    addToast(
        `批量获取完成: 成功 ${successCount} 个，失败 ${failCount} 个`,
        successCount > 0 ? 'success' : 'error'
    );
    loadTokens(); // 刷新列表
};

const Dashboard = () => {
    const [tokens, setTokens] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [quotaModalToken, setQuotaModalToken] = useState(null);
    const [detailModalToken, setDetailModalToken] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isBatchFetching, setIsBatchFetching] = useState(false);
    const [hideSensitive, setHideSensitive] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'enabled' | 'disabled'
    const [passwordModal, setPasswordModal] = useState({ isOpen: false, type: '', onConfirm: null });
    const [importModal, setImportModal] = useState({ isOpen: false, data: null });
    const [importMethodModal, setImportMethodModal] = useState({ isOpen: false });
    const [jsonTextInput, setJsonTextInput] = useState('');
    const [parseStatus, setParseStatus] = useState({ success: false, message: '' });
    const { addToast } = useToast();

    // ===== 智能 JSON 导入辅助函数 =====

    // 智能查找字段值（不区分大小写，包含匹配）
    const findFieldByKeyword = (obj, keyword) => {
        if (!obj || typeof obj !== 'object') return undefined;
        const lowerKeyword = keyword.toLowerCase();
        for (const key of Object.keys(obj)) {
            if (key.toLowerCase().includes(lowerKeyword)) {
                return obj[key];
            }
        }
        return undefined;
    };

    // 智能解析单个 Token 对象
    const smartParseToken = (rawToken) => {
        if (!rawToken || typeof rawToken !== 'object') return null;

        // 必需字段：包含 refresh 的认为是 refresh_token，包含 project 的认为是 projectId
        const refresh_token = findFieldByKeyword(rawToken, 'refresh');
        const projectId = findFieldByKeyword(rawToken, 'project');

        // 必须同时包含这两个字段
        if (!refresh_token || !projectId) return null;

        // 构建标准化的 token 对象
        const token = { refresh_token, projectId };

        // 可选字段自动获取
        const access_token = findFieldByKeyword(rawToken, 'access');
        const email = findFieldByKeyword(rawToken, 'email') || findFieldByKeyword(rawToken, 'mail');
        const expires_in = findFieldByKeyword(rawToken, 'expire');
        const enable = findFieldByKeyword(rawToken, 'enable');
        const timestamp = findFieldByKeyword(rawToken, 'time') || findFieldByKeyword(rawToken, 'stamp');
        const hasQuota = findFieldByKeyword(rawToken, 'quota');

        if (access_token) token.access_token = access_token;
        if (email) token.email = email;
        if (expires_in !== undefined) token.expires_in = parseInt(expires_in) || 3599;
        if (enable !== undefined) token.enable = enable === true || enable === 'true' || enable === 1;
        if (timestamp) token.timestamp = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
        if (hasQuota !== undefined) token.hasQuota = hasQuota === true || hasQuota === 'true' || hasQuota === 1;

        return token;
    };

    // 智能解析导入数据（支持多种格式）
    const smartParseImportData = (jsonText) => {
        let data;
        let cleanText = jsonText.trim();

        // 预处理：移除尾随逗号（常见的 JSON 格式错误）
        cleanText = cleanText.replace(/,(\s*[}\]])/g, '$1');

        try {
            data = JSON.parse(cleanText);
        } catch (e) {
            // 尝试处理多个 JSON 对象（用户可能粘贴了多个对象，没有用数组包裹）
            try {
                // 尝试将多个对象包装成数组
                const arrayText = '[' + cleanText.replace(/\}\s*\{/g, '},{') + ']';
                data = JSON.parse(arrayText);
            } catch (e2) {
                return { success: false, message: `JSON 解析错误: ${e.message}` };
            }
        }

        // 识别数据结构：数组或对象中的数组
        let tokensArray = [];
        if (Array.isArray(data)) {
            tokensArray = data;
        } else if (typeof data === 'object' && data !== null) {
            // 查找任何包含数组的字段
            for (const key of Object.keys(data)) {
                if (Array.isArray(data[key])) {
                    tokensArray = data[key];
                    break;
                }
            }
            // 如果没找到数组，尝试作为单个 token 解析
            if (tokensArray.length === 0) {
                const single = smartParseToken(data);
                if (single) tokensArray = [data];
            }
        }

        if (tokensArray.length === 0) {
            return { success: false, message: '未找到有效数据，请确保包含 refresh_token 和 projectId' };
        }

        // 解析每个 token
        const validTokens = [];
        let invalidCount = 0;
        for (const raw of tokensArray) {
            const parsed = smartParseToken(raw);
            if (parsed) {
                validTokens.push(parsed);
            } else {
                invalidCount++;
            }
        }

        if (validTokens.length === 0) {
            return { success: false, message: `所有 ${tokensArray.length} 条数据都缺少必需字段 (refresh_token 和 projectId)` };
        }

        const message = invalidCount > 0
            ? `解析成功：${validTokens.length} 个有效，${invalidCount} 个无效`
            : `解析成功：${validTokens.length} 个 Token`;

        return { success: true, tokens: validTokens, message, exportTime: data.exportTime };
    };

    useEffect(() => {
        loadTokens();
    }, []);

    const loadTokens = async () => {
        const startTime = Date.now();
        try {
            const response = await authFetch('/admin/tokens');
            const data = await response.json();
            if (data.success) {
                setTokens(data.data);
            } else {
                addToast('加载失败: ' + data.message, 'error');
            }

            // 确保至少显示 600ms 的加载动画
            const elapsed = Date.now() - startTime;
            if (elapsed < 600) {
                await new Promise(resolve => setTimeout(resolve, 600 - elapsed));
            }
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                addToast('加载失败: ' + error.message, 'error');
            }
        }
    };

    const handleToggle = (refreshToken, currentEnable) => {
        const newEnable = !currentEnable;
        const action = newEnable ? '启用' : '禁用';
        setConfirmModal({
            isOpen: true,
            title: `${action}确认`,
            message: `确定要${action}这个Token吗？`,
            action: async () => {
                try {
                    const response = await authFetch(`/admin/tokens/${encodeURIComponent(refreshToken)}`, {
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

    const handleDelete = (refreshToken) => {
        setConfirmModal({
            isOpen: true,
            title: '删除确认',
            message: '删除后无法恢复，确定要删除这个Token吗？',
            action: async () => {
                try {
                    const response = await authFetch(`/admin/tokens/${encodeURIComponent(refreshToken)}`, {
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

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadTokens();
        setIsRefreshing(false);
        addToast('Token列表已刷新', 'success');
    };

    // 导出Token
    const handleExport = () => {
        setPasswordModal({
            isOpen: true,
            type: 'export',
            title: '导出 Token',
            onConfirm: async (password) => {
                try {
                    const response = await authFetch('/admin/tokens/export', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password })
                    });

                    const data = await response.json();
                    if (data.success) {
                        // 创建下载
                        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `tokens-export-${new Date().toISOString().slice(0, 10)}.json`;
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

    // 导入Token - 打开选择方式模态框
    const handleImport = () => {
        setImportMethodModal({ isOpen: true });
        setJsonTextInput('');
        setParseStatus({ success: false, message: '' });
    };

    // 处理文件上传
    const handleFileImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();

                // 使用智能解析处理各种JSON格式
                const parseResult = smartParseImportData(text);

                if (!parseResult.success) {
                    addToast(parseResult.message, 'error');
                    return;
                }

                // 构建标准格式的导入数据
                const importData = {
                    tokens: parseResult.tokens,
                    exportTime: parseResult.exportTime
                };

                addToast(parseResult.message, 'success');
                setImportMethodModal({ isOpen: false });
                setImportModal({ isOpen: true, data: importData });
            } catch (error) {
                addToast('读取文件失败: ' + error.message, 'error');
            }
        };
        input.click();
    };

    // 处理粘贴JSON导入
    const handleJsonTextImport = () => {
        if (!jsonTextInput.trim()) {
            addToast('请输入 JSON 内容', 'warning');
            return;
        }

        // 使用智能解析
        const parseResult = smartParseImportData(jsonTextInput);

        if (!parseResult.success) {
            addToast(parseResult.message, 'error');
            return;
        }

        // 构建标准格式的导入数据
        const importData = {
            tokens: parseResult.tokens,
            exportTime: parseResult.exportTime
        };

        addToast(parseResult.message, 'success');
        setImportMethodModal({ isOpen: false });
        setImportModal({ isOpen: true, data: importData });
    };

    // 实时解析JSON
    const handleJsonTextChange = (text) => {
        setJsonTextInput(text);
        if (!text.trim()) {
            setParseStatus({ success: false, message: '' });
            return;
        }

        const parseResult = smartParseImportData(text);
        setParseStatus(parseResult);
    };

    // 确认导入
    const confirmImport = async (password, mode) => {
        try {
            const response = await authFetch('/admin/tokens/import', {
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

    const handleSaveTokenDetail = async (refreshToken, newData) => {
        try {
            const response = await authFetch(`/admin/tokens/${encodeURIComponent(refreshToken)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            });

            const data = await response.json();
            if (data.success) {
                addToast('Token 信息已更新', 'success');
                loadTokens();
            } else {
                throw new Error(data.message || '保存失败');
            }
        } catch (error) {
            throw error;
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
                        <Icon name="LayoutGrid" />
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
                    <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing}>
                        <Icon name="RefreshCw" size={16} className={isRefreshing ? "loading" : ""} />
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => batchFetchProjectIds(tokens, addToast, setIsBatchFetching, loadTokens)}
                        disabled={isBatchFetching}
                        title="批量获取所有启用Token的Project ID"
                    >
                        <Icon name="Globe" size={16} />
                    </Button>
                    <Button variant="secondary" onClick={handleExport} title="导出Token">
                        <Icon name="Download" size={16} />
                    </Button>
                    <Button variant="secondary" onClick={handleImport} title="导入Token">
                        <Icon name="Upload" size={16} />
                    </Button>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        <Icon name="Plus" size={16} style={{ marginRight: '8px' }} /> 添加
                    </Button>
                </div>
            </div>

            {/* Token Table */}
            {(() => {
                // 筛选逻辑
                const filteredTokens = tokens.filter(token => {
                    if (filterStatus === 'enabled') return token.enable;
                    if (filterStatus === 'disabled') return !token.enable;
                    return true; // 'all'
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
                                                <th style={{ minWidth: '160px' }}>账号信息 (Project ID)</th>
                                                <th style={{ minWidth: '140px' }}>Token 详情</th>
                                                <th className="text-center">状态</th>
                                                <th className="text-center">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTokens.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="text-center" style={{ padding: '48px 24px' }}>
                                                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                                                        <div style={{ color: 'var(--zinc-400)' }}>
                                                            {filterStatus === 'all' ? '暂无 Token，点击上方「添加」按钮添加' :
                                                                filterStatus === 'enabled' ? '暂无已启用的 Token' :
                                                                    '暂无已禁用的 Token'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredTokens.map((token, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <div className={`font-semibold ${hideSensitive ? 'blur-text' : ''}`} style={{ color: 'var(--text-primary)' }}>
                                                            {token.projectId || 'N/A'}
                                                        </div>
                                                        <div className={`${hideSensitive ? 'blur-text' : ''}`} style={{ fontSize: '12px', color: 'var(--zinc-500)' }}>
                                                            {token.email || "N/A"}
                                                        </div>
                                                    </td>
                                                    <td className="font-mono" style={{ fontSize: '12px', color: 'var(--zinc-500)' }}>
                                                        <div className={hideSensitive ? 'blur-text' : ''}>Access: {token.access_token_suffix}</div>
                                                        <div>Token ID: {token.id?.substring(0, 8) || 'N/A'}...</div>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`status-badge ${token.enable ? 'success' : 'disabled'}`}>
                                                            <span className="status-dot"></span>
                                                            {token.enable ? '启用' : '禁用'}
                                                        </span>
                                                    </td>
                                                    <td style={{ minWidth: '200px' }}>
                                                        <div className="table-actions">
                                                            <Button variant="secondary" size="sm" onClick={() => setDetailModalToken(token)}>详情</Button>
                                                            <Button variant="secondary" size="sm" onClick={() => setQuotaModalToken(token)}>额度</Button>
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
                                        {filterStatus === 'all' ? '暂无 Token，点击上方「添加」按钮添加' :
                                            filterStatus === 'enabled' ? '暂无已启用的 Token' :
                                                '暂无已禁用的 Token'}
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
                                                {token.projectId || 'N/A'}
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
                                                {token.access_token_suffix}
                                            </span>
                                        </div>
                                        <div className="token-card-row">
                                            <span>Token ID:</span>
                                            <span>{token.id?.substring(0, 8) || 'N/A'}...</span>
                                        </div>
                                    </div>
                                    <div className="token-card-actions">
                                        <Button variant="secondary" size="sm" onClick={() => setDetailModalToken(token)}>详情</Button>
                                        <Button variant="secondary" size="sm" onClick={() => setQuotaModalToken(token)}>额度</Button>
                                        <Button variant={token.enable ? "primary" : "secondary"} size="sm" onClick={() => handleToggle(token.id, token.enable)}>
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

            {/* Modals */}
            <AddTokenModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={loadTokens} />
            <QuotaModal isOpen={!!quotaModalToken} token={quotaModalToken} onClose={() => setQuotaModalToken(null)} />
            <TokenDetailModal
                isOpen={!!detailModalToken}
                token={detailModalToken}
                onClose={() => setDetailModalToken(null)}
                onSave={handleSaveTokenDetail}
            />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false })}
                onConfirm={confirmModal.action}
                title={confirmModal.title}
                message={confirmModal.message}
            />

            {/* 密码输入模态框 */}
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
                        <div style={{ marginBottom: '16px' }}>
                            <label className="form-label">管理员密码</label>
                            <input
                                type="password"
                                name="password"
                                placeholder="请输入管理员密码"
                                className="form-input"
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid var(--zinc-300)',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" type="button" onClick={() => setPasswordModal({ isOpen: false })}>
                                取消
                            </Button>
                            <Button type="submit">确认</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* 导入方式选择模态框 */}
            {importMethodModal.isOpen && (
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

                        {/* 粘贴JSON */}
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
                                onChange={(e) => handleJsonTextChange(e.target.value)}
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
                            <Button onClick={handleJsonTextImport} disabled={!parseStatus.success}>
                                <Icon name="Check" size={16} /> 确认导入
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* 导入确认模态框 */}
            {importModal.isOpen && importModal.data && (
                <Modal
                    isOpen={importModal.isOpen}
                    onClose={() => setImportModal({ isOpen: false, data: null })}
                    title="导入 Token"
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
                            <p style={{ marginBottom: '8px' }}>
                                文件包含 <strong>{importModal.data.tokens.length}</strong> 个 Token
                            </p>
                            {importModal.data.exportTime && (
                                <p style={{ fontSize: '12px', color: 'var(--zinc-500)', marginBottom: '16px' }}>
                                    导出时间: {importModal.data.exportTime}
                                </p>
                            )}
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label className="form-label">导入模式</label>
                            <select
                                name="mode"
                                className="form-input"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid var(--zinc-300)',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                }}
                            >
                                <option value="merge">合并（保留现有，添加新的）</option>
                                <option value="replace">替换（清空现有，导入新的）</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label className="form-label">管理员密码</label>
                            <input
                                type="password"
                                name="password"
                                placeholder="请输入管理员密码"
                                className="form-input"
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid var(--zinc-300)',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" type="button" onClick={() => setImportModal({ isOpen: false, data: null })}>
                                取消
                            </Button>
                            <Button type="submit">确认导入</Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// 暴露到全局对象
Object.assign(globalThis, { Dashboard });
