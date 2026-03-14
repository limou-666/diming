<template>
  <view class="bubble-row" :class="{ 'bubble-row--self': isSelf, 'bubble-row--fresh': message.isFresh }">
    <AvatarBadge
      v-if="!isSelf"
      :name="contact.nickname"
      :palette="contact.palette"
      :accent="contact.accent"
      :online="contact.status === '在线'"
      :size="64"
    />

    <view class="bubble-main">
      <view class="bubble-wrap" :class="wrapClass">
        <text v-if="message.type === 'text'" class="bubble-text">{{ message.content }}</text>
        <view v-else class="bubble-image-card" @tap="previewImage">
          <image class="bubble-image" :src="message.imageUrl" mode="aspectFill" lazy-load />
          <text class="bubble-caption">{{ message.caption }}</text>
        </view>
      </view>

      <view v-if="message.feedback && !isSelf" class="bubble-actions">
        <view
          v-for="item in feedbackActions"
          :key="item"
          class="bubble-actions__item"
          hover-class="bubble-actions__item--active"
          @tap="handleFeedback(item)"
        >
          {{ item }}
        </view>
      </view>

      <text class="bubble-time">
        {{ timeLabel }}
        <text v-if="isSelf">{{ message.status === 'sending' ? ' 发送中' : ' 已发送' }}</text>
      </text>
    </view>

    <AvatarBadge
      v-if="isSelf"
      :name="currentUser.nickname"
      :palette="currentUser.palette"
      :accent="currentUser.accent"
      :size="64"
    />
  </view>
</template>

<script setup>
import { computed } from 'vue';
import AvatarBadge from './AvatarBadge.vue';
import { formatChatTime } from '@/utils/date';

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  currentUser: {
    type: Object,
    required: true
  },
  contact: {
    type: Object,
    required: true
  }
});

const feedbackActions = ['喜欢', '再来一条'];
const isSelf = computed(() => props.message.senderId === props.currentUser.id);
const timeLabel = computed(() => formatChatTime(props.message.createdAt));
const wrapClass = computed(() => ({
  'bubble-wrap--self': isSelf.value,
  'bubble-wrap--sending': props.message.status === 'sending'
}));

function previewImage() {
  if (!props.message.imageUrl) {
    return;
  }
  uni.previewImage({
    current: props.message.imageUrl,
    urls: [props.message.imageUrl]
  });
}

function handleFeedback(label) {
  uni.showToast({
    title: `已${label}`,
    icon: 'none'
  });
}
</script>

<style scoped lang="scss">
.bubble-row {
  display: flex;
  align-items: flex-end;
  gap: 14rpx;
  margin-bottom: 24rpx;
}

.bubble-row--self {
  justify-content: flex-end;
}

.bubble-row--fresh {
  animation: bubble-pop 0.36s ease;
}

.bubble-main {
  max-width: 72%;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.bubble-wrap {
  padding: 22rpx 24rpx;
  border-radius: 30rpx 30rpx 30rpx 10rpx;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14rpx 34rpx rgba(94, 66, 41, 0.1);
}

.bubble-wrap--self {
  border-radius: 30rpx 30rpx 10rpx 30rpx;
  background: linear-gradient(135deg, rgba(241, 201, 143, 0.86), rgba(248, 228, 191, 0.92));
}

.bubble-wrap--sending {
  opacity: 0.72;
}

.bubble-text {
  font-size: 30rpx;
  line-height: 1.65;
  color: var(--ink);
}

.bubble-image-card {
  width: 100%;
}

.bubble-image {
  width: 100%;
  height: 300rpx;
  border-radius: 24rpx;
  background: #f4ead7;
}

.bubble-caption {
  display: block;
  margin-top: 18rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--ink);
}

.bubble-actions {
  display: flex;
  gap: 12rpx;
}

.bubble-actions__item {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
  font-size: 22rpx;
  color: var(--ink-soft);
}

.bubble-actions__item--active {
  transform: scale(0.97);
}

.bubble-time {
  font-size: 20rpx;
  color: var(--ink-soft);
  align-self: flex-start;
}

.bubble-row--self .bubble-time {
  align-self: flex-end;
}

@keyframes bubble-pop {
  0% {
    transform: translateY(18rpx) scale(0.96);
    opacity: 0;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
</style>