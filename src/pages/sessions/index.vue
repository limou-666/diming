<template>
  <view class="screen sessions-page">
    <AppHeader title="对话仓库" subtitle="把灵感聊清楚，也把细节做顺滑" :showBack="false" />

    <view class="hero panel">
      <view class="hero__copy">
        <text class="hero__eyebrow">{{ profile?.nickname || 'Companion AI' }}</text>
        <text class="hero__title">今天有 {{ total }} 段活跃会话正在推进</text>
        <text class="hero__description">会话列表支持下拉刷新、上拉加载，点击即可进入完整聊天详情。</text>
      </view>
      <view class="hero__stats">
        <view class="hero__stat">
          <text class="hero__stat-value">{{ unreadTotal }}</text>
          <text class="hero__stat-label">未读消息</text>
        </view>
        <view class="hero__stat">
          <text class="hero__stat-value">{{ activeCount }}</text>
          <text class="hero__stat-label">在线联系人</text>
        </view>
      </view>
    </view>

    <view class="section-title">
      <text class="section-title__main">最近会话</text>
      <text class="section-title__sub">下拉刷新，上拉继续加载</text>
    </view>

    <view v-if="!sessions.length && loading" class="skeleton-list">
      <view v-for="item in 4" :key="item" class="skeleton panel" />
    </view>

    <view v-else class="session-list">
      <SessionCard
        v-for="(session, index) in sessions"
        :key="session.id"
        class="session-list__item"
        :style="{ animationDelay: `${index * 60}ms` }"
        :session="session"
        @select="openSession"
      />
    </view>

    <view class="load-state">
      {{ loading && sessions.length ? '加载更多中...' : hasMore ? '继续下滑可加载更多' : '已经到底了' }}
    </view>

    <BottomDock current="sessions" />
  </view>
</template>

<script setup>
import { nextTick, ref } from 'vue';
import { onPageScroll, onPullDownRefresh, onReachBottom, onShow, onUnload } from '@dcloudio/uni-app';
import AppHeader from '@/components/AppHeader.vue';
import BottomDock from '@/components/BottomDock.vue';
import SessionCard from '@/components/SessionCard.vue';
import { usePagedSessions } from '@/composables/usePagedSessions';
import { fetchProfile } from '@/mock';

const profile = ref(null);
const initialized = ref(false);
const {
  sessions,
  total,
  unreadTotal,
  activeCount,
  loading,
  refreshing,
  hasMore,
  loadInitial,
  refresh,
  loadMore
} = usePagedSessions(6);
const windowHeight = uni.getSystemInfoSync().windowHeight || 0;

let loadMoreTimer = null;

async function loadProfile() {
  profile.value = await fetchProfile();
}

async function bootstrap() {
  await Promise.all([loadInitial(), loadProfile()]);
  await nextTick();
  scheduleLoadMoreCheck(80);
  initialized.value = true;
}

function clearLoadMoreTimer() {
  if (loadMoreTimer) {
    clearTimeout(loadMoreTimer);
    loadMoreTimer = null;
  }
}

function scheduleLoadMoreCheck(delay = 0) {
  clearLoadMoreTimer();
  loadMoreTimer = setTimeout(() => {
    if (loading.value || refreshing.value || !hasMore.value) {
      return;
    }
    const query = uni.createSelectorQuery();
    query.select('.load-state').boundingClientRect();
    query.exec((result) => {
      const rect = result?.[0];
      if (!rect || loading.value || refreshing.value || !hasMore.value) {
        return;
      }
      if (rect.top <= windowHeight + 220) {
        loadMore().then(() => {
          scheduleLoadMoreCheck(80);
        });
      }
    });
  }, delay);
}

function openSession(session) {
  uni.navigateTo({
    url: `/pages/chat/index?conversationId=${session.id}`
  });
}

onShow(async () => {
  if (!initialized.value) {
    await bootstrap();
    return;
  }
  await Promise.all([refresh(), loadProfile()]);
  await nextTick();
  scheduleLoadMoreCheck(80);
});

onPullDownRefresh(async () => {
  await Promise.all([refresh(), loadProfile()]);
  await nextTick();
  scheduleLoadMoreCheck(80);
  uni.stopPullDownRefresh();
  uni.showToast({
    title: '会话已刷新',
    icon: 'none'
  });
});

onReachBottom(() => {
  loadMore().then(() => {
    scheduleLoadMoreCheck(80);
  });
});

onPageScroll(() => {
  scheduleLoadMoreCheck(60);
});

onUnload(() => {
  clearLoadMoreTimer();
});
</script>

<style scoped lang="scss">
.sessions-page {
  padding-bottom: 180rpx;
}

.hero {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 30rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, rgba(166, 222, 200, 0.72), rgba(255, 247, 238, 0.76), rgba(241, 201, 143, 0.68));
}

.hero__copy {
  flex: 1;
  min-width: 0;
}

.hero__eyebrow {
  display: block;
  font-size: 22rpx;
  color: rgba(91, 52, 23, 0.72);
}

.hero__title {
  display: block;
  margin-top: 12rpx;
  font-size: 38rpx;
  line-height: 1.35;
  font-weight: 700;
  color: var(--ink);
}

.hero__description {
  display: block;
  margin-top: 18rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--ink-soft);
}

.hero__stats {
  width: 180rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.hero__stat {
  flex: 1;
  padding: 22rpx 18rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.56);
}

.hero__stat-value {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--ink);
}

.hero__stat-label {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: var(--ink-soft);
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.session-list__item {
  animation: rise-in 0.4s ease both;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.skeleton {
  height: 158rpx;
  position: relative;
  overflow: hidden;
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  animation: shimmer 1.2s linear infinite;
}

.load-state {
  padding: 28rpx 0 18rpx;
  text-align: center;
  font-size: 22rpx;
  color: var(--ink-soft);
}

@keyframes rise-in {
  0% {
    transform: translateY(20rpx);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
