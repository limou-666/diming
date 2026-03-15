<template>
  <view class="header">
    <view class="header__inner">
      <button v-if="showBack" class="header__icon" hover-class="header__icon--active" @tap="handleBack">
        <text>‹</text>
      </button>
      <view v-else class="header__spacer" />

      <view class="header__title" :class="{ 'header__title--clickable': titleClickable }" @tap="handleTitleClick">
        <text class="header__main">{{ title }}</text>
        <text v-if="subtitle" class="header__sub">{{ subtitle }}</text>
      </view>

      <button
        v-if="rightLabel"
        class="header__action"
        hover-class="header__action--active"
        @tap="$emit('action')"
      >
        <text class="header__action-text">{{ rightLabel }}</text>
      </button>
      <view v-else class="header__spacer" />
    </view>
  </view>
</template>

<script setup>
import { navigateBackPage, reLaunchPage } from '@/utils/navigation';

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  showBack: {
    type: Boolean,
    default: true
  },
  rightLabel: {
    type: String,
    default: ''
  },
  titleClickable: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['back', 'action', 'titleclick']);

function handleBack() {
  emit('back');
  const pages = getCurrentPages();
  if (pages.length > 1) {
    navigateBackPage({
      fail: () => {
        reLaunchPage('/pages/sessions/index');
      }
    });
    return;
  }

  if (pages[0]?.route !== 'pages/sessions/index') {
    reLaunchPage('/pages/sessions/index');
  }
}

function handleTitleClick() {
  if (props.titleClickable) {
    emit('titleclick');
  }
}
</script>

<style scoped lang="scss">
.header {
  padding-top: calc(var(--status-bar-height, 0px) + 14rpx);
  margin-bottom: 24rpx;
}

.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.header__icon,
.header__action,
.header__spacer {
  height: 84rpx;
  flex-shrink: 0;
}

.header__icon,
.header__spacer {
  width: 96rpx;
}

.header__icon,
.header__action {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.76);
  color: var(--ink);
  box-shadow: var(--shadow-soft);
  transition: transform 180ms ease, background 220ms ease, box-shadow 220ms ease;
}

.header__icon {
  font-size: 34rpx;
}

.header__action {
  min-width: 96rpx;
  padding: 0 20rpx;
}

.header__action-text {
  display: block;
  white-space: nowrap;
  font-size: 26rpx;
  line-height: 1.2;
}

.header__icon--active,
.header__action--active {
  transform: scale(0.96);
}

.header__title {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  transition: transform 220ms ease, opacity 180ms ease;
}

.header__title--clickable {
  cursor: pointer;
}

.header__title--clickable:active {
  transform: translate3d(0, 2rpx, 0);
}

.header__main {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--ink);
}

.header__sub {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--ink-soft);
}
</style>
