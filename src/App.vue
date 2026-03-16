<script setup>
import { onBeforeUnmount, onMounted } from 'vue';

let cleanupViewportHeightSync = null;

/**
 * 在 H5 端同步当前可视高度到全局 CSS 变量，规避地址栏伸缩带来的视口跳动。
 */
function syncViewportHeight() {
  // #ifdef H5
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement?.style.setProperty('--app-height', `${viewportHeight}px`);
  // #endif
}

onMounted(() => {
  // #ifdef H5
  const handleResize = () => {
    syncViewportHeight();
  };

  syncViewportHeight();
  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('orientationchange', handleResize, { passive: true });
  window.visualViewport?.addEventListener('resize', handleResize, { passive: true });

  cleanupViewportHeightSync = () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
    window.visualViewport?.removeEventListener('resize', handleResize);
  };
  // #endif
});

onBeforeUnmount(() => {
  cleanupViewportHeightSync?.();
});
</script>

<style lang="scss">
html,
page,
body,
#app {
  min-height: 100%;
}

html,
body,
#app {
  height: 100%;
}

html {
  --app-height: 100vh;
  --screen-max-width: 860px;
}

page {
  --ink: #5b3417;
  --ink-soft: #8a6c57;
  --cream: #f8f2e8;
  --cream-strong: #f2e7d5;
  --mint: #a6dec8;
  --mint-deep: #79c5ad;
  --sand: #f1c98f;
  --sand-deep: #dc9356;
  --pearl: rgba(255, 255, 255, 0.72);
  --line: rgba(104, 67, 39, 0.08);
  --shadow-soft: 0 18rpx 48rpx rgba(96, 68, 45, 0.12);
  --shadow-lift: 0 28rpx 82rpx rgba(96, 68, 45, 0.16);
  --radius-card: 34rpx;
  --radius-pill: 999rpx;
  --page-padding: 30rpx;
  background:
    radial-gradient(circle at top right, rgba(241, 201, 143, 0.28), transparent 34%),
    radial-gradient(circle at left bottom, rgba(128, 208, 188, 0.26), transparent 28%),
    linear-gradient(180deg, #faf5ec 0%, #f6efe5 46%, #edf7f1 100%);
  color: var(--ink);
  font-family: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

view,
text,
button,
input,
textarea,
scroll-view,
image {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  background: transparent;
  line-height: 1;
}

button::after {
  border: 0;
}

.screen {
  min-height: var(--app-height, 100vh);
  width: 100%;
  max-width: var(--screen-max-width);
  margin: 0 auto;
  padding: 0 var(--page-padding) calc(36rpx + env(safe-area-inset-bottom));
}

.panel {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.76), rgba(255, 248, 241, 0.58));
  border: 1rpx solid rgba(255, 255, 255, 0.72);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(18rpx);
}

.page-reveal {
  opacity: 0;
  transform: translate3d(0, 20rpx, 0);
  transition:
    opacity 220ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;
}

.page-reveal--workspace-return {
  opacity: 0.74;
  transform: translate3d(0, 10rpx, 0) scale(0.992);
  filter: blur(8rpx) saturate(0.94);
  transition:
    opacity 260ms ease,
    transform 420ms cubic-bezier(0.2, 0.9, 0.2, 1),
    filter 360ms ease;
  will-change: opacity, transform, filter;
}

.page-reveal--entered {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.page-reveal--workspace-return.page-reveal--entered {
  transform: translate3d(0, 0, 0) scale(1);
  filter: blur(0) saturate(1);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22rpx;
}

.section-title__main {
  font-size: 34rpx;
  font-weight: 700;
}

.section-title__sub {
  font-size: 22rpx;
  color: var(--ink-soft);
}

.muted {
  color: var(--ink-soft);
}

.hairline {
  height: 1rpx;
  background: var(--line);
}

@supports (height: 100dvh) {
  html {
    --app-height: 100dvh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-reveal {
    opacity: 1;
    transform: none;
    transition: none;
    will-change: auto;
  }

  .page-reveal--workspace-return {
    filter: none;
  }
}
</style>
