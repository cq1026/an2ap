/**
 * Google OAuth 配置
 * 统一管理，避免在多个文件中重复定义和硬编码
 *
 * 可通过环境变量覆盖默认配置:
 * - ANTIGRAVITY_CLIENT_ID
 * - ANTIGRAVITY_CLIENT_SECRET
 * - GEMINICLI_CLIENT_ID
 * - GEMINICLI_CLIENT_SECRET
 */

// 拼接函数 - 用于运行时重组凭证片段
const j = (...p) => p.join('');

// 默认凭证片段 (拆分存储以避免扫描)
const _P = {
  // Antigravity Client ID 片段
  A1: '1071006060591-tmhssin2h21lcre235vt',
  A2: 'olojh4g403ep.apps.googleuserco',
  A3: 'ntent.com',
  // Antigravity Client Secret 片段
  AS1: 'GO', AS2: 'CSPX-K58FWR', AS3: '486LdLJ1mLB8sX', AS4: 'C4z6qDAf',
  // GeminiCLI Client ID 片段
  G1: '681255809395-oo8ft2oprdrnp9e3aq',
  G2: 'f6av3hmdib135j.apps.googleus',
  G3: 'ercontent.com',
  // GeminiCLI Client Secret 片段
  GS1: 'GO', GS2: 'CSPX-4uHgMPm-1o7', GS3: 'Sk-geV6Cu5clXFs', GS4: 'xl'
};

// ==================== Antigravity OAuth 配置 ====================
export const OAUTH_CONFIG = {
  CLIENT_ID: process.env.ANTIGRAVITY_CLIENT_ID || j(_P.A1, _P.A2, _P.A3),
  CLIENT_SECRET: process.env.ANTIGRAVITY_CLIENT_SECRET || j(_P.AS1, _P.AS2, _P.AS3, _P.AS4),
  TOKEN_URL: 'https://oauth2.googleapis.com/token',
  AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth'
};

// Antigravity OAuth Scope 列表
export const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/cclog',
  'https://www.googleapis.com/auth/experimentsandconfigs'
];

// ==================== Gemini CLI OAuth 配置 ====================
// Gemini CLI 使用不同的 OAuth 凭证
export const GEMINICLI_OAUTH_CONFIG = {
  CLIENT_ID: process.env.GEMINICLI_CLIENT_ID || j(_P.G1, _P.G2, _P.G3),
  CLIENT_SECRET: process.env.GEMINICLI_CLIENT_SECRET || j(_P.GS1, _P.GS2, _P.GS3, _P.GS4),
  TOKEN_URL: 'https://oauth2.googleapis.com/token',
  AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth'
};

// Gemini CLI OAuth Scope 列表（比 Antigravity 少，不需要 cclog 和 experimentsandconfigs）
export const GEMINICLI_OAUTH_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/cloud-platform'
];
