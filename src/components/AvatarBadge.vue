<template>
  <view class="avatar" :style="avatarStyle">
    <text class="avatar__text" :style="{ color: accent }">{{ initials }}</text>
    <view v-if="online" class="avatar__status" />
  </view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: {
    type: String,
    default: ''
  },
  palette: {
    type: Array,
    default: () => ['#a6dec8', '#f1c98f']
  },
  size: {
    type: [Number, String],
    default: 84
  },
  accent: {
    type: String,
    default: '#5b3417'
  },
  online: {
    type: Boolean,
    default: false
  }
});

const initials = computed(() => (props.name || 'AI').slice(0, 2).toUpperCase());
const sizeValue = computed(() => (typeof props.size === 'number' ? `${props.size}rpx` : props.size));
const avatarStyle = computed(() => ({
  width: sizeValue.value,
  height: sizeValue.value,
  background: `linear-gradient(135deg, ${props.palette[0] || '#a6dec8'} 0%, ${props.palette[1] || '#f1c98f'} 100%)`
}));
</script>

<style scoped lang="scss">
.avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 16rpx 42rpx rgba(86, 58, 34, 0.18);
  overflow: hidden;
}

.avatar::after {
  content: '';
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.44);
}

.avatar__text {
  position: relative;
  z-index: 1;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.avatar__status {
  position: absolute;
  right: 8rpx;
  bottom: 8rpx;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #6fd097;
  border: 4rpx solid rgba(255, 255, 255, 0.84);
  z-index: 2;
}
</style>