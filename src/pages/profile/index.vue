<template>
  <view class="screen profile-page page-reveal" :class="{ 'page-reveal--entered': pageRevealed }">
    <AppHeader title="个人中心" subtitle="当前用户信息与功能入口" />

    <view v-if="profile" class="profile-hero panel profile-animate profile-animate--1">
      <AvatarBadge
        :name="profile.nickname"
        :palette="profile.palette"
        :accent="profile.accent"
        :size="132"
      />
      <view class="profile-hero__body">
        <text class="profile-hero__name">{{ profile.nickname }}</text>
        <text class="profile-hero__meta">{{ profile.job }} · {{ profile.location }}</text>
        <text class="profile-hero__signature">{{ profile.signature }}</text>
        <view class="profile-hero__level">{{ profile.level }}</view>
      </view>
    </view>

    <view v-if="profile" class="profile-stats profile-animate profile-animate--2">
      <view v-for="item in profile.stats" :key="item.label" class="profile-stats__item panel">
        <text class="profile-stats__value">{{ item.value }}</text>
        <text class="profile-stats__label">{{ item.label }}</text>
      </view>
    </view>

    <view class="section-title">
      <text class="section-title__main">快捷联系人</text>
      <text class="section-title__sub">点击查看资料或继续聊天</text>
    </view>

    <view class="quick-contacts">
      <view
        v-for="(contact, index) in quickContacts"
        :key="contact.id"
        class="quick-contacts__item panel profile-list__item"
        :style="{ animationDelay: `${120 + index * 50}ms` }"
        hover-class="quick-contacts__item--active"
        @tap="openContact(contact)"
      >
        <AvatarBadge :name="contact.nickname" :palette="contact.palette" :accent="contact.accent" :size="84" />
        <view class="quick-contacts__body">
          <text class="quick-contacts__name">{{ contact.nickname }}</text>
          <text class="quick-contacts__meta">{{ contact.role }}</text>
        </view>
        <button class="quick-contacts__button" hover-class="quick-contacts__button--active" @tap.stop="openChat(contact)">
          聊天
        </button>
      </view>
    </view>

    <view class="section-title">
      <text class="section-title__main">功能入口</text>
      <text class="section-title__sub">演示入口均为前端反馈</text>
    </view>

    <view class="profile-entries">
      <FeatureEntry
        v-for="(entry, index) in profile?.entries || []"
        :key="entry.id"
        class="profile-entry"
        :style="{ animationDelay: `${180 + index * 50}ms` }"
        :entry="entry"
        @select="handleEntryClick"
      />
    </view>

    <view v-if="profile" class="profile-footnote panel profile-animate profile-animate--4">
      <text>{{ profile.footnote }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import AppHeader from '@/components/AppHeader.vue';
import AvatarBadge from '@/components/AvatarBadge.vue';
import FeatureEntry from '@/components/FeatureEntry.vue';
import { usePageReveal } from '@/composables/usePageReveal';
import { fetchContactsByIds, fetchProfile, getConversationIdByContact, primeContact, primeConversationBundle } from '@/mock';
import { navigateToPage } from '@/utils/navigation';

const profile = ref(null);
const quickContacts = ref([]);
const { pageRevealed } = usePageReveal();

async function loadPage() {
  const profileData = await fetchProfile();
  profile.value = profileData;
  quickContacts.value = await fetchContactsByIds(profileData.quickContacts || []);
}

function openContact(contact) {
  primeContact(contact.id);
  navigateToPage(`/pages/contact/index?contactId=${contact.id}`);
}

function openChat(contact) {
  const conversationId = getConversationIdByContact(contact.id);
  primeConversationBundle(conversationId);
  navigateToPage(`/pages/chat/index?conversationId=${conversationId}`);
}

function handleEntryClick(entry) {
  uni.showToast({
    title: `${entry.label} 仅做前端演示`,
    icon: 'none'
  });
}

onShow(() => {
  loadPage();
});
</script>

<style scoped lang="scss">
.profile-page {
  padding-bottom: 56rpx;
}

.profile-animate,
.profile-list__item,
.profile-entry {
  opacity: 0;
  transform: translate3d(0, 22rpx, 0);
  animation: profile-rise-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
  will-change: transform, opacity;
}

.profile-animate--1 {
  animation-delay: 40ms;
}

.profile-animate--2 {
  animation-delay: 90ms;
}

.profile-animate--4 {
  animation-delay: 320ms;
}

.profile-hero {
  display: flex;
  gap: 24rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, rgba(241, 201, 143, 0.78), rgba(255, 252, 248, 0.84), rgba(166, 222, 200, 0.72));
}

.profile-hero__body {
  flex: 1;
  min-width: 0;
}

.profile-hero__name {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: var(--ink);
}

.profile-hero__meta,
.profile-hero__signature {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--ink-soft);
}

.profile-hero__signature {
  line-height: 1.7;
}

.profile-hero__level {
  display: inline-flex;
  margin-top: 16rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.58);
  font-size: 22rpx;
  color: var(--ink);
}

.profile-stats {
  margin-top: 24rpx;
  margin-bottom: 30rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.profile-stats__item {
  padding: 24rpx 18rpx;
  text-align: center;
  animation: tile-rise-in 0.38s ease both;
}

.profile-stats__item:nth-child(1) {
  animation-delay: 130ms;
}

.profile-stats__item:nth-child(2) {
  animation-delay: 190ms;
}

.profile-stats__item:nth-child(3) {
  animation-delay: 250ms;
}

.profile-stats__value {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ink);
}

.profile-stats__label {
  display: block;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: var(--ink-soft);
}

.quick-contacts,
.profile-entries {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.quick-contacts__item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 22rpx;
  transition: transform 220ms ease, box-shadow 220ms ease, background 220ms ease;
}

.quick-contacts__item--active {
  transform: scale(0.99);
}

.quick-contacts__body {
  flex: 1;
  min-width: 0;
}

.quick-contacts__name {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
}

.quick-contacts__meta {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: var(--ink-soft);
}

.quick-contacts__button {
  width: 110rpx;
  height: 74rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink);
  font-size: 24rpx;
  transition: transform 180ms ease, background 220ms ease;
}

.quick-contacts__button--active {
  transform: scale(0.96);
}

.profile-footnote {
  margin-top: 30rpx;
  padding: 24rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: var(--ink-soft);
}

@keyframes profile-rise-in {
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
    transform: translate3d(0, 16rpx, 0) scale(0.97);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
</style>
