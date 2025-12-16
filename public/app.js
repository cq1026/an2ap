// ===== 全局状态 =====
let authToken = localStorage.getItem('authToken');
let oauthPort = null;
const CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
const SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/cclog',
    'https://www.googleapis.com/auth/experimentsandconfigs'
].join(' ');

// 封装fetch，自动处理401
const authFetch = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (response.status === 401) {
        silentLogout();
        showToast('登录已过期，请重新登录', 'warning');
        throw new Error('Unauthorized');
    }
    return response;
};

// ===== 深色模式管理 =====
function initDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.documentElement.classList.add('dark');
    }

    // 绑定所有深色模式切换按钮
    const toggleButtons = [
        document.getElementById('darkModeToggleLogin'),
        document.getElementById('darkModeToggle'),
        document.getElementById('darkModeToggleMobile')
    ];

    toggleButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', toggleDarkMode);
        }
    });
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
}

// ===== Toast通知 =====
function showToast(message, type = 'info', title = '') {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const titles = { success: '成功', error: '错误', warning: '警告', info: '提示' };

    // 创建toast容器（如果不存在）
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title || titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== 确认对话框 =====
function showConfirm(message, title = '确认操作') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-container confirm-modal">
                <div class="confirm-content">
                    <h3 class="confirm-title">${title}</h3>
                    <p class="confirm-message">${message}</p>
                </div>
                <div class="confirm-footer">
                    <button class="btn btn-secondary btn-sm" data-action="cancel">取消</button>
                    <button class="btn btn-danger btn-sm" data-action="confirm">确定</button>
                </div>
            </div>
        `;

        overlay.querySelector('[data-action="cancel"]').onclick = () => {
            overlay.remove();
            resolve(false);
        };

        overlay.querySelector('[data-action="confirm"]').onclick = () => {
            overlay.remove();
            resolve(true);
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        };

        document.body.appendChild(overlay);
    });
}

// ===== Loading加载 =====
function showLoading(text = '处理中...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = `
        <div class="spinner"></div>
        <div class="loading-text">${text}</div>
    `;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.remove();
}

// ===== 页面初始化 =====
if (authToken) {
    showMainApp();
    loadTokens();
    loadConfig();
}

initDarkMode();

// ===== 登录 =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn.disabled) return;

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    btn.disabled = true;
    btn.classList.add('loading');
    const originalText = btn.textContent;
    btn.innerHTML = '';

    try {
        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            showToast('登录成功，欢迎回来！', 'success');
            showMainApp();
            loadTokens();
            loadConfig();
        } else {
            showToast(data.message || '用户名或密码错误', 'error');
        }
    } catch (error) {
        showToast('登录失败: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = originalText;
    }
});

function showMainApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
}

function showOAuthModal() {
    showToast('点击后请在新窗口完成授权', 'info', '提示');
    const modal = document.createElement('div');
    modal.className = 'modal form-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-title">🔐 OAuth授权登录</div>
            <div class="oauth-steps">
                <p><strong>📝 授权流程：</strong></p>
                <p>1️⃣ 点击下方按钮打开Google授权页面</p>
                <p>2️⃣ 完成授权后，复制浏览器地址栏的完整URL</p>
                <p>3️⃣ 粘贴URL到下方输入框并提交</p>
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                <button type="button" onclick="openOAuthWindow()" class="btn btn-success" style="flex: 1;">🔐 打开授权页面</button>
                <button type="button" onclick="copyOAuthUrl()" class="btn btn-info" style="width: 44px; padding: 0; font-size: 18px;" title="复制授权链接">📋</button>
            </div>
            <input type="text" id="modalCallbackUrl" placeholder="粘贴完整的回调URL (http://localhost:xxxxx/oauth-callback?code=...)">
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                <button class="btn btn-success" onclick="processOAuthCallbackModal()">✅ 提交</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ===== 页面切换（侧边栏导航） =====
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const page = e.currentTarget.dataset.page;
        switchPage(page);
    });
});

// 移动端导航切换
const mobileNavToggle = document.getElementById('mobileNavToggle');
if (mobileNavToggle) {
    mobileNavToggle.addEventListener('click', () => {
        switchPage(document.getElementById('tokensPage').classList.contains('hidden') ? 'tokens' : 'settings');
    });
}

function switchPage(page) {
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // 切换页面
    if (page === 'tokens') {
        document.getElementById('tokensPage').classList.remove('hidden');
        document.getElementById('settingsPage').classList.add('hidden');
    } else if (page === 'settings') {
        document.getElementById('tokensPage').classList.add('hidden');
        document.getElementById('settingsPage').classList.remove('hidden');
        loadConfig();
    }
}

function getOAuthUrl() {
    if (!oauthPort) oauthPort = Math.floor(Math.random() * 10000) + 50000;
    const redirectUri = `http://localhost:${oauthPort}/oauth-callback`;
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
        `access_type=offline&client_id=${CLIENT_ID}&prompt=consent&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&` +
        `scope=${encodeURIComponent(SCOPES)}&state=${Date.now()}`;
}

