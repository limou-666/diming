/**
 * 统一收口页面切换动效，避免每个页面重复维护方向和时长。
 */
const ENTER_ANIMATION = {
  animationType: 'slide-in-right',
  animationDuration: 220
};

const BACK_ANIMATION = {
  animationType: 'slide-out-right',
  animationDuration: 220
};

const RELAUNCH_ANIMATION = {
  animationType: 'fade-in',
  animationDuration: 180
};

/**
 * 使用统一的入场动效跳转到目标页面。
 *
 * @param {string} url 目标页面地址。
 * @param {Record<string, any>} [options={}] 额外透传给 `uni.navigateTo` 的配置。
 * @returns {Promise<any>} `uni.navigateTo` 返回的结果。
 */
export function navigateToPage(url, options = {}) {
  return uni.navigateTo({
    url,
    ...ENTER_ANIMATION,
    ...options
  });
}

/**
 * 使用统一的回退动效返回上一页。
 *
 * @param {Record<string, any>} [options={}] 额外透传给 `uni.navigateBack` 的配置。
 * @returns {Promise<any>} `uni.navigateBack` 返回的结果。
 */
export function navigateBackPage(options = {}) {
  return uni.navigateBack({
    ...BACK_ANIMATION,
    ...options
  });
}

/**
 * 使用统一的重启动效重置当前页面栈。
 *
 * @param {string} url 目标页面地址。
 * @param {Record<string, any>} [options={}] 额外透传给 `uni.reLaunch` 的配置。
 * @returns {Promise<any>} `uni.reLaunch` 返回的结果。
 */
export function reLaunchPage(url, options = {}) {
  return uni.reLaunch({
    url,
    ...RELAUNCH_ANIMATION,
    ...options
  });
}
