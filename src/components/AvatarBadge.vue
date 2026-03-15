<template>
  <view class="avatar" :style="avatarStyle">
    <view class="avatar__text" :style="avatarTextStyle">{{ initials }}</view>
    <view v-if="online" class="avatar__status" />
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { useViewportWidth } from '@/composables/useViewportWidth';

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

function normalizeName(value) {
  return `${value || ''}`.trim();
}

function isAsciiWord(value) {
  return /^[A-Za-z0-9\s]+$/.test(value);
}

function toInitials(value) {
  const normalized = normalizeName(value);
  if (!normalized) {
    return 'AI';
  }

  if (isAsciiWord(normalized)) {
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
    }
    return normalized.slice(0, 2).toUpperCase();
  }

  return normalized.slice(0, 2);
}

function parseSize(value) {
  if (typeof value === 'number') {
    return value;
  }
  const matched = `${value || ''}`.match(/(\d+(?:\.\d+)?)/);
  return matched ? Number(matched[1]) : 84;
}

const viewportWidth = useViewportWidth();

function rpxToPx(value) {
  return (Number(value) * viewportWidth.value) / 750;
}

function formatPx(value) {
  return `${Math.round(value * 100) / 100}px`;
}

function toResponsiveSize(value) {
  if (typeof value === 'number') {
    return formatPx(rpxToPx(value));
  }

  const normalized = `${value || ''}`.trim();
  if (!normalized) {
    return formatPx(rpxToPx(84));
  }

  if (/^-?\d+(?:\.\d+)?(rpx|upx)$/i.test(normalized)) {
    return formatPx(rpxToPx(Number.parseFloat(normalized)));
  }

  return normalized;
}

const initials = computed(() => toInitials(props.name));
const sizeNumber = computed(() => parseSize(props.size));
const sizePx = computed(() => rpxToPx(sizeNumber.value));
const sizeValue = computed(() => toResponsiveSize(props.size));
const avatarTextStyle = computed(() => {
  const count = initials.value.length || 1;
  const ascii = isAsciiWord(initials.value);
  const fontRatio = ascii ? (count > 1 ? 0.3 : 0.38) : count > 1 ? 0.28 : 0.36;
  const minFontSize = rpxToPx(ascii || count === 1 ? 20 : 18);
  const fontSize = Math.max(sizePx.value * fontRatio, minFontSize);
  const letterSpacing = ascii && count > 1 ? sizePx.value * 0.015 : 0;

  return {
    color: props.accent,
    fontSize: formatPx(fontSize),
    letterSpacing: formatPx(letterSpacing)
  };
});

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
  width: 100%;
  height: 100%;
  padding: 0 12%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
  font-weight: 700;
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
