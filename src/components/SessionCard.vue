<template>
  <view class="session-card panel" hover-class="session-card--active" @tap="$emit('select', session)">
    <AvatarBadge
      :name="session.contact.nickname"
      :palette="session.contact.palette"
      :accent="session.contact.accent"
      :online="session.contact.status === '在线'"
      :size="94"
    />
    <view class="session-card__body">
      <view class="session-card__top">
        <view class="session-card__identity">
          <text class="session-card__name">{{ session.contact.nickname }}</text>
          <text v-if="session.badge" class="session-card__badge">{{ session.badge }}</text>
          <text v-if="session.muted" class="session-card__muted">静音</text>
        </view>
        <text class="session-card__time">{{ timeLabel }}</text>
      </view>
      <text class="session-card__signature">{{ session.contact.signature }}</text>
      <view class="session-card__bottom">
        <text class="session-card__preview">{{ previewText }}</text>
        <view v-if="session.unreadCount" class="session-card__count">
          {{ session.unreadCount > 99 ? '99+' : session.unreadCount }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import AvatarBadge from './AvatarBadge.vue';
import { formatSessionTime } from '@/utils/date';

const props = defineProps({
  session: {
    type: Object,
    required: true
  }
});

defineEmits(['select']);

const previewText = computed(() =>
  props.session.lastMessageType === 'image' ? `[图片] ${props.session.lastMessage}` : props.session.lastMessage
);
const timeLabel = computed(() => formatSessionTime(props.session.updatedAt));
</script>

<style scoped lang="scss">
.session-card {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.session-card--active {
  transform: translateY(-4rpx) scale(0.99);
}

.session-card__body {
  flex: 1;
  min-width: 0;
}

.session-card__top,
.session-card__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.session-card__identity {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}

.session-card__name {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-card__badge,
.session-card__muted {
  flex-shrink: 0;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
}

.session-card__badge {
  background: rgba(166, 222, 200, 0.42);
  color: var(--ink);
}

.session-card__muted {
  background: rgba(255, 255, 255, 0.54);
  color: var(--ink-soft);
}

.session-card__time,
.session-card__signature {
  color: var(--ink-soft);
}

.session-card__time {
  flex-shrink: 0;
  font-size: 22rpx;
}

.session-card__signature {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
}

.session-card__preview {
  flex: 1;
  min-width: 0;
  margin-top: 18rpx;
  font-size: 26rpx;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-card__count {
  min-width: 42rpx;
  height: 42rpx;
  margin-top: 18rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #efb970, #de8653);
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
}
</style>