import { onMounted, onUnmounted, readonly, ref } from 'vue';

const DEFAULT_WIDTH = 375;
const viewportWidth = ref(getViewportWidth());

let activeConsumers = 0;
let removeListeners = null;
let rafId = 0;

/**
 * 获取当前视口宽度。
 *
 * @returns {number} 当前窗口宽度，异常时回退到默认值。
 */
function getViewportWidth() {
  try {
    return uni.getSystemInfoSync().windowWidth || DEFAULT_WIDTH;
  } catch (error) {
    return DEFAULT_WIDTH;
  }
}

/**
 * 把最新视口宽度同步到共享响应式状态中。
 *
 * @returns {void}
 */
function syncViewportWidth() {
  viewportWidth.value = getViewportWidth();
}

/**
 * 按需绑定全局宽度监听，避免每个头像实例各自注册 resize。
 */
function bindViewportWidthListener() {
  if (removeListeners || typeof window === 'undefined') {
    return;
  }

  const handleResize = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      syncViewportWidth();
    });
  };

  syncViewportWidth();
  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('orientationchange', handleResize, { passive: true });
  window.visualViewport?.addEventListener('resize', handleResize, { passive: true });

  removeListeners = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
    window.visualViewport?.removeEventListener('resize', handleResize);
    removeListeners = null;
  };
}

/**
 * 提供只读的共享视口宽度状态，供多个组件复用。
 *
 * @returns {import('vue').DeepReadonly<import('vue').Ref<number>>} 共享的宽度响应式状态。
 */
export function useViewportWidth() {
  onMounted(() => {
    activeConsumers += 1;
    bindViewportWidthListener();
    syncViewportWidth();
  });

  onUnmounted(() => {
    activeConsumers = Math.max(0, activeConsumers - 1);
    if (!activeConsumers) {
      removeListeners?.();
    }
  });

  return readonly(viewportWidth);
}
