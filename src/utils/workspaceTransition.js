const WORKSPACE_TRANSITION_KEY = '__workspace_transition__';
const DEFAULT_MAX_AGE = 1200;

/**
 * 记录一次性的页面切换上下文，供目标页选择合适的回场动画。
 *
 * @param {Record<string, any>} [payload={}] 需要写入缓存的切换上下文。
 * @returns {void}
 */
export function markWorkspaceTransition(payload = {}) {
  try {
    uni.setStorageSync(WORKSPACE_TRANSITION_KEY, {
      ...payload,
      timestamp: Date.now()
    });
  } catch (error) {
    console.warn('workspace transition cache failed', error);
  }
}

/**
 * 读取并消费最近一次切换上下文，避免旧状态污染后续导航。
 *
 * @param {{ from?: string, to?: string, variant?: string, maxAge?: number }} [options={}] 读取时的过滤条件。
 * @returns {Record<string, any> | null} 命中的切换上下文；未命中时返回 `null`。
 */
export function consumeWorkspaceTransition(options = {}) {
  const {
    from,
    to,
    variant,
    maxAge = DEFAULT_MAX_AGE
  } = options;

  try {
    const payload = uni.getStorageSync(WORKSPACE_TRANSITION_KEY);
    uni.removeStorageSync(WORKSPACE_TRANSITION_KEY);

    if (!payload?.timestamp) {
      return null;
    }

    if (Date.now() - payload.timestamp > maxAge) {
      return null;
    }

    if (from && payload.from !== from) {
      return null;
    }

    if (to && payload.to !== to) {
      return null;
    }

    if (variant && payload.variant !== variant) {
      return null;
    }

    return payload;
  } catch (error) {
    console.warn('workspace transition consume failed', error);
    return null;
  }
}
