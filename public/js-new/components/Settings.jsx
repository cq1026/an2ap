// ==================== Settings (配置管理) ====================
const { useState, useEffect } = React;

        const Settings = ({ darkMode }) => {
            const [config, setConfig] = useState({});
            const [isSaving, setIsSaving] = useState(false);
            const [rotationStatus, setRotationStatus] = useState({ currentIndex: 0 });
            const [fontSize, setFontSize] = useState(() => {
                return parseInt(localStorage.getItem('fontSize')) || 16;
            });
            const [isOfficialPromptLocked, setIsOfficialPromptLocked] = useState(true);
            const [passwordModal, setPasswordModal] = useState({ isOpen: false });
            const { addToast } = useToast();

            // 默认的官方系统提示词
            const DEFAULT_OFFICIAL_PROMPT = 'You are Antigravity, a powerful agentic AI coding assistant designed by the Google Deepmind team working on Advanced Agentic Coding.You are pair programming with a USER to solve their coding task. The task may require creating a new codebase, modifying or debugging an existing codebase, or simply answering a question.**Proactiveness**';

            useEffect(() => {
                loadConfig();
                loadRotationStatus();
            }, []);

            useEffect(() => {
                document.documentElement.style.fontSize = `${fontSize}px`;
                localStorage.setItem('fontSize', fontSize);
            }, [fontSize]);

            const loadRotationStatus = async () => {
                try {
                    const response = await authFetch('/admin/rotation');
                    const data = await response.json();
                    if (data.success) {
                        setRotationStatus(data.data);
                    }
                } catch (error) {
                    // 忽略错误，使用默认值
                }
            };

            const loadConfig = async () => {
                try {
                    const response = await authFetch('/admin/config');
                    const data = await response.json();

                    if (data.success) {
                        const { env, json } = data.data;

                        // 扁平化 json 数据以匹配输入框的 key
                        const flattened = {
                            ...env,
                            // server
                            PORT: json.server?.port,
                            HOST: json.server?.host,
                            MAX_REQUEST_SIZE: json.server?.maxRequestSize,
                            HEARTBEAT_INTERVAL: json.server?.heartbeatInterval,
                            MEMORY_CLEANUP_INTERVAL: json.server?.memoryCleanupInterval,
                            // api
                            API_USE: json.api?.use,
                            // defaults
                            DEFAULT_TEMPERATURE: json.defaults?.temperature,
                            DEFAULT_TOP_P: json.defaults?.topP,
                            DEFAULT_TOP_K: json.defaults?.topK,
                            DEFAULT_MAX_TOKENS: json.defaults?.maxTokens,
                            DEFAULT_THINKING_BUDGET: json.defaults?.thinkingBudget,
                            // rotation
                            ROTATION_STRATEGY: json.rotation?.strategy,
                            ROTATION_REQUEST_COUNT: json.rotation?.requestCount,
                            // other
                            TIMEOUT: json.other?.timeout,
                            RETRY_TIMES: json.other?.retryTimes,
                            SKIP_PROJECT_ID_FETCH: json.other?.skipProjectIdFetch,
                            USE_NATIVE_AXIOS: json.other?.useNativeAxios,
                            USE_CONTEXT_SYSTEM_PROMPT: json.other?.useContextSystemPrompt,
                            MERGE_SYSTEM_PROMPT: json.other?.mergeSystemPrompt,
                            FAKE_NON_STREAM: json.other?.fakeNonStream,
                            OFFICIAL_PROMPT_POSITION: json.other?.officialPromptPosition,
                            OFFICIAL_SYSTEM_PROMPT: env.OFFICIAL_SYSTEM_PROMPT,
                            PASS_SIGNATURE_TO_CLIENT: json.other?.passSignatureToClient || false,
                            USE_FALLBACK_SIGNATURE: json.other?.useFallbackSignature !== false,
                            CACHE_ALL_SIGNATURES: json.other?.cacheAllSignatures || false,
                            CACHE_TOOL_SIGNATURES: json.other?.cacheToolSignatures !== false,
                            CACHE_IMAGE_SIGNATURES: json.other?.cacheImageSignatures !== false,
                            CACHE_THINKING: json.other?.cacheThinking !== false
                        };

                        // 如果官方系统提示词为空，使用默认值
                        if (!flattened.OFFICIAL_SYSTEM_PROMPT) {
                            flattened.OFFICIAL_SYSTEM_PROMPT = DEFAULT_OFFICIAL_PROMPT;
                        }

                        setConfig(flattened);
                    } else {
                        addToast('加载配置失败: ' + data.message, 'error');
                    }
                } catch (error) {
                    addToast('加载配置失败: ' + error.message, 'error');
                }
            };

            // 解锁官方系统提示词
            const unlockOfficialPrompt = () => {
                setPasswordModal({ isOpen: true });
            };

            // 验证密码并解锁
            const handlePasswordConfirm = async (password) => {
                try {
                    // 利用 /admin/tokens/import 接口验证密码
                    // 传入空 tokens 数组，merge 模式不会改变任何数据
                    const response = await authFetch('/admin/tokens/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            password,
                            data: { tokens: [] },
                            mode: 'merge'
                        })
                    });

                    const data = await response.json();
                    if (response.status === 403) {
                        // 密码错误
                        addToast('密码错误', 'error');
                    } else if (data.success) {
                        // 密码正确，解锁
                        setIsOfficialPromptLocked(false);
                        setPasswordModal({ isOpen: false });
                        addToast('已解锁，请谨慎修改！修改官方系统提示词可能导致 429 错误', 'warning');
                    } else {
                        addToast(data.message || '验证失败', 'error');
                    }
                } catch (error) {
                    addToast('验证失败: ' + error.message, 'error');
                }
            };

            // 恢复默认官方系统提示词
            const restoreDefaultOfficialPrompt = () => {
                setConfig({ ...config, OFFICIAL_SYSTEM_PROMPT: DEFAULT_OFFICIAL_PROMPT });
                addToast('已恢复默认官方系统提示词', 'success');
            };

            const handleSave = async () => {
                setIsSaving(true);
                try {
                    // 将扁平化的 config 还原为嵌套结构
                    const envConfig = {
                        API_KEY: config.API_KEY,
                        PROXY: config.PROXY,
                        IMAGE_BASE_URL: config.IMAGE_BASE_URL,
                        SYSTEM_INSTRUCTION: config.SYSTEM_INSTRUCTION,
                        OFFICIAL_SYSTEM_PROMPT: config.OFFICIAL_SYSTEM_PROMPT
                    };

                    const jsonConfig = {
                        server: {
                            port: config.PORT !== undefined ? Number(config.PORT) : undefined,
                            host: config.HOST,
                            maxRequestSize: config.MAX_REQUEST_SIZE,
                            heartbeatInterval: config.HEARTBEAT_INTERVAL !== undefined ? Number(config.HEARTBEAT_INTERVAL) : undefined,
                            memoryCleanupInterval: config.MEMORY_CLEANUP_INTERVAL !== undefined ? Number(config.MEMORY_CLEANUP_INTERVAL) : undefined
                        },
                        api: {
                            use: config.API_USE || 'sandbox'
                        },
                        defaults: {
                            temperature: config.DEFAULT_TEMPERATURE !== undefined ? Number(config.DEFAULT_TEMPERATURE) : undefined,
                            topP: config.DEFAULT_TOP_P !== undefined ? Number(config.DEFAULT_TOP_P) : undefined,
                            topK: config.DEFAULT_TOP_K !== undefined ? Number(config.DEFAULT_TOP_K) : undefined,
                            maxTokens: config.DEFAULT_MAX_TOKENS !== undefined ? Number(config.DEFAULT_MAX_TOKENS) : undefined,
                            thinkingBudget: config.DEFAULT_THINKING_BUDGET !== undefined ? Number(config.DEFAULT_THINKING_BUDGET) : undefined
                        },
                        rotation: {
                            strategy: config.ROTATION_STRATEGY || 'round_robin',
                            requestCount: config.ROTATION_REQUEST_COUNT !== undefined ? Number(config.ROTATION_REQUEST_COUNT) : 10
                        },
                        other: {
                            timeout: config.TIMEOUT !== undefined ? Number(config.TIMEOUT) : undefined,
                            retryTimes: config.RETRY_TIMES !== undefined ? Number(config.RETRY_TIMES) : undefined,
                            skipProjectIdFetch: config.SKIP_PROJECT_ID_FETCH || false,
                            useNativeAxios: config.USE_NATIVE_AXIOS || false,
                            useContextSystemPrompt: config.USE_CONTEXT_SYSTEM_PROMPT || false,
                            mergeSystemPrompt: config.MERGE_SYSTEM_PROMPT || false,
                            fakeNonStream: config.FAKE_NON_STREAM || false,
                            officialPromptPosition: config.OFFICIAL_PROMPT_POSITION || 'before',
                            passSignatureToClient: config.PASS_SIGNATURE_TO_CLIENT || false,
                            useFallbackSignature: config.USE_FALLBACK_SIGNATURE !== false,
                            cacheAllSignatures: config.CACHE_ALL_SIGNATURES || false,
                            cacheToolSignatures: config.CACHE_TOOL_SIGNATURES !== false,
                            cacheImageSignatures: config.CACHE_IMAGE_SIGNATURES !== false,
                            cacheThinking: config.CACHE_THINKING !== false
                        }
                    };

                    // 移除 undefined 值（保留空字符串，以支持清空字段）
                    const cleanObj = (obj) => {
                        Object.keys(obj).forEach(key => {
                            if (obj[key] && typeof obj[key] === 'object') {
                                cleanObj(obj[key]);
                            } else if (obj[key] === undefined) {
                                delete obj[key];
                            }
                        });
                        return obj;
                    };

                    const response = await authFetch('/admin/config', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ env: cleanObj(envConfig), json: cleanObj(jsonConfig) })
                    });

                    const data = await response.json();
                    if (data.success) {
                        // 额外调用 rotation API 更新 tokenManager 的运行时状态
                        if (jsonConfig.rotation && Object.keys(jsonConfig.rotation).length > 0) {
                            await authFetch('/admin/rotation', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(jsonConfig.rotation)
                            });
                        }

                        addToast('配置已保存并生效', 'success');
                        // 重新锁定官方系统提示词
                        setIsOfficialPromptLocked(true);
                        // 重新加载配置以确保UI显示最新值
                        loadConfig();
                    } else {
                        addToast('保存配置失败: ' + data.message, 'error');
                    }
                } catch (error) {
                    addToast('保存配置失败: ' + error.message, 'error');
                } finally {
                    setIsSaving(false);
                }
            };

            const rotationStatusText = {
                'round_robin': '均衡负载',
                'quota_exhausted': '额度耗尽切换',
                'request_count': `自定义次数 (每 ${config.ROTATION_REQUEST_COUNT || config.requestCount || 10} 次)`
            }[config.ROTATION_STRATEGY || config.strategy || 'round_robin'] || (config.ROTATION_STRATEGY || config.strategy || 'round_robin');

            return (
                <div className="page-container animate-fade-in" style={{ maxWidth: '1024px' }}>
                    <div className="mb-6">
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>系统设置</h2>
                        <p style={{ fontSize: '14px', color: 'var(--zinc-500)' }}>修改 config.json 与服务器参数</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {/* Server Config */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon name="Zap" size={16} /> 服务器配置 (Server)
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <Input label="端口 (Port)" type="number" value={config.PORT || ''} onChange={(e) => setConfig({ ...config, PORT: e.target.value })} />
                                <Input label="Host" value={config.HOST || ''} onChange={(e) => setConfig({ ...config, HOST: e.target.value })} />
                                <Input label="最大请求大小" value={config.MAX_REQUEST_SIZE || ''} onChange={(e) => setConfig({ ...config, MAX_REQUEST_SIZE: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <Select
                                    label="API 环境"
                                    value={config.API_USE || 'sandbox'}
                                    onChange={(e) => setConfig({ ...config, API_USE: e.target.value })}
                                    options={[
                                        { value: 'sandbox', label: 'Sandbox (测试)' },
                                        { value: 'production', label: 'Production (生产)' }
                                    ]}
                                    help="选择使用 sandbox 或 production 环境的 API 接口"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <Input label="心跳间隔 (ms)" type="number" value={config.HEARTBEAT_INTERVAL || ''} onChange={(e) => setConfig({ ...config, HEARTBEAT_INTERVAL: e.target.value })} help="SSE心跳间隔，防止CF超时断连" />
                                <Input label="内存清理间隔 (ms)" type="number" value={config.MEMORY_CLEANUP_INTERVAL || ''} onChange={(e) => setConfig({ ...config, MEMORY_CLEANUP_INTERVAL: e.target.value })} help="按固定间隔触发缓存/对象池清理" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <Input label="图片访问链接" value={config.IMAGE_BASE_URL || ''} onChange={(e) => setConfig({ ...config, IMAGE_BASE_URL: e.target.value })} placeholder="https://your-domain.com" />
                                <Input label="代理地址" value={config.PROXY || ''} onChange={(e) => setConfig({ ...config, PROXY: e.target.value })} placeholder="http://127.0.0.1:7897" />
                            </div>
                        </section>

                        {/* Model Defaults */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon name="Settings" size={16} /> 模型默认参数 (Defaults)
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                                <Input label="Temperature" type="number" step="0.1" value={config.DEFAULT_TEMPERATURE || ''} onChange={(e) => setConfig({ ...config, DEFAULT_TEMPERATURE: e.target.value })} />
                                <Input label="Top P" type="number" step="0.01" value={config.DEFAULT_TOP_P || ''} onChange={(e) => setConfig({ ...config, DEFAULT_TOP_P: e.target.value })} />
                                <Input label="Top K" type="number" value={config.DEFAULT_TOP_K || ''} onChange={(e) => setConfig({ ...config, DEFAULT_TOP_K: e.target.value })} />
                                <Input label="Max Tokens" type="number" value={config.DEFAULT_MAX_TOKENS || ''} onChange={(e) => setConfig({ ...config, DEFAULT_MAX_TOKENS: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <Input label="思考预算 (Thinking Budget)" type="number" value={config.DEFAULT_THINKING_BUDGET || ''} onChange={(e) => setConfig({ ...config, DEFAULT_THINKING_BUDGET: e.target.value })} help="思考模型的思考token预算，影响推理深度" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', paddingTop: '8px' }}>
                                <Toggle
                                    label="上下文 System (Context System)"
                                    checked={config.USE_CONTEXT_SYSTEM_PROMPT || false}
                                    onChange={(val) => setConfig({ ...config, USE_CONTEXT_SYSTEM_PROMPT: val, MERGE_SYSTEM_PROMPT: val ? config.MERGE_SYSTEM_PROMPT : false })}
                                    help="合并开头连续的 system 消息到 SystemInstruction"
                                />
                                <Toggle
                                    label="合并提示词 (Merge System)"
                                    checked={config.MERGE_SYSTEM_PROMPT || false}
                                    onChange={(val) => setConfig({ ...config, MERGE_SYSTEM_PROMPT: val })}
                                    help="将所有系统提示词合并为单个 part（需先开启上下文 System）"
                                    className={config.USE_CONTEXT_SYSTEM_PROMPT ? '' : 'opacity-50 pointer-events-none'}
                                />
                            </div>
                        </section>

                        {/* Rotation & Performance */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon name="BarChart3" size={16} /> 轮询与性能 (Rotation)
                            </h3>
                            <div style={{
                                background: darkMode ? 'rgba(120, 53, 15, 0.2)' : 'var(--amber-50)',
                                padding: '12px',
                                borderRadius: '8px',
                                border: darkMode ? '1px solid var(--amber-800)' : '1px solid var(--amber-200)',
                                fontSize: '12px',
                                color: darkMode ? 'var(--amber-400)' : 'var(--amber-800)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span>当前状态: <span style={{ fontWeight: 600 }}>{rotationStatusText}</span> | 索引: {rotationStatus.currentIndex}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <Select
                                    label="策略模式"
                                    value={config.ROTATION_STRATEGY || config.strategy || 'round_robin'}
                                    onChange={(e) => setConfig({ ...config, ROTATION_STRATEGY: e.target.value, strategy: e.target.value })}
                                    options={[
                                        { value: 'round_robin', label: '均衡负载 (Round Robin)' },
                                        { value: 'quota_exhausted', label: '额度耗尽切换' },
                                        { value: 'request_count', label: '自定义次数' }
                                    ]}
                                    help="选择 Token 的轮询切换策略"
                                />
                                {(config.ROTATION_STRATEGY === 'request_count' || config.strategy === 'request_count') && (
                                    <Input
                                        label="每Token请求次数"
                                        type="number"
                                        min="1"
                                        value={config.ROTATION_REQUEST_COUNT || config.requestCount || ''}
                                        onChange={(e) => setConfig({ ...config, ROTATION_REQUEST_COUNT: e.target.value, requestCount: e.target.value })}
                                    />
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', paddingTop: '8px' }}>
                                <Toggle
                                    label="透传签名 (Pass Signature)"
                                    checked={config.PASS_SIGNATURE_TO_CLIENT || false}
                                    onChange={(val) => setConfig({ ...config, PASS_SIGNATURE_TO_CLIENT: val })}
                                    help="将响应中的 thoughtSignature 透传到客户端"
                                />
                                <Toggle
                                    label="兜底签名 (Fallback Signature)"
                                    checked={config.USE_FALLBACK_SIGNATURE !== false}
                                    onChange={(val) => setConfig({ ...config, USE_FALLBACK_SIGNATURE: val })}
                                    help="没有缓存签名时，使用内置默认签名自动补全"
                                />
                                <Toggle
                                    label="缓存所有签名 (Cache All)"
                                    checked={config.CACHE_ALL_SIGNATURES || false}
                                    onChange={(val) => setConfig({ ...config, CACHE_ALL_SIGNATURES: val })}
                                    help="开启后缓存所有签名"
                                />
                                <Toggle
                                    label="工具签名 (Tool Signatures)"
                                    checked={config.CACHE_TOOL_SIGNATURES !== false}
                                    onChange={(val) => setConfig({ ...config, CACHE_TOOL_SIGNATURES: val })}
                                    help="使用工具时缓存签名"
                                />
                                <Toggle
                                    label="图像签名 (Image Signatures)"
                                    checked={config.CACHE_IMAGE_SIGNATURES !== false}
                                    onChange={(val) => setConfig({ ...config, CACHE_IMAGE_SIGNATURES: val })}
                                    help="使用图像模型时缓存签名"
                                />
                                <Toggle
                                    label="缓存思考 (Cache Thinking)"
                                    checked={config.CACHE_THINKING !== false}
                                    onChange={(val) => setConfig({ ...config, CACHE_THINKING: val })}
                                    help="缓存思考内容，随签名一起返回"
                                />
                            </div>
                        </section>

                        {/* Other */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon name="Settings" size={16} /> 其他设置 (Other)
                            </h3>
                            <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                    <Input label="请求超时 (ms)" type="number" value={config.TIMEOUT || ''} onChange={(e) => setConfig({ ...config, TIMEOUT: e.target.value })} />
                                    <Input label="429重试次数" type="number" value={config.RETRY_TIMES || ''} onChange={(e) => setConfig({ ...config, RETRY_TIMES: e.target.value })} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', paddingTop: '8px' }}>
                                    <Toggle
                                        label="跳过 ProjectId 验证"
                                        checked={config.SKIP_PROJECT_ID_FETCH || false}
                                        onChange={(val) => setConfig({ ...config, SKIP_PROJECT_ID_FETCH: val })}
                                        help="开启后将随机生成 Project ID"
                                    />
                                    <Toggle
                                        label="原生 Axios"
                                        checked={config.USE_NATIVE_AXIOS || false}
                                        onChange={(val) => setConfig({ ...config, USE_NATIVE_AXIOS: val })}
                                        help="使用原生 axios 而非 TLS 指纹请求器"
                                    />
                                    <Toggle
                                        label="假非流 (Fake Non-Stream)"
                                        checked={config.FAKE_NON_STREAM || false}
                                        onChange={(val) => setConfig({ ...config, FAKE_NON_STREAM: val })}
                                        help="非流式请求使用流式获取数据，最终返回非流式格式（更快）"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Security & System */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>安全与环境变量 (Env / Security)</h3>
                            <Input label="API Key" type="password" value={config.API_KEY || ''} onChange={(e) => setConfig({ ...config, API_KEY: e.target.value })} help="客户端调用 API 时所需的 Bearer Token" />
                            <div className="form-group">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label className="form-label" style={{ margin: 0 }}>反代系统提示词 (System Instruction)</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const defaultPrompt = '你是聊天机器人，名字叫萌萌，如同名字这般，你的性格是软软糯糯萌萌哒的，专门为用户提供聊天和情绪价值，协助进行小说创作或者角色扮演';
                                            setConfig({ ...config, SYSTEM_INSTRUCTION: defaultPrompt });
                                            addToast('已恢复默认反代系统提示词', 'success');
                                        }}
                                        style={{ fontSize: '12px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Icon name="RotateCcw" size={14} /> 恢复默认
                                    </button>
                                </div>
                                <textarea className="form-textarea" rows={3} value={config.SYSTEM_INSTRUCTION || ''} onChange={(e) => setConfig({ ...config, SYSTEM_INSTRUCTION: e.target.value })} placeholder="输入反代系统提示词..."></textarea>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <Select
                                    label="官方提示词位置"
                                    value={config.OFFICIAL_PROMPT_POSITION || 'before'}
                                    onChange={(e) => setConfig({ ...config, OFFICIAL_PROMPT_POSITION: e.target.value })}
                                    options={[
                                        { value: 'before', label: '在反代提示词前面' },
                                        { value: 'after', label: '在反代提示词后面' }
                                    ]}
                                    help="官方提示词相对于反代提示词的位置"
                                />
                            </div>
                            <div className="form-group">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label className="form-label" style={{ margin: 0 }}>
                                        官方系统提示词 (Official System Prompt)
                                        <span style={{ fontSize: '12px', color: 'var(--zinc-500)', marginLeft: '8px' }}>反重力官方要求的系统提示词</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {!isOfficialPromptLocked && (
                                            <button
                                                type="button"
                                                onClick={restoreDefaultOfficialPrompt}
                                                style={{ fontSize: '12px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Icon name="RotateCcw" size={14} /> 恢复默认
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => isOfficialPromptLocked ? unlockOfficialPrompt() : null}
                                            style={{ background: 'none', border: 'none', cursor: isOfficialPromptLocked ? 'pointer' : 'default', padding: '4px', display: 'flex', alignItems: 'center' }}
                                            title={isOfficialPromptLocked ? '点击解锁修改' : '已解锁'}
                                        >
                                            <Icon name={isOfficialPromptLocked ? "Lock" : "Unlock"} size={16} />
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    className="form-textarea"
                                    rows={5}
                                    value={config.OFFICIAL_SYSTEM_PROMPT || ''}
                                    onChange={(e) => setConfig({ ...config, OFFICIAL_SYSTEM_PROMPT: e.target.value })}
                                    placeholder="官方系统提示词（留空则不使用）"
                                    readOnly={isOfficialPromptLocked}
                                    style={{ opacity: isOfficialPromptLocked ? 0.7 : 1, cursor: isOfficialPromptLocked ? 'not-allowed' : 'text' }}
                                ></textarea>
                            </div>
                        </section>

                        {/* Interface Settings */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>界面设置 (Interface)</h3>
                            <div className="form-group">
                                <label className="form-label">界面字体大小 (px)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px' }}>
                                    <input
                                        type="range"
                                        min="12"
                                        max="24"
                                        step="1"
                                        value={fontSize}
                                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                                        style={{ flex: 1, height: '6px', background: 'var(--zinc-200)', borderRadius: '8px', cursor: 'pointer' }}
                                    />
                                    <input
                                        type="number"
                                        min="12"
                                        max="24"
                                        value={fontSize}
                                        onChange={(e) => setFontSize(Math.max(12, Math.min(24, parseInt(e.target.value) || 16)))}
                                        style={{ width: '48px', textAlign: 'center', background: 'transparent', border: 'none', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <p className="form-help">调整全局字体大小，默认 16px</p>
                            </div>
                        </section>

                        <div style={{ paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <Button size="lg" onClick={handleSave} loading={isSaving}>保存配置</Button>
                        </div>

                        {/* 密码验证模态框 */}
                        <PasswordModal
                            isOpen={passwordModal.isOpen}
                            onClose={() => setPasswordModal({ isOpen: false })}
                            onConfirm={handlePasswordConfirm}
                            title="解锁官方系统提示词"
                            message="警告！修改官方系统提示词可能会导致 429 错误！请输入管理员密码以解锁："
                        />
                    </div>
                </div>
            );
        };

// 暴露到全局对象
Object.assign(globalThis, { Settings });
