<template>
  <view class="entry panel" hover-class="entry--active" @tap="$emit('select', entry)">
    <view class="entry__icon">{{ entry.icon }}</view>
    <view class="entry__body">
      <view class="entry__top">
        <text class="entry__label">{{ entry.label }}</text>
        <text v-if="entry.count" class="entry__count">{{ entry.count }}</text>
      </view>
      <text class="entry__description">{{ entry.description }}</text>
    </view>
    <text class="entry__arrow">›</text>
  </view>
</template>

<script setup>
defineProps({
  entry: {
    type: Object,
    required: true
  }
});

defineEmits(['select']);
</script>

<style scoped lang="scss">
.entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
}

.entry--active {
  transform: scale(0.99);
}

.entry__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(166, 222, 200, 0.72), rgba(241, 201, 143, 0.72));
  color: var(--ink);
  font-size: 26rpx;
  font-weight: 700;
}

.entry__body {
  flex: 1;
  min-width: 0;
}

.entry__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.entry__label {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
}

.entry__count {
  flex-shrink: 0;
  font-size: 22rpx;
  color: var(--ink-soft);
}

.entry__description {
  margin-top: 10rpx;
  display: block;
  font-size: 22rpx;
  color: var(--ink-soft);
}

.entry__arrow {
  color: var(--ink-soft);
  font-size: 34rpx;
}
</style>