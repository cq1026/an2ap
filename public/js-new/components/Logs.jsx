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

    return (
        <div className="page-container animate-fade-in">
            {/* Stats Grid - 改进的统计卡片设计 */}
            <div className="stats-grid">
                <Card
                    className={`stat-card ${currentLevel === 'all' ? 'active' : ''}`}
                    onClick={() => handleFilterLevel('all')}
                    style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                >
                    <div className="stat-info" style={{ position: 'relative', zIndex: 1 }}>
                        <div className="stat-label">全部日志</div>
                        <div className="stat-value">{stats.total}</div>
                    </div>
                    <div className="stat-icon">
                        <Icon name="FileText" />
                    </div>
                    {/* 背景装饰图标 */}
                    <div style={{
                        position: 'absolute',
                        right: '8px',
                        bottom: '8px',
                        opacity: 0.1,
                        transform: 'scale(1.8)'
                    }}>
                        <Icon name="FileText" size={32} />
                    </div>
                </Card>
                <Card
                    className={`stat-card info ${currentLevel === 'info' ? 'active' : ''}`}
                    onClick={() => handleFilterLevel('info')}
                    style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                >
                    <div className="stat-info" style={{ position: 'relative', zIndex: 1 }}>
                        <div className="stat-label">信息</div>
                        <div className="stat-value">{stats.info}</div>
                    </div>
                    <div className="stat-icon">
                        <Icon name="Info" />
                    </div>
                    <div style={{
                        position: 'absolute',
                        right: '8px',
                        bottom: '8px',
                        opacity: 0.1,
                        transform: 'scale(1.8)'
                    }}>
                        <Icon name="Info" size={32} />
                    </div>
                </Card>
                <Card
                    className={`stat-card warning ${currentLevel === 'warn' ? 'active' : ''}`}
                    onClick={() => handleFilterLevel('warn')}
                    style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                >
                    <div className="stat-info" style={{ position: 'relative', zIndex: 1 }}>
                        <div className="stat-label">警告</div>
                        <div className="stat-value">{stats.warn}</div>
                    </div>
                    <div className="stat-icon">
                        <Icon name="AlertTriangle" />
                    </div>
                    <div style={{
                        position: 'absolute',
                        right: '8px',
                        bottom: '8px',
                        opacity: 0.1,
                        transform: 'scale(1.8)'
                    }}>
                        <Icon name="AlertTriangle" size={32} />
                    </div>
                </Card>
                <Card
                    className={`stat-card danger ${currentLevel === 'error' ? 'active' : ''}`}
                    onClick={() => handleFilterLevel('error')}
                    style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                >
                    <div className="stat-info" style={{ position: 'relative', zIndex: 1 }}>
                        <div className="stat-label">错误</div>
                        <div className="stat-value">{stats.error}</div>
                    </div>
                    <div className="stat-icon">
                        <Icon name="AlertCircle" />
                    </div>
                    <div style={{
                        position: 'absolute',
                        right: '8px',
                        bottom: '8px',
                        opacity: 0.1,
                        transform: 'scale(1.8)'
                    }}>
                        <Icon name="AlertCircle" size={32} />
                    </div>
                </Card>
                <Card
                    className={`stat-card success ${currentLevel === 'request' ? 'active' : ''}`}
                    onClick={() => handleFilterLevel('request')}
                    style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                >
                    <div className="stat-info" style={{ position: 'relative', zIndex: 1 }}>
                        <div className="stat-label">请求</div>
                        <div className="stat-value">{stats.request}</div>
                    </div>
                    <div className="stat-icon">
                        <Icon name="Globe" />
                    </div>
                    <div style={{
                        position: 'absolute',
                        right: '8px',
                        bottom: '8px',
                        opacity: 0.1,
                        transform: 'scale(1.8)'
                    }}>
                        <Icon name="Globe" size={32} />
                    </div>
                </Card>
            </div>

            {/* Actions Bar - 改进的响应式布局 */}
            <div className="flex justify-between items-center mb-6" style={{ marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div className="search-container" style={{ flex: '1 1 auto', minWidth: '200px', maxWidth: '400px', position: 'relative' }}>
                    <Icon name="Search" size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--zinc-400)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="搜索日志内容..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        style={{ paddingLeft: '40px', width: '100%' }}
                    />
                </div>
                <div className="flex gap-2" style={{ flexWrap: 'nowrap' }}>
                    <Button variant="secondary" onClick={() => { loadLogs(); loadLogStats(); }} title="刷新">
                        <Icon name="RefreshCw" size={16} className={isLoading ? "loading" : ""} />
                        <span className="btn-text-desktop">刷新</span>
                    </Button>
                    <Button
                        variant={autoRefresh ? "primary" : "secondary"}
                        onClick={toggleAutoRefresh}
                        title={autoRefresh ? "停止自动刷新" : "开启自动刷新"}
                    >
                        <Icon name={autoRefresh ? "Pause" : "RefreshCw"} size={16} />
                        <span className="btn-text-desktop">{autoRefresh ? '停止' : '自动'}</span>
                    </Button>
                    <Button variant="secondary" onClick={handleExportLogs} title="导出日志">
                        <Icon name="Download" size={16} />
                        <span className="btn-text-desktop">导出</span>
                    </Button>
                    <Button variant="danger" onClick={() => {
                        if (confirm('确定要清空所有日志吗？此操作不可恢复。')) {
                            handleClearLogs();
                        }
                    }} title="清空日志">
                        <Icon name="Trash2" size={16} />
                        <span className="btn-text-desktop">清空</span>
                    </Button>
                </div>
            </div>

            {/* Desktop Table View */}
            <Card className="logs-desktop-view">
                <div style={{ overflowX: 'auto' }}>
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
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center" style={{ padding: '48px 24px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <Icon name="FileText" size={48} style={{ color: 'var(--zinc-300)', opacity: 0.5 }} />
                                            <p style={{ color: 'var(--zinc-400)', fontSize: '14px' }}>
                                                {searchKeyword ? '没有找到匹配的日志' : '暂无日志记录'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log, index) => {
                                    const time = new Date(log.timestamp).toLocaleString('zh-CN', {
                                        hour12: false,
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    });

                                    let message = log.message;
                                    if (searchKeyword) {
                                        const regex = new RegExp(`(${searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                                        message = message.replace(regex, '<mark style="background: var(--yellow-200); padding: 1px 3px; border-radius: 2px;">$1</mark>');
                                    }

                                    return (
                                        <tr key={index}>
                                            <td>
                                                <span className={`badge ${getLevelBadgeClass(log.level)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Icon name={getLevelIcon(log.level)} size={12} />
                                                    {log.level.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '13px', color: 'var(--zinc-500)', fontFamily: 'monospace' }}>
                                                {time}
                                            </td>
                                            <td>
                                                <div
                                                    className="font-mono"
                                                    style={{
                                                        fontSize: '13px',
                                                        lineHeight: '1.6',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                        maxHeight: '120px',
                                                        overflow: 'auto'
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: message }}
                                                />
                                            </td>
                                            <td className="text-center">
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
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Load More */}
                {logs.length < total && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <Button variant="secondary" onClick={handleLoadMore} loading={isLoading}>
                            加载更多 ({logs.length}/{total})
                        </Button>
                    </div>
                )}
            </Card>

            {/* Mobile Card View - 改进的设计 */}
            <div className="logs-mobile-view" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {filteredLogs.length === 0 ? (
                    <Card>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: '12px' }}>
                            <Icon name="FileText" size={48} style={{ color: 'var(--zinc-300)', opacity: 0.5 }} />
                            <p style={{ color: 'var(--zinc-400)', fontSize: '14px', textAlign: 'center' }}>
                                {searchKeyword ? '没有找到匹配的日志' : '暂无日志记录'}
                            </p>
                        </div>
                    </Card>
                ) : (
                    <>
                        <Card style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {filteredLogs.map((log, index) => {
                                    const time = new Date(log.timestamp).toLocaleString('zh-CN', {
                                        hour12: false,
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    });

                                    let message = log.message;
                                    if (searchKeyword) {
                                        const regex = new RegExp(`(${searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                                        message = message.replace(regex, '<mark style="background: var(--yellow-200); padding: 1px 3px; border-radius: 2px;">$1</mark>');
                                    }

                                    return (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '16px',
                                                borderBottom: index < filteredLogs.length - 1 ? '1px solid var(--border-color)' : 'none',
                                                transition: 'background-color 0.15s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            {/* 头部：级别标签和时间 */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span className={`badge ${getLevelBadgeClass(log.level)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Icon name={getLevelIcon(log.level)} size={12} />
                                                    {log.level.toUpperCase()}
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'var(--zinc-400)', fontFamily: 'monospace' }}>
                                                    {time}
                                                </span>
                                            </div>

                                            {/* 日志内容 */}
                                            <div
                                                className="font-mono"
                                                style={{
                                                    fontSize: '12px',
                                                    lineHeight: '1.6',
                                                    color: 'var(--text-primary)',
                                                    background: 'var(--zinc-50)',
                                                    padding: '10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--zinc-100)',
                                                    marginBottom: '12px',
                                                    wordBreak: 'break-all',
                                                    whiteSpace: 'pre-wrap'
                                                }}
                                                dangerouslySetInnerHTML={{ __html: message }}
                                            />

                                            {/* 操作按钮 */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => copyLogContent(log.message)}
                                                    style={{
                                                        fontSize: '12px',
                                                        color: 'var(--zinc-500)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        border: '1px solid transparent',
                                                        background: 'transparent',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.color = 'var(--zinc-900)';
                                                        e.currentTarget.style.background = 'var(--zinc-100)';
                                                        e.currentTarget.style.borderColor = 'var(--zinc-200)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.color = 'var(--zinc-500)';
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.borderColor = 'transparent';
                                                    }}
                                                >
                                                    <Icon name="Copy" size={12} />
                                                    <span>复制内容</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                        {logs.length < total && (
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                <Button variant="secondary" onClick={handleLoadMore} loading={isLoading} style={{ width: '100%' }}>
                                    加载更多 ({logs.length}/{total})
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// 暴露到全局对象
Object.assign(globalThis, { Logs });
