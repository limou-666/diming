<template>
  <view class="bubble-row" :class="rowClass">
    <view v-if="!isSelf" class="bubble-avatar" hover-class="bubble-avatar--active" @tap="handleAvatarClick">
      <AvatarBadge
        :name="contact.nickname"
        :palette="contact.palette"
        :accent="contact.accent"
        :online="contact.status === '在线'"
        :size="64"
      />
    </view>

    <view class="bubble-main" :class="{ 'bubble-main--self': isSelf }">
      <view class="bubble-content" :class="{ 'bubble-content--self': isSelf }">
        <template v-if="isSelf">
          <text class="bubble-time bubble-time--inline">{{ timeLabel }}</text>

          <view class="bubble-wrap" :class="wrapClass">
            <text v-if="message.type === 'text'" class="bubble-text">{{ message.content }}</text>
            <view v-else class="bubble-image-card" @tap="previewImage">
              <image
                class="bubble-image"
                :src="message.imageUrl"
                mode="aspectFill"
                lazy-load
                @load="notifyLayoutChange"
                @error="notifyLayoutChange"
              />
              <text class="bubble-caption">{{ message.caption }}</text>
            </view>
          </view>
        </template>

        <template v-else>
          <view class="bubble-wrap" :class="wrapClass">
            <text v-if="message.type === 'text'" class="bubble-text">{{ message.content }}</text>
            <view v-else class="bubble-image-card" @tap="previewImage">
              <image
                class="bubble-image"
                :src="message.imageUrl"
                mode="aspectFill"
                lazy-load
                @load="notifyLayoutChange"
                @error="notifyLayoutChange"
              />
              <text class="bubble-caption">{{ message.caption }}</text>
            </view>
          </view>

          <text class="bubble-time bubble-time--inline">{{ timeLabel }}</text>
        </template>
      </view>

      <view v-if="showFeedback && !isSelf" class="bubble-actions">
        <view
          v-for="item in feedbackActions"
          :key="item.key"
          class="bubble-actions__item"
          :class="{
            'bubble-actions__item--selected': item.active,
            'bubble-actions__item--busy': item.loading,
            'bubble-actions__item--like': item.key === 'like'
          }"
          :hover-class="item.loading ? '' : 'bubble-actions__item--pressed'"
          @tap="handleFeedback(item)"
        >
          <template v-if="item.key === 'like'">
            <text class="bubble-actions__icon" :class="{ 'bubble-actions__icon--active': item.active }">
              {{ item.active ? '❤' : '♡' }}
            </text>
            <view class="bubble-actions__label-stack">
              <text class="bubble-actions__label bubble-actions__label--base" :class="{ 'bubble-actions__label--hidden': item.active }">
                {{ item.label }}
              </text>
              <text
                class="bubble-actions__label bubble-actions__label--overlay"
                :class="{ 'bubble-actions__label--visible': item.active }"
              >
                {{ item.activeLabel }}
              </text>
            </view>
          </template>
          <text v-else class="bubble-actions__label bubble-actions__label--single">{{ item.label }}</text>
        </view>
      </view>

      <view v-if="isSelf" class="bubble-status">
        {{ statusLabel }}
      </view>
    </view>

    <view v-if="isSelf" class="bubble-avatar" hover-class="bubble-avatar--active" @tap="handleAvatarClick">
      <AvatarBadge
        :name="currentUser.nickname"
        :palette="currentUser.palette"
        :accent="currentUser.accent"
        :size="64"
      />
    </view>
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
  },
  showFeedback: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['avatarclick', 'feedback', 'layoutchange']);

