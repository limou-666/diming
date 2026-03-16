import { nextTick, ref } from 'vue';
import { onHide, onShow, onUnload } from '@dcloudio/uni-app';

/**
 * 兼容历史调用：既支持传数字延时，也支持传带模式解析器的配置对象。
 *
 * @param {number | { delay?: number, resolveMode?: (() => string | null) | null }} input 原始配置。
 * @returns {{ delay: number, resolveMode: (() => string | null) | null }} 归一化后的页面显隐配置。
 */
function normalizeOptions(input) {
  if (typeof input === 'number') {
    return {
      delay: input,
      resolveMode: null
    };
  }

  return {
    delay: 24,
    resolveMode: null,
    ...(input || {})
  };
}

/**
 * 提供页面首屏入场动画状态与重放能力。
 *
 * @param {number | { delay?: number, resolveMode?: (() => string | null) | null }} [input=24] 显示延时或配置对象。
 * @returns {{
 *   pageRevealed: import('vue').Ref<boolean>,
 *   revealMode: import('vue').Ref<string>,
 *   revealPage: (mode?: string) => Promise<void>
 * }} 页面进入态及重放方法。
 */
export function usePageReveal(input = 24) {
  const { delay, resolveMode } = normalizeOptions(input);
  const pageRevealed = ref(false);
  const revealMode = ref('default');
  let revealTimer = null;

  /**
   * 清理待执行的入场定时器，避免重复切换状态。
   *
   * @returns {void}
   */
  function clearRevealTimer() {
    if (revealTimer) {
      clearTimeout(revealTimer);
      revealTimer = null;
    }
  }

  /**
   * 重置进入态后再延迟切入，确保页面重复展示时动画仍可重放。
   *
   * @param {string} [mode='default'] 当前页面进入使用的过渡模式。
   * @returns {Promise<void>}
   */
  async function revealPage(mode = 'default') {
    clearRevealTimer();
    revealMode.value = mode || 'default';
    pageRevealed.value = false;
    await nextTick();
    revealTimer = setTimeout(() => {
      pageRevealed.value = true;
      revealTimer = null;
    }, delay);
  }

  onShow(() => {
    revealPage(resolveMode?.() || 'default');
  });

  onHide(() => {
    clearRevealTimer();
    pageRevealed.value = false;
    revealMode.value = 'default';
  });

  onUnload(() => {
    clearRevealTimer();
  });

  return {
    pageRevealed,
    revealMode,
    revealPage
  };
}
