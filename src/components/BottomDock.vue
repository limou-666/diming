<template>
  <view class="dock-wrap">
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
const props = defineProps({
  current: {
    type: String,
    default: 'sessions'
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
  uni.reLaunch({
    url: item.url
  });
}
</script>

<style scoped lang="scss">
.dock-wrap {
  position: fixed;
  left: 30rpx;
  right: 30rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  z-index: 20;
}

.dock {
  display: flex;
  gap: 16rpx;
  padding: 16rpx;
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
}

.dock__label {
  font-size: 26rpx;
  font-weight: 600;
}
</style>