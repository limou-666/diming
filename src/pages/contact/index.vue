<template>
  <view class="screen contact-page page-reveal" :class="{ 'page-reveal--entered': pageRevealed }">
    <AppHeader title="联系人详情" subtitle="查看完整信息与状态" rightLabel="聊天" @action="openChat" />

    <view v-if="contact" class="contact-card panel contact-animate contact-animate--1">
      <AvatarBadge
        :name="contact.nickname"
        :palette="contact.palette"
        :accent="contact.accent"
        :online="contact.status === '在线'"
        :size="148"
      />
      <text class="contact-card__name">{{ contact.nickname }}</text>
      <text class="contact-card__role">{{ contact.role }} · {{ contact.location }}</text>
      <text class="contact-card__signature">{{ contact.signature }}</text>
      <view class="contact-card__meta-row">
        <text class="contact-card__pill">{{ contact.level }}</text>
        <text class="contact-card__pill">{{ contact.lastActive }}</text>
      </view>
      <text class="contact-card__motto">{{ contact.motto }}</text>
    </view>

    <view v-if="contact" class="stats-grid contact-animate contact-animate--2">
      <view class="stats-grid__item panel">
        <text class="stats-grid__value">{{ contact.stats.conversations }}</text>
        <text class="stats-grid__label">累计会话</text>
      </view>
      <view class="stats-grid__item panel">
        <text class="stats-grid__value">{{ contact.stats.images }}</text>
        <text class="stats-grid__label">共享图片</text>
      </view>
      <view class="stats-grid__item panel">
        <text class="stats-grid__value">{{ contact.stats.replyRate }}</text>
        <text class="stats-grid__label">响应率</text>
      </view>
    </view>

    <view v-if="contact" class="detail-panel panel contact-animate contact-animate--3">
      <view class="section-title">
        <text class="section-title__main">基础信息</text>
        <text class="section-title__sub">完整资料展示</text>
      </view>
      <view v-for="item in contact.detailList" :key="item.label" class="detail-row">
        <text class="detail-row__label">{{ item.label }}</text>
        <text class="detail-row__value">{{ item.value }}</text>
      </view>
    </view>

    <view v-if="contact" class="detail-panel panel contact-animate contact-animate--4">
      <view class="section-title">
        <text class="section-title__main">标签与能力</text>
        <text class="section-title__sub">支持完整演示</text>
      </view>
      <view class="chips">
        <text v-for="tag in contact.tags" :key="tag" class="chips__item">{{ tag }}</text>
      </view>
      <view class="chips chips--soft">
        <text v-for="skill in contact.skills" :key="skill" class="chips__item">{{ skill }}</text>
      </view>
      <text class="contact-bio">{{ contact.bio }}</text>
    </view>

    <view v-if="contact" class="detail-panel panel contact-animate contact-animate--5">
      <view class="section-title">
        <text class="section-title__main">互动备注</text>
        <text class="section-title__sub">页面支持返回与继续聊天</text>
      </view>
      <view v-for="moment in contact.moments" :key="moment.label" class="moment-row">
        <text class="moment-row__label">{{ moment.label }}</text>
        <text class="moment-row__value">{{ moment.value }}</text>
      </view>
    </view>

    <button
      v-if="contact"
      class="contact-action contact-animate contact-animate--6"
      hover-class="contact-action--active"
      @tap="openChat"
    >
      开始聊天
    </button>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import AppHeader from '@/components/AppHeader.vue';
import AvatarBadge from '@/components/AvatarBadge.vue';
import { usePageReveal } from '@/composables/usePageReveal';
import { fetchContact, getConversationIdByContact, primeConversationBundle } from '@/mock';
import { navigateToPage } from '@/utils/navigation';

const contact = ref(null);
const conversationId = ref('');
const { pageRevealed } = usePageReveal();

/**
 * 根据联系人 ID 加载详情，并同步解析关联的会话 ID。
 *
 * @param {string} contactId 联系人 ID。
 * @returns {Promise<void>}
 */
