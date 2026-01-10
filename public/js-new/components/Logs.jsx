// ==================== Logs (日志管理) ====================
const { useState, useEffect, useRef } = React;

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({ total: 0, info: 0, warn: 0, error: 0, request: 0 });
    const [currentLevel, setCurrentLevel] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [offset, setOffset] = useState(0);
    const [limit] = useState(50);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    const autoRefreshTimerRef = useRef(null);

    useEffect(() => {
        loadLogs();
        loadLogStats();
        return () => {
            if (autoRefreshTimerRef.current) {
                clearInterval(autoRefreshTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        loadLogs();
    }, [currentLevel, searchKeyword]);

    const loadLogs = async (append = false) => {
        try {
            setIsLoading(true);
            const startTime = Date.now();
            const currentOffset = append ? offset : 0;
            if (!append) setOffset(0);

            const params = new URLSearchParams({
                level: currentLevel,
                search: searchKeyword,
                limit: limit.toString(),
                offset: currentOffset.toString()
            });

            const response = await authFetch(`/admin/logs?${params}`);
            const data = await response.json();

            if (data.success) {
                const newLogs = append ? [...logs, ...data.data.logs] : data.data.logs;
                setLogs(newLogs);
                setTotal(data.data.total);
            }

            // 确保至少显示 600ms 的加载动画
            const elapsed = Date.now() - startTime;
            if (elapsed < 600) {
                await new Promise(resolve => setTimeout(resolve, 600 - elapsed));
            }
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                addToast('加载日志失败: ' + error.message, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const loadLogStats = async () => {
        try {
            const response = await authFetch('/admin/logs/stats');
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            // Silent error
        }
    };

    const handleClearLogs = async () => {
        try {
            const response = await authFetch('/admin/logs', { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                addToast('日志已清空', 'success');
                setLogs([]);
                setTotal(0);
                setStats({ total: 0, info: 0, warn: 0, error: 0, request: 0 });
            } else {
                addToast(data.message || '清空日志失败', 'error');
            }
        } catch (error) {
            addToast('清空日志失败: ' + error.message, 'error');
        }
    };

    const handleFilterLevel = (level) => {
        setCurrentLevel(level);
        setOffset(0);
    };

    const handleLoadMore = () => {
        const newOffset = offset + limit;
        setOffset(newOffset);
        loadLogs(true);
    };

    const toggleAutoRefresh = () => {
        if (autoRefresh) {
            if (autoRefreshTimerRef.current) {
                clearInterval(autoRefreshTimerRef.current);
                autoRefreshTimerRef.current = null;
            }
            setAutoRefresh(false);
            addToast('已停止自动刷新', 'info');
        } else {
            autoRefreshTimerRef.current = setInterval(() => {
                loadLogs();
                loadLogStats();
            }, 3000);
            setAutoRefresh(true);
            addToast('已开启自动刷新（3秒）', 'success');
        }
    };

    const handleManualRefresh = async () => {
        await loadLogs();
        await loadLogStats();
        addToast('日志已刷新', 'success');
    };

    const handleExportLogs = () => {
        if (logs.length === 0) {
            addToast('没有日志可导出', 'warning');
            return;
        }

        const content = logs.map(log => {
            const time = new Date(log.timestamp).toLocaleString('zh-CN', { hour12: false });
            return `[${time}] [${log.level.toUpperCase()}] ${log.message}`;
        }).join('\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addToast('日志已导出', 'success');
    };

    const copyLogContent = (message) => {
        navigator.clipboard.writeText(message).then(() => {
            addToast('已复制到剪贴板', 'success');
        }).catch(() => {
            addToast('复制失败', 'error');
        });
    };

    const getLevelBadgeClass = (level) => {
        const classes = {
            info: 'badge-info',
            warn: 'badge-warning',
            error: 'badge-danger',
            request: 'badge-success'
        };
        return classes[level] || 'badge-secondary';
    };

    const getLevelIcon = (level) => {
        const icons = {
            info: 'Info',
            warn: 'AlertTriangle',
            error: 'AlertCircle',
            request: 'Globe'
        };
        return icons[level] || 'FileText';
    };

    // 过滤分隔符行
    const filteredLogs = logs.filter(log => {
        if (!log || !log.message) return false;
        const message = log.message.trim();
        if (!message || message.length < 3) return false;
        return !/^[═─=\-*_~]+$/.test(message);
    });

    const highlightMessage = (message) => {
        if (!searchKeyword) return { __html: message };
        const regex = new RegExp(`(${searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return { __html: message.replace(regex, '<mark class="text-highlight">$1</mark>') };
    };

    return (
        <div className="page-container animate-fade-in">
            {/* Stats Grid */}
            <div className="logs-stats-grid">
                <div
                    className={`logs-stat-card ${currentLevel === 'all' ? 'active' : ''}`}
                    onClick={() => handleFilterLevel('all')}
                >
                    <div className="logs-stat-content">
                        <div className="logs-stat-label">全部日志</div>
                        <div className="logs-stat-value">{stats.total}</div>
                    </div>
                    <div className="logs-stat-icon-bg">
                        <Icon name="FileText" />
                    </div>
                </div>
                <div
                    className={`logs-stat-card info ${currentLevel === 'info' ? 'active' : ''}`}
                    onClick={() => handleFilterLevel('info')}
                >
                    <div className="logs-stat-content">
                        <div className="logs-stat-label">信息</div>
                        <div className="logs-stat-value">{stats.info}</div>
                    </div>
                    <div className="logs-stat-icon-bg">
                        <Icon name="Info" />
                    </div>
                </div>
                <div
                    className={`logs-stat-card warning ${currentLevel === 'warn' ? 'active' : ''}`}
                    onClick={() => handleFilterLevel('warn')}
                >
                    <div className="logs-stat-content">
                        <div className="logs-stat-label">警告</div>
                        <div className="logs-stat-value">{stats.warn}</div>
                    </div>
                    <div className="logs-stat-icon-bg">
                        <Icon name="AlertTriangle" />
                    </div>
                </div>
                <div
                    className={`logs-stat-card danger ${currentLevel === 'error' ? 'active' : ''}`}
                    onClick={() => handleFilterLevel('error')}
                >
                    <div className="logs-stat-content">
                        <div className="logs-stat-label">错误</div>
                        <div className="logs-stat-value">{stats.error}</div>
                    </div>
                    <div className="logs-stat-icon-bg">
                        <Icon name="AlertCircle" />
                    </div>
                </div>
                <div
                    className={`logs-stat-card success ${currentLevel === 'request' ? 'active' : ''}`}
                    onClick={() => handleFilterLevel('request')}
                >
                    <div className="logs-stat-content">
                        <div className="logs-stat-label">请求</div>
                        <div className="logs-stat-value">{stats.request}</div>
                    </div>
                    <div className="logs-stat-icon-bg">
                        <Icon name="Globe" />
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="logs-actions-bar">
                <div className="search-container">
                    <div style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--zinc-400)',
                        pointerEvents: 'none',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <Icon name="Search" size={16} />
                    </div>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="搜索日志..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    />
                </div>

                <div className="logs-action-buttons">
                    <Button variant="secondary" onClick={handleManualRefresh}>
                        <Icon name="RefreshCw" size={16} className={isLoading ? "loading" : ""} />
                    </Button>
                    <Button
                        variant={autoRefresh ? "dark" : "secondary"}
                        onClick={toggleAutoRefresh}
                        className={autoRefresh ? "btn-dark" : ""}
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        <Icon name={autoRefresh ? "Pause" : "RefreshCw"} size={16} />
                        <span className="btn-text-desktop">{autoRefresh ? '停止刷新' : '自动刷新'}</span>
                        <span className="btn-text-mobile">{autoRefresh ? '停止' : '自动'}</span>
                    </Button>
                    <Button variant="secondary" onClick={handleExportLogs}>
                        <Icon name="Download" size={16} />
                        <span className="btn-text-desktop">导出</span>
                    </Button>
                    <Button variant="danger" onClick={() => {
                        if (confirm('确定要清空所有日志吗？此操作不可恢复。')) {
                            handleClearLogs();
                        }
                    }}>
                        <Icon name="Trash2" size={16} />
                        <span className="btn-text-desktop">清空</span>
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <Card className="overflow-hidden">
                {filteredLogs.length === 0 ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <Icon name="FileText" size={48} style={{ color: 'var(--zinc-300)', opacity: 0.5 }} />
                        <p style={{ color: 'var(--zinc-400)', fontSize: '14px' }}>
                            {searchKeyword ? '没有找到匹配的日志' : '暂无日志记录'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* 1. Desktop View (Table) */}
                        <div className="logs-desktop-view" style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '100px' }}>级别</th>
                                        <th style={{ width: '180px' }}>时间</th>
                                        <th>内容</th>
                                        <th style={{ width: '80px' }} className="text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map((log, index) => {
                                        const time = new Date(log.timestamp).toLocaleString('zh-CN', {
                                            hour12: false,
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        });

                                        return (
                                            <tr key={index} style={{ height: 'auto' }}>
                                                <td style={{ padding: '8px 12px' }}>
                                                    <span className={`badge ${getLevelBadgeClass(log.level)}`}>
                                                        <Icon name={getLevelIcon(log.level)} size={12} />
                                                        {log.level.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '13px', color: 'var(--zinc-500)', fontFamily: 'monospace', padding: '8px 12px' }}>
                                                    {time}
                                                </td>
                                                <td style={{ padding: '8px 12px' }}>
                                                    <div
                                                        className="logs-message-box"
                                                        style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}
                                                        dangerouslySetInnerHTML={highlightMessage(log.message)}
                                                    />
                                                </td>
                                                <td className="text-center" style={{ padding: '8px 12px' }}>
                                                    <button
                                                        onClick={() => copyLogContent(log.message)}
                                                        className="btn btn-ghost btn-icon btn-sm"
                                                        title="复制内容"
                                                    >
                                                        <Icon name="Copy" size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* 2. Mobile View (Card List) */}
                        <div className="logs-mobile-view">
                            {filteredLogs.map((log, index) => {
                                const time = new Date(log.timestamp).toLocaleString('zh-CN', {
                                    hour12: false,
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                });

                                return (
                                    <div key={index} className="logs-list-item">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span className={`badge ${getLevelBadgeClass(log.level)}`}>
                                                <Icon name={getLevelIcon(log.level)} size={12} />
                                                {log.level.toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: '12px', color: 'var(--zinc-400)', fontFamily: 'monospace' }}>
                                                {time}
                                            </span>
                                        </div>

                                        <div
                                            className="logs-message-box"
                                            dangerouslySetInnerHTML={highlightMessage(log.message)}
                                        />

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            <button
                                                onClick={() => copyLogContent(log.message)}
                                                className="copy-btn-mobile"
                                            >
                                                <Icon name="Copy" size={12} />
                                                <span>复制内容</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Load More */}
                {logs.length < total && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', textAlign: 'center', background: 'var(--bg-hover)' }}>
                        <Button variant="secondary" onClick={handleLoadMore} loading={isLoading} style={{ minWidth: '200px' }}>
                            加载更多 ({logs.length}/{total})
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

// 暴露到全局对象
Object.assign(globalThis, { Logs });