const isSelf = computed(() => props.message.senderId === props.currentUser.id);
const timeLabel = computed(() => formatChatTime(props.message.createdAt));
const rowClass = computed(() => ({
  'bubble-row--self': isSelf.value,
  'bubble-row--fresh': props.message.isFresh,
  'bubble-row--fresh-self': props.message.isFresh && isSelf.value,
  'bubble-row--fresh-peer': props.message.isFresh && !isSelf.value
}));
const statusLabel = computed(() => (props.message.status === 'sending' ? '发送中' : '已发送'));
const feedbackActions = computed(() => [
  {
    key: 'like',
    label: '喜欢',
    activeLabel: '已喜欢',
    active: Boolean(props.message.liked),
    loading: false
  },
  {
    key: 'reroll',
    label: props.message.feedbackPending ? '生成中...' : '再来一条',
    active: false,
    loading: Boolean(props.message.feedbackPending)
  }
]);
const wrapClass = computed(() => ({
  'bubble-wrap--self': isSelf.value,
  'bubble-wrap--sending': props.message.status === 'sending'
}));

/**
 * 预览当前图片消息，交给系统图片查看器展示大图。
 */
function previewImage() {
  if (!props.message.imageUrl) {
    return;
  }
  uni.previewImage({
    current: props.message.imageUrl,
    urls: [props.message.imageUrl]
  });
}

/**
 * 统一处理气泡下方的反馈动作点击，并向父组件透传必要信息。
 *
 * @param {{ key: string, loading?: boolean }} action 当前点击的反馈动作。
 */
function handleFeedback(action) {
  if (action.loading) {
    return;
  }
  emit('feedback', {
    action: action.key,
    messageId: props.message.id
  });
}

/**
 * 通知父组件当前点击的是自己还是对方头像。
 */
function handleAvatarClick() {
  emit('avatarclick', {
    isSelf: isSelf.value
  });
}

/**
 * 图片加载后气泡高度可能变化，需要通知聊天页重新对齐到底部。
 */
function notifyLayoutChange() {
  emit('layoutchange');
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
  will-change: transform, opacity;
}

.bubble-row--fresh-self {
  animation: bubble-send-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.bubble-row--fresh-peer {
  animation: bubble-receive-in 0.44s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.bubble-avatar {
  flex-shrink: 0;
}

.bubble-avatar--active {
  transform: scale(0.96);
}

.bubble-main {
  max-width: 80%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.bubble-main--self {
  max-width: 86%;
  align-items: flex-end;
}

.bubble-content {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  min-width: 0;
}

.bubble-content--self {
  justify-content: flex-end;
}

.bubble-wrap {
  min-width: 0;
  max-width: 100%;
  padding: 20rpx 22rpx;
  position: relative;
  overflow: hidden;
  border-radius: 30rpx 30rpx 30rpx 10rpx;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14rpx 34rpx rgba(94, 66, 41, 0.1);
  transition:
    transform 220ms ease,
    box-shadow 220ms ease,
    background 220ms ease,
    opacity 180ms ease;
}

.bubble-wrap--self {
  border-radius: 30rpx 30rpx 10rpx 30rpx;
  background: linear-gradient(135deg, rgba(241, 201, 143, 0.86), rgba(248, 228, 191, 0.92));
}

.bubble-wrap--sending {
  opacity: 0.72;
}

.bubble-wrap--sending::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 0%, rgba(255, 255, 255, 0.2) 46%, transparent 74%);
  transform: translate3d(-118%, 0, 0);
  animation: bubble-sheen 0.78s ease both;
  pointer-events: none;
}

.bubble-text {
  font-size: 28rpx;
  line-height: 1.6;
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
  margin-top: 16rpx;
  font-size: 22rpx;
  line-height: 1.55;
  color: var(--ink);
}

.bubble-actions {
  display: flex;
  gap: 12rpx;
}

.bubble-row--fresh-peer .bubble-avatar {
  animation: avatar-pop-in 0.3s 0.04s ease both;
}

.bubble-row--fresh-peer .bubble-actions {
  animation: actions-pop-in 0.28s 0.12s ease both;
}

.bubble-actions__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
  font-size: 20rpx;
  color: var(--ink-soft);
  overflow: hidden;
  transition:
    transform 180ms ease,
    background 220ms ease,
    color 220ms ease,
    box-shadow 220ms ease,
    opacity 180ms ease;
}