async function loadByContactId(contactId) {
  contact.value = await fetchContact(contactId);
  conversationId.value = getConversationIdByContact(contactId);
}

/**
 * 进入当前联系人的聊天页；必要时先兜底解析会话 ID。
 */
function openChat() {
  if (!conversationId.value && contact.value) {
    conversationId.value = getConversationIdByContact(contact.value.id);
  }
  if (!conversationId.value) {
    return;
  }
  primeConversationBundle(conversationId.value);
  navigateToPage(`/pages/chat/index?conversationId=${conversationId.value}`);
}

onLoad(async (options) => {
  if (options?.contactId) {
    await loadByContactId(options.contactId);
  }
});
</script>

<style scoped lang="scss">
.contact-page {
  padding-bottom: 48rpx;
}

.contact-animate {
  opacity: 0;
  transform: translate3d(0, 22rpx, 0);
  animation: section-rise-in 0.44s cubic-bezier(0.22, 1, 0.36, 1) both;
  will-change: transform, opacity;
}

.contact-animate--1 {
  animation-delay: 40ms;
}

.contact-animate--2 {
  animation-delay: 90ms;
}

.contact-animate--3 {
  animation-delay: 140ms;
}

.contact-animate--4 {
  animation-delay: 190ms;
}

.contact-animate--5 {
  animation-delay: 240ms;
}

.contact-animate--6 {
  animation-delay: 290ms;
}

.contact-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 34rpx 28rpx;
  text-align: center;
  background: linear-gradient(160deg, rgba(166, 222, 200, 0.7), rgba(255, 248, 241, 0.76), rgba(241, 201, 143, 0.66));
}

.contact-card__name {
  margin-top: 22rpx;
  font-size: 40rpx;
  font-weight: 700;
  color: var(--ink);
}

.contact-card__role,
.contact-card__signature,
.contact-card__motto {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--ink-soft);
}

.contact-card__meta-row {
  display: flex;
  gap: 14rpx;
  margin-top: 18rpx;
  flex-wrap: wrap;
  justify-content: center;
}

.contact-card__pill {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.56);
  font-size: 22rpx;
  color: var(--ink);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-top: 24rpx;
}

.stats-grid__item {
  padding: 22rpx 18rpx;
  text-align: center;
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.stats-grid__item:nth-child(1) {
  animation: tile-rise-in 0.38s 0.14s ease both;
}

.stats-grid__item:nth-child(2) {
  animation: tile-rise-in 0.38s 0.2s ease both;
}

.stats-grid__item:nth-child(3) {
  animation: tile-rise-in 0.38s 0.26s ease both;
}

.stats-grid__value {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ink);
}

.stats-grid__label {
  display: block;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: var(--ink-soft);
}

.detail-panel {
  margin-top: 24rpx;
  padding: 26rpx 24rpx;
}

.detail-row,
.moment-row {
  padding: 20rpx 0;
  border-top: 1rpx solid var(--line);
}

.detail-row:first-of-type,
.moment-row:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.detail-row__label,
.moment-row__label {
  display: block;
  font-size: 22rpx;
  color: var(--ink-soft);
}

.detail-row__value,
.moment-row__value {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--ink);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.chips--soft {
  margin-top: 16rpx;
}

.chips__item {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(166, 222, 200, 0.32);
  font-size: 22rpx;
  color: var(--ink);
}

.contact-bio {
  display: block;
  margin-top: 20rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--ink-soft);
}

.contact-action {
  height: 98rpx;
  margin-top: 30rpx;
  border-radius: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #80d2bb, #efc98e);
  color: var(--ink);
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: var(--shadow-lift);
  transition: transform 220ms ease, box-shadow 220ms ease, filter 220ms ease;
}

.contact-action--active {
  transform: scale(0.98);
}

@keyframes section-rise-in {
  0% {
    opacity: 0;
    transform: translate3d(0, 22rpx, 0);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes tile-rise-in {
  0% {
    opacity: 0;
    transform: translate3d(0, 18rpx, 0) scale(0.97);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
</style>
