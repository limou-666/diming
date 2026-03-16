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

/**
 * 抹平空值和首尾空格，保证后续头像文案计算基于稳定输入。
 *
 * @param {string} value 原始名称。
 * @returns {string} 清洗后的名称文本。
 */
function normalizeName(value) {
  return `${value || ''}`.trim();
}

/**
 * 判断当前名称是否只包含英文字母、数字和空格。
 *
 * @param {string} value 待判断的名称文本。
 * @returns {boolean} 是否属于纯 ASCII 单词组合。
 */
function isAsciiWord(value) {
  return /^[A-Za-z0-9\s]+$/.test(value);
}

/**
 * 英文名优先取缩写，中文名直接取前两个字，保证头像文本稳定。
 */
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

/**
 * 从组件传入的尺寸值中解析出数值部分，统一作为响应式换算基准。
 *
 * @param {number | string} value 组件尺寸入参。
 * @returns {number} 解析后的数值尺寸。
 */
function parseSize(value) {
  if (typeof value === 'number') {
    return value;
  }
  const matched = `${value || ''}`.match(/(\d+(?:\.\d+)?)/);
  return matched ? Number(matched[1]) : 84;
}

const viewportWidth = useViewportWidth();

/**
 * 将设计稿中的 `rpx` 数值转换成当前视口下的像素值。
 *
 * @param {number | string} value `rpx` 数值。
 * @returns {number} 换算后的像素值。
 */
function rpxToPx(value) {
  return (Number(value) * viewportWidth.value) / 750;
}

/**
 * 统一生成保留两位小数的像素字符串。
 *
 * @param {number} value 数值型像素值。
 * @returns {string} 可直接用于内联样式的像素字符串。
 */
function formatPx(value) {
  return `${Math.round(value * 100) / 100}px`;
}

/**
 * 把组件尺寸统一转换成最终可直接用于样式的响应式值。
 */
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
