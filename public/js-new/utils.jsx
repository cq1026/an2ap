// ==================== 辅助函数 ====================
// 格式化时间为 MM-DD HH:mm
const formatTime = (timestamp) => {
    const d = new Date(timestamp);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
};

// ==================== API 辅助函数 ====================
// 使用 HttpOnly Cookie 认证（更安全）
const authFetch = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        credentials: 'include'  // 发送Cookie
    });

    if (response.status === 401) {
        // 清除旧版本可能残留的localStorage token
        localStorage.removeItem('authToken');
        window.location.reload();
        throw new Error('Unauthorized');
    }

    return response;
};

// 暴露到全局对象
Object.assign(globalThis, { formatTime, authFetch });
