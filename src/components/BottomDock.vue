<template>
  <view class="dock-wrap" :class="{ 'dock-wrap--inline': props.inline }">
    <view class="dock panel">
      <button
        v-for="item in items"
        :key="item.key"
        class="dock__item"
        :class="{ 'dock__item--active': current === item.key }"
        hover-class="dock__item--hover"
        @tap="navigate(item)"
      >
        <text class="dock__icon">{{ item.icon }}</text>
        <text class="dock__label">{{ item.label }}</text>
      </button>
    </view>
  </view>
</template>

<script setup>
import { reLaunchPage } from '@/utils/navigation';

const props = defineProps({
  current: {
    type: String,
    default: 'sessions'
  },
  inline: {
    type: Boolean,
    default: false
  }
});

const items = [
  { key: 'sessions', label: '会话', icon: '聊', url: '/pages/sessions/index' },
  { key: 'profile', label: '我的', icon: '我', url: '/pages/profile/index' }
];

function navigate(item) {
  if (props.current === item.key) {
    return;
  }
  reLaunchPage(item.url);
}
</script>

<style scoped lang="scss">
.dock-wrap {
  position: fixed;
  left: 50%;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  width: calc(100% - 60rpx);
  max-width: calc(var(--screen-max-width, 860px) - 60rpx);
  transform: translateX(-50%);
  z-index: 20;
}

.dock-wrap--inline {
  position: relative;
  left: auto;
  bottom: auto;
  width: 100%;
  max-width: none;
  margin: 0 0 28rpx;
  transform: none;
}

.dock {
  display: flex;
  gap: 16rpx;
  padding: 16rpx;
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.dock__item {
  flex: 1;
  height: 102rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  color: var(--ink-soft);
  transition: transform 180ms ease, color 220ms ease, background 220ms ease, box-shadow 220ms ease;
}

.dock__item--hover {
  transform: scale(0.98);
}

.dock__item--active {
  background: linear-gradient(135deg, rgba(166, 222, 200, 0.9), rgba(241, 201, 143, 0.82));
  color: var(--ink);
  box-shadow: 0 18rpx 36rpx rgba(104, 68, 40, 0.14);
}

.dock__icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.56);
  font-size: 24rpx;
  font-weight: 700;
  transition: transform 220ms ease, background 220ms ease;
}

.dock__label {
  font-size: 26rpx;
  font-weight: 600;
  transition: transform 220ms ease, letter-spacing 220ms ease;
}

.dock__item--active .dock__icon {
  transform: translate3d(0, -2rpx, 0) scale(1.04);
  background: rgba(255, 255, 255, 0.72);
}

.dock__item--active .dock__label {
  transform: translate3d(0, -1rpx, 0);
  letter-spacing: 1rpx;
}
</style>