function openOAuthWindow() {
    window.open(getOAuthUrl(), '_blank');
}

function copyOAuthUrl() {
    const url = getOAuthUrl();
    navigator.clipboard.writeText(url).then(() => {
        showToast('授权链接已复制到剪贴板', 'success');
    }).catch(() => {
        showToast('复制失败，请手动复制', 'error');
    });
}

async function processOAuthCallbackModal() {
    const modal = document.querySelector('.form-modal');
    const callbackUrl = document.getElementById('modalCallbackUrl').value.trim();
    if (!callbackUrl) {
        showToast('请输入回调URL', 'warning');
        return;
    }

    showLoading('正在处理授权...');

    try {
        const url = new URL(callbackUrl);
        const code = url.searchParams.get('code');
        const port = new URL(url.origin).port || (url.protocol === 'https:' ? 443 : 80);

        if (!code) {
            hideLoading();
            showToast('URL中未找到授权码，请检查URL是否完整', 'error');
            return;
        }

        const response = await authFetch('/admin/oauth/exchange', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ code, port })
        });

        const result = await response.json();
        if (result.success) {
            const account = result.data;
            const addResponse = await authFetch('/admin/tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(account)
            });

            const addResult = await addResponse.json();
            hideLoading();
            if (addResult.success) {
                modal.remove();
                showToast('Token添加成功！', 'success');
                loadTokens();
            } else {
                showToast('Token添加失败: ' + addResult.message, 'error');
            }
        } else {
            hideLoading();
            showToast('Token交换失败: ' + result.message, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('处理失败: ' + error.message, 'error');
    }
}

// ===== 退出登录 =====
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('logoutBtnMobile').addEventListener('click', logout);

