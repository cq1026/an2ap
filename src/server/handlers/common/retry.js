/**
 * 重试次数规范化工具
 */

/**
 * @param {any} retryTimes
 * @returns {number}
 */
export function getSafeRetries(retryTimes) {
  const maxRetries = Number(retryTimes || 0);
  return maxRetries > 0 ? Math.floor(maxRetries) : 0;
}