.bubble-actions__item--like {
  min-width: 152rpx;
}

.bubble-actions__item--selected {
  background: rgba(241, 201, 143, 0.3);
  color: #7f4a2b;
  box-shadow: 0 10rpx 24rpx rgba(127, 74, 43, 0.1);
}

.bubble-actions__item--busy {
  opacity: 0.56;
}

.bubble-actions__item--pressed {
  transform: scale(0.97);
}

.bubble-actions__icon {
  width: 22rpx;
  flex-shrink: 0;
  text-align: center;
  color: rgba(138, 108, 87, 0.56);
  transform: scale(0.84);
  transition:
    color 220ms ease,
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.bubble-actions__icon--active {
  color: #d77659;
  transform: scale(1);
  animation: liked-pop 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.bubble-actions__label-stack {
  position: relative;
  width: 3em;
  height: 1.4em;
}

.bubble-actions__label {
  display: block;
  font-size: 20rpx;
  line-height: 1.4;
}

.bubble-actions__label--single {
  white-space: nowrap;
}

.bubble-actions__label--base,
.bubble-actions__label--overlay {
  position: absolute;
  inset: 0;
  white-space: nowrap;
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.bubble-actions__label--base {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.bubble-actions__label--hidden {
  opacity: 0;
  transform: translate3d(0, -8rpx, 0);
}

.bubble-actions__label--overlay {
  opacity: 0;
  transform: translate3d(0, 8rpx, 0);
}

.bubble-actions__label--visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.bubble-time {
  flex-shrink: 0;
  font-size: 18rpx;
  line-height: 1.4;
  color: var(--ink-soft);
  white-space: nowrap;
}

.bubble-time--inline {
  padding-bottom: 8rpx;
}

.bubble-status {
  display: block;
  font-size: 10rpx !important;
  line-height: 1.2 !important;
  color: var(--ink-soft);
  opacity: 0.7;
  align-self: flex-end;
}

@media screen and (max-width: 420px) {
  .bubble-main {
    max-width: 84%;
  }

  .bubble-main--self {
    max-width: 90%;
  }

  .bubble-content {
    gap: 10rpx;
  }

  .bubble-wrap {
    padding: 18rpx 20rpx;
  }

  .bubble-text {
    font-size: 26rpx;
  }

  .bubble-caption {
    font-size: 20rpx;
  }

  .bubble-time {
    font-size: 17rpx;
  }

  .bubble-status {
    font-size: 9rpx !important;
  }
}

@keyframes bubble-send-in {
  0% {
    transform: translate3d(22rpx, 14rpx, 0) scale(0.94);
    opacity: 0;
  }

  68% {
    transform: translate3d(-4rpx, 0, 0) scale(1.01);
    opacity: 1;
  }

  100% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 1;
  }
}

@keyframes bubble-receive-in {
  0% {
    transform: translate3d(-22rpx, 14rpx, 0) scale(0.94);
    opacity: 0;
  }

  68% {
    transform: translate3d(4rpx, 0, 0) scale(1.01);
    opacity: 1;
  }

  100% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 1;
  }
}

@keyframes avatar-pop-in {
  0% {
    transform: scale(0.82);
    opacity: 0;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes actions-pop-in {
  0% {
    transform: translate3d(0, 8rpx, 0);
    opacity: 0;
  }

  100% {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }
}

@keyframes bubble-sheen {
  0% {
    transform: translate3d(-118%, 0, 0);
    opacity: 0;
  }

  24% {
    opacity: 1;
  }

  100% {
    transform: translate3d(118%, 0, 0);
    opacity: 0;
  }
}

@keyframes liked-pop {
  0% {
    transform: scale(0.72);
  }

  72% {
    transform: scale(1.16);
  }

  100% {
    transform: scale(1);
  }
}
</style>