function silentLogout() {
    localStorage.removeItem('authToken');
    authToken = null;
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

async function logout() {
    const confirmed = await showConfirm('确定要退出登录吗？', '退出确认');
    if (!confirmed) return;

    silentLogout();
    showToast('已退出登录', 'info');
}

// ===== Token管理 =====
document.getElementById('addTokenBtn').addEventListener('click', showAddTokenModal);
document.getElementById('refreshTokensBtn').addEventListener('click', loadTokens);

async function loadTokens() {
    const btn = document.getElementById('refreshTokensBtn');
    const icon = btn.querySelector('svg');
    btn.disabled = true;
    if (icon) icon.classList.add('animate-spin');

    try {
        const response = await authFetch('/admin/tokens', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();
        if (data.success) {
            renderTokens(data.data);
            showToast('Token列表已刷新', 'success');
        } else {
            showToast('加载失败: ' + (data.message || '未知错误'), 'error');
        }
    } catch (error) {
        showToast('加载Token失败: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        if (icon) icon.classList.remove('animate-spin');
    }
}

function renderTokens(tokens) {
    // 更新统计卡片
    document.getElementById('totalTokens').textContent = tokens.length;
    document.getElementById('enabledTokens').textContent = tokens.filter(t => t.enable).length;
    document.getElementById('disabledTokens').textContent = tokens.filter(t => !t.enable).length;

    // 渲染Token表格
    const tbody = document.getElementById('tokenTableBody');

    if (tokens.length === 0) {
        tbody.innerHTML = `
            <tr class="table-empty">
                <td colspan="4">
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>
                        <div class="empty-text">暂无 Token，点击上方「添加」按钮添加</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = tokens.map(token => `
        <tr>
            <td>
                <div style="font-weight: 500; color: var(--text-primary); margin-bottom: 4px;">${token.projectId || 'N/A'}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">${token.email || 'N/A'}</div>
            </td>
            <td>
                <div class="token-info">
                    <div>Access: ${token.access_token_suffix}</div>
                    <div>Refresh: ${token.refresh_token.substring(0, 8)}...</div>
                </div>
            </td>
            <td class="text-center">
                <span class="status-badge ${token.enable ? 'status-badge-enabled' : 'status-badge-disabled'}">
                    <span class="status-dot ${token.enable ? 'status-dot-enabled' : 'status-dot-disabled'}"></span>
                    ${token.enable ? '启用' : '禁用'}
                </span>
            </td>
            <td class="text-center">
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-sm" onclick="showQuotaModal('${token.refresh_token}', '${token.projectId || 'N/A'}')">额度</button>
                    <button class="btn ${token.enable ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="toggleToken('${token.refresh_token}', ${!token.enable})">
                        ${token.enable ? '禁用' : '启用'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteToken('${token.refresh_token}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function toggleToken(refreshToken, enable) {
    const action = enable ? '启用' : '禁用';
    const confirmed = await showConfirm(`确定要${action}这个Token吗？`, `${action}确认`);
    if (!confirmed) return;

    showLoading(`正在${action}Token...`);
    try {
        const response = await authFetch(`/admin/tokens/${encodeURIComponent(refreshToken)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ enable })
        });

        const data = await response.json();
        hideLoading();
        if (data.success) {
            showToast(`Token已${enable ? '启用' : '禁用'}`, 'success');
            loadTokens();
        } else {
            showToast(data.message || '操作失败', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('操作失败: ' + error.message, 'error');
    }
}

async function deleteToken(refreshToken) {
    const confirmed = await showConfirm('删除后无法恢复，确定要删除这个Token吗？', '⚠️ 删除确认');
    if (!confirmed) return;

    showLoading('正在删除Token...');
    try {
        const response = await authFetch(`/admin/tokens/${encodeURIComponent(refreshToken)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();
        hideLoading();
        if (data.success) {
            showToast('Token已删除', 'success');
            loadTokens();
        } else {
            showToast(data.message || '删除失败', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('删除失败: ' + error.message, 'error');
    }
}

// ===== 添加Token Modal =====
function showAddTokenModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <div class="modal-title">添加 Token 凭证</div>
                <button class="modal-close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="modal-tabs">
                    <button class="modal-tab active" data-tab="oauth">OAuth 自动获取</button>
                    <button class="modal-tab" data-tab="manual">手动填入</button>
                </div>

                <!-- OAuth Tab -->
                <div id="oauthTab" class="modal-tab-content">
                    <div class="info-box">
                        <p>1. 点击下方按钮打开 Google 授权页面。</p>
                        <p>2. 授权完成后，复制浏览器地址栏的完整 URL。</p>
                        <p>3. 将 URL 粘贴到下方输入框。</p>
                    </div>
                    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                        <button class="btn btn-secondary" style="flex: 1;" onclick="openOAuthWindow()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>
                            </svg>
                            <span>打开授权页面</span>
                        </button>
                        <button class="btn btn-secondary" style="width: 36px; height: 36px; padding: 0; flex-shrink: 0;" onclick="copyOAuthUrl()" title="复制授权链接">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                        </button>
                    </div>
                    <div class="form-group">
                        <label>回调 URL</label>
                        <input type="text" id="oauthCallbackUrl" placeholder="http://localhost:xxxxx/oauth-callback?code=...">
                    </div>
                    <button class="btn btn-primary" style="width: 100%;" onclick="processOAuthCallback()">解析并添加</button>
                </div>

                <!-- Manual Tab -->
                <div id="manualTab" class="modal-tab-content hidden">
                    <div class="form-group">
                        <label>Access Token</label>
                        <input type="text" id="manualAccessToken" placeholder="必填">
                    </div>
                    <div class="form-group">
                        <label>Refresh Token</label>
                        <input type="text" id="manualRefreshToken" placeholder="必填">
                    </div>
                    <div class="form-group">
                        <label>过期时间 (秒)</label>
                        <input type="number" id="manualExpiresIn" value="3599">
                        <p class="form-help">默认 3599 秒（约1小时）</p>
                    </div>
                    <button class="btn btn-primary" style="width: 100%;" onclick="addTokenManually()">保存凭证</button>
                </div>
            </div>
        </div>
    `;

    // Tab切换
    overlay.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            overlay.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabName = tab.dataset.tab;
            overlay.querySelectorAll('.modal-tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            overlay.querySelector('#' + tabName + 'Tab').classList.remove('hidden');
        });
    });

    // 关闭
    overlay.querySelector('.modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    document.body.appendChild(overlay);
}

async function processOAuthCallback() {
    const callbackUrl = document.getElementById('oauthCallbackUrl').value.trim();
    if (!callbackUrl) {
        showToast('请输入回调URL', 'warning');
        return;
    }

    showLoading('正在处理授权...');

    try {
        const url = new URL(callbackUrl);
        const code = url.searchParams.get('code');
        const port = new URL(url.origin).port || (url.protocol === 'https:' ? 443 : 80);

        if (!code) {
            hideLoading();
            showToast('URL中未找到授权码，请检查URL是否完整', 'error');
            return;
        }

        const response = await authFetch('/admin/oauth/exchange', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ code, port })
        });

        const result = await response.json();
        if (result.success) {
            const account = result.data;
            const addResponse = await authFetch('/admin/tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(account)
            });

            const addResult = await addResponse.json();
            hideLoading();
            if (addResult.success) {
                document.querySelector('.modal-overlay').remove();
                showToast('Token添加成功！', 'success');
                loadTokens();
            } else {
                showToast('Token添加失败: ' + addResult.message, 'error');
            }
        } else {
            hideLoading();
            showToast('Token交换失败: ' + result.message, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('处理失败: ' + error.message, 'error');
    }
}

async function addTokenManually() {
    const accessToken = document.getElementById('manualAccessToken').value.trim();
    const refreshToken = document.getElementById('manualRefreshToken').value.trim();
    const expiresIn = parseInt(document.getElementById('manualExpiresIn').value);

    if (!accessToken || !refreshToken) {
        showToast('请填写完整的Token信息', 'warning');
        return;
    }

    showLoading('正在添加Token...');
    try {
        const response = await fetch('/admin/tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn })
        });

        const data = await response.json();
        hideLoading();
        if (data.success) {
            document.querySelector('.modal-overlay').remove();
            showToast('Token添加成功！', 'success');
            loadTokens();
        } else {
            showToast(data.message || '添加失败', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('添加失败: ' + error.message, 'error');
    }
}

// ===== 额度查看 Modal =====
async function showQuotaModal(refreshToken, projectId = 'N/A') {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-container quota-modal">
            <div class="modal-header">
                <div class="modal-title">额度详情</div>
                <button class="modal-close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                <div class="quota-meta-row">
                    <span class="quota-project-id-badge">Project ID: ${projectId}</span>
                    <button class="quota-refresh-btn" id="refreshQuotaBtn" title="立即刷新额度">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
                        </svg>
                    </button>
                </div>
                <div id="quotaContent">
                    <!-- 静默加载：初始为空白 -->
                </div>
            </div>
        </div>
    `;

    overlay.querySelector('.modal-close').onclick = () => overlay.remove();
    overlay.querySelector('#refreshQuotaBtn').onclick = () => loadQuotaData(refreshToken, true);
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    document.body.appendChild(overlay);
    await loadQuotaData(refreshToken);
}

async function loadQuotaData(refreshToken, forceRefresh = false) {
    const quotaContent = document.getElementById('quotaContent');
    if (!quotaContent) return;

    const refreshBtn = document.getElementById('refreshQuotaBtn');
    const refreshIcon = refreshBtn ? refreshBtn.querySelector('svg') : null;

    if (refreshBtn) {
        refreshBtn.disabled = true;
        if (refreshIcon) refreshIcon.classList.add('animate-spin');
    }

    // 静默加载：不显示"加载中..."，只有刷新按钮转圈

    try {
        const url = `/admin/tokens/${encodeURIComponent(refreshToken)}/quotas${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            const quotaData = data.data;
            const models = quotaData.models;

            if (Object.keys(models).length === 0) {
                quotaContent.innerHTML = '<div class="quota-empty">暂无额度信息</div>';
                return;
            }

            // 按模型类型分组
            const grouped = { claude: [], gemini: [], other: [] };
            Object.entries(models).forEach(([modelId, quota]) => {
                const item = { modelId, quota };
                if (modelId.toLowerCase().includes('claude')) grouped.claude.push(item);
                else if (modelId.toLowerCase().includes('gemini')) grouped.gemini.push(item);
                else grouped.other.push(item);
            });

            // 对每个分组按模型名称排序，保持顺序稳定
            grouped.claude.sort((a, b) => a.modelId.localeCompare(b.modelId));
            grouped.gemini.sort((a, b) => a.modelId.localeCompare(b.modelId));
            grouped.other.sort((a, b) => a.modelId.localeCompare(b.modelId));

            let html = '';

            // 渲染各组
            if (grouped.claude.length > 0) {
                html += '<div class="quota-group-title">🤖 Claude 模型</div>';
                grouped.claude.forEach(({ modelId, quota }) => {
                    const percentage = (quota.remaining * 100).toFixed(1);
                    const barClass = percentage > 50 ? 'progress-bar-fill' : percentage > 20 ? 'progress-bar-warning' : 'progress-bar-danger';
                    html += `
                        <div class="quota-item">
                            <div class="quota-row-1">
                                <div class="quota-model-name">${modelId}</div>
                                <div class="quota-reset-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    <span class="font-mono">${quota.resetTime}</span>
                                </div>
                            </div>
                            <div class="quota-row-2">
                                <div class="quota-bar-container">
                                    <div class="quota-bar ${barClass}" style="width: ${percentage}%;"></div>
                                </div>
                            </div>
                            <div class="quota-row-3">
                                <span class="quota-remaining-label">剩余</span>
                                <span class="quota-percentage-value">${percentage}%</span>
                            </div>
                        </div>
                    `;
                });
            }

            if (grouped.gemini.length > 0) {
                html += '<div class="quota-group-title">💎 Gemini 模型</div>';
                grouped.gemini.forEach(({ modelId, quota }) => {
                    const percentage = (quota.remaining * 100).toFixed(1);
                    const barClass = percentage > 50 ? 'progress-bar-fill' : percentage > 20 ? 'progress-bar-warning' : 'progress-bar-danger';
                    html += `
                        <div class="quota-item">
                            <div class="quota-row-1">
                                <div class="quota-model-name">${modelId}</div>
                                <div class="quota-reset-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    <span class="font-mono">${quota.resetTime}</span>
                                </div>
                            </div>
                            <div class="quota-row-2">
                                <div class="quota-bar-container">
                                    <div class="quota-bar ${barClass}" style="width: ${percentage}%;"></div>
                                </div>
                            </div>
                            <div class="quota-row-3">
                                <span class="quota-remaining-label">剩余</span>
                                <span class="quota-percentage-value">${percentage}%</span>
                            </div>
                        </div>
                    `;
                });
            }

            if (grouped.other.length > 0) {
                html += '<div class="quota-group-title">🔧 其他模型</div>';
                grouped.other.forEach(({ modelId, quota }) => {
                    const percentage = (quota.remaining * 100).toFixed(1);
                    const barClass = percentage > 50 ? 'progress-bar-fill' : percentage > 20 ? 'progress-bar-warning' : 'progress-bar-danger';
                    html += `
                        <div class="quota-item">
                            <div class="quota-row-1">
                                <div class="quota-model-name">${modelId}</div>
                                <div class="quota-reset-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    <span class="font-mono">${quota.resetTime}</span>
                                </div>
                            </div>
                            <div class="quota-row-2">
                                <div class="quota-bar-container">
                                    <div class="quota-bar ${barClass}" style="width: ${percentage}%;"></div>
                                </div>
                            </div>
                            <div class="quota-row-3">
                                <span class="quota-remaining-label">剩余</span>
                                <span class="quota-percentage-value">${percentage}%</span>
                            </div>
                        </div>
                    `;
                });
            }

            quotaContent.innerHTML = html;
        } else {
            quotaContent.innerHTML = `<div class="quota-error">加载失败: ${data.message}</div>`;
        }
    } catch (error) {
        if (quotaContent) {
            quotaContent.innerHTML = `<div class="quota-error">加载失败: ${error.message}</div>`;
        }
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            if (refreshIcon) refreshIcon.classList.remove('animate-spin');
        }
    }
}

// ===== 配置管理 =====
async function loadConfig() {
    try {
        const response = await authFetch('/admin/config', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (data.success) {
            const form = document.getElementById('configForm');
            const { env, json } = data.data;

            // 加载 .env 配置
            Object.entries(env).forEach(([key, value]) => {
                const input = form.elements[key];
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = value === 'true' || value === true;
                    } else {
                        input.value = value || '';
                    }
                }
            });

            // 加载 config.json 配置
            if (json.server) {
                if (form.elements['PORT']) form.elements['PORT'].value = json.server.port || '';
                if (form.elements['HOST']) form.elements['HOST'].value = json.server.host || '';
                if (form.elements['MAX_REQUEST_SIZE']) form.elements['MAX_REQUEST_SIZE'].value = json.server.maxRequestSize || '';
            }
            if (json.defaults) {
                if (form.elements['DEFAULT_TEMPERATURE']) form.elements['DEFAULT_TEMPERATURE'].value = json.defaults.temperature ?? '';
                if (form.elements['DEFAULT_TOP_P']) form.elements['DEFAULT_TOP_P'].value = json.defaults.topP ?? '';
                if (form.elements['DEFAULT_TOP_K']) form.elements['DEFAULT_TOP_K'].value = json.defaults.topK ?? '';
                if (form.elements['DEFAULT_MAX_TOKENS']) form.elements['DEFAULT_MAX_TOKENS'].value = json.defaults.maxTokens ?? '';
            }
            if (json.other) {
                if (form.elements['TIMEOUT']) form.elements['TIMEOUT'].value = json.other.timeout ?? '';
                const skipInput = form.elements['SKIP_PROJECT_ID_FETCH'];
                if (skipInput) {
                    skipInput.checked = json.other.skipProjectIdFetch === true;
                }
            }
        }
    } catch (error) {
        showToast('加载配置失败: ' + error.message, 'error');
    }
}

document.getElementById('configForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const allConfig = {};

    // 处理所有表单字段
    for (const [key, value] of formData.entries()) {
        allConfig[key] = value;
    }

    // 处理checkbox（未选中的checkbox不会出现在FormData中）
    const checkboxes = e.target.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        allConfig[checkbox.name] = checkbox.checked ? 'true' : 'false';
    });

    // 分离敏感和非敏感配置
    const sensitiveKeys = ['API_KEY', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'JWT_SECRET', 'PROXY', 'SYSTEM_INSTRUCTION', 'IMAGE_BASE_URL'];
    const envConfig = {};
    const jsonConfig = {
        server: {},
        api: {},
        defaults: {},
        other: {}
    };

    Object.entries(allConfig).forEach(([key, value]) => {
        if (sensitiveKeys.includes(key)) {
            envConfig[key] = value;
        } else {
            // 映射到 config.json 结构
            if (key === 'PORT') jsonConfig.server.port = parseInt(value);
            else if (key === 'HOST') jsonConfig.server.host = value;
            else if (key === 'MAX_REQUEST_SIZE') jsonConfig.server.maxRequestSize = value;
            else if (key === 'DEFAULT_TEMPERATURE') jsonConfig.defaults.temperature = parseFloat(value);
            else if (key === 'DEFAULT_TOP_P') jsonConfig.defaults.topP = parseFloat(value);
            else if (key === 'DEFAULT_TOP_K') jsonConfig.defaults.topK = parseInt(value);
            else if (key === 'DEFAULT_MAX_TOKENS') jsonConfig.defaults.maxTokens = parseInt(value);
            else if (key === 'TIMEOUT') jsonConfig.other.timeout = parseInt(value);
            else if (key === 'SKIP_PROJECT_ID_FETCH') jsonConfig.other.skipProjectIdFetch = value === 'true';
            else envConfig[key] = value;
        }
    });

    showLoading('正在保存配置...');
    try {
        const response = await authFetch('/admin/config', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ env: envConfig, json: jsonConfig })
        });

        const data = await response.json();
        hideLoading();
        if (data.success) {
            showToast(data.message, 'success');
        } else {
            showToast(data.message || '保存失败', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('保存失败: ' + error.message, 'error');
    }
});
