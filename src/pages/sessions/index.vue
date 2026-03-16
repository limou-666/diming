<template>
  <view
    class="screen sessions-page page-reveal"
    :class="[
      { 'page-reveal--entered': pageRevealed },
      revealMode !== 'default' ? `page-reveal--${revealMode}` : ''
    ]"
  >
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
          <text class="hero__stat-tip">最近未读会在下方工具条里展开</text>
        </view>
        <view class="hero__stat">
          <text class="hero__stat-value">{{ activeCount }}</text>
          <text class="hero__stat-label">在线联系人</text>
        </view>
      </view>
    </view>

    <view class="workspace-bar panel">
      <view class="workspace-bar__head">
        <view class="workspace-bar__copy">
          <text class="workspace-bar__eyebrow">页面切换</text>
        </view>
      </view>

      <view class="workspace-bar__body">
        <view class="workspace-tabs">
          <button class="workspace-tabs__item workspace-tabs__item--active">会话</button>
          <button class="workspace-tabs__item" hover-class="workspace-tabs__item--pressed" @tap="switchWorkspace">
            我的
          </button>
        </view>

        <button
          class="workspace-unread"
          :class="{
            'workspace-unread--active': showUnreadPanel,
            'workspace-unread--disabled': !unreadTotal
          }"
          hover-class="workspace-unread--pressed"
          @tap="toggleUnreadPanel"
        >
          <view class="workspace-unread__copy">
            <text class="workspace-unread__label">{{ showUnreadPanel ? '收起最近未读' : '查看最近未读' }}</text>
            <text class="workspace-unread__text">{{ unreadPanelText }}</text>
          </view>
          <text v-if="unreadTotal" class="workspace-unread__badge">{{ unreadTotal > 99 ? '99+' : unreadTotal }}</text>
          <text class="workspace-unread__arrow" :class="{ 'workspace-unread__arrow--open': showUnreadPanel }">⌄</text>
        </button>
      </view>
    </view>

    <view v-if="showUnreadPanel" class="unread-panel panel">
      <view class="section-title">
        <text class="section-title__main">最近未读</text>
        <text class="section-title__sub">顶部单独展示，下面原排序保持不变</text>
      </view>

      <view v-if="unreadSessions.length" class="session-list session-list--unread">
        <SessionCard
          v-for="(session, index) in unreadSessions"
          :key="`unread-${session.id}`"
          class="session-list__item"
          :style="{ animationDelay: `${index * 50}ms` }"
          :session="session"
          @select="openSession"
        />
      </view>

      <view v-else class="unread-panel__empty">当前没有未读联系人。</view>
    </view>
    <view class="section-title">
      <text class="section-title__main">最近会话</text>
      <text class="section-title__sub">下拉刷新，上拉继续加载</text>
    </view>

    <view v-if="!visibleSessions.length && loading" class="skeleton-list">
      <view v-for="item in 4" :key="item" class="skeleton panel" />
    </view>

    <view v-else-if="visibleSessions.length" class="session-list">
      <SessionCard
        v-for="(session, index) in visibleSessions"
        :key="session.id"
        class="session-list__item"
        :style="{ animationDelay: `${index * 60}ms` }"
        :session="session"
        @select="openSession"
      />
    </view>

    <view v-else class="session-list-empty panel">
      {{ showUnreadPanel ? '当前页里的未读会话已在上方展示。' : '当前没有可展示的会话。' }}
    </view>

    <view class="load-state">
      {{ loading && visibleSessions.length ? '加载更多中...' : hasMore ? '继续下滑可加载更多' : '已经到底了' }}
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { onPageScroll, onPullDownRefresh, onReachBottom, onShow, onUnload } from '@dcloudio/uni-app';
import AppHeader from '@/components/AppHeader.vue';
import SessionCard from '@/components/SessionCard.vue';
import { usePageReveal } from '@/composables/usePageReveal';
import { usePagedSessions } from '@/composables/usePagedSessions';
import { fetchProfile, primeConversationBundle, primeProfile } from '@/mock';
import { navigateToPage } from '@/utils/navigation';
import { consumeWorkspaceTransition } from '@/utils/workspaceTransition';

const profile = ref(null);
const initialized = ref(false);
const showUnreadPanel = ref(false);
const { pageRevealed, revealMode } = usePageReveal({
  resolveMode: resolveRevealMode
});
const {
  sessions,
  unreadSessions,
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
const unreadPanelText = computed(() =>
  unreadTotal.value ? `最近有 ${unreadTotal.value} 条未读消息待处理` : '当前没有未读消息'
);
const hiddenSessionIds = computed(() =>
  showUnreadPanel.value ? new Set(unreadSessions.value.map((item) => item.id)) : null
);
const visibleSessions = computed(() => {
  if (!hiddenSessionIds.value) {
    return sessions.value;
  }

  return sessions.value.filter((item) => !hiddenSessionIds.value.has(item.id));
});

let loadMoreTimer = null;

/**
 * 读取当前用户资料，用于顶部欢迎区展示。
 *
 * @returns {Promise<void>}
 */
async function loadProfile() {
  profile.value = await fetchProfile();
}

/**
 * 页面首屏初始化时并行加载会话列表和当前用户资料。
 *
 * @returns {Promise<void>}
 */
async function bootstrap() {
  await Promise.all([loadInitial(), loadProfile()]);
  await nextTick();
  scheduleLoadMoreCheck(80);
  initialized.value = true;
}

/**
 * 清理延迟触发的自动加载检测定时器。
 */
function clearLoadMoreTimer() {
  if (loadMoreTimer) {
    clearTimeout(loadMoreTimer);
    loadMoreTimer = null;
  }
}

/**
 * 延迟检查“加载更多”提示是否已进入视口，必要时自动触发下一页加载。
 *
 * @param {number} [delay=0] 执行检测前的延迟时间。
 */
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

/**
 * 预热聊天页数据后进入指定会话详情。
 *
 * @param {{ id: string }} session 当前点击的会话对象。
 */
function openSession(session) {
  primeConversationBundle(session.id);
  primeProfile();
  navigateToPage(`/pages/chat/index?conversationId=${session.id}`);
}

/**
 * 根据最近一次工作区切换记录决定页面回场动画模式。
 *
 * @returns {string} 当前页面应使用的 reveal 模式。
 */
function resolveRevealMode() {
  const transition = consumeWorkspaceTransition({
    from: 'profile',
    to: 'sessions',
    variant: 'workspace-return'
  });

  return transition ? transition.variant : 'default';
}

/**
 * 从会话页切换到“我的”页面。
 */
function switchWorkspace() {
  primeProfile();
  navigateToPage('/pages/profile/index');
}

/**
 * 展开或收起最近未读区域，不改变主会话列表顺序。
 */
async function toggleUnreadPanel() {
  if (!unreadTotal.value) {
    showUnreadPanel.value = false;
    uni.showToast({
      title: '当前没有未读消息',
      icon: 'none'
    });
    return;
  }

  showUnreadPanel.value = !showUnreadPanel.value;
  await nextTick();
  scheduleLoadMoreCheck(80);
}

watch(unreadTotal, (value) => {
  if (!value) {
    showUnreadPanel.value = false;
  }
});

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
  padding-bottom: 56rpx;
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

.hero__stat-tip {
  display: block;
  margin-top: 10rpx;
  font-size: 18rpx;
  line-height: 1.5;
  color: rgba(91, 52, 23, 0.62);
}

.workspace-bar {
  margin-bottom: 28rpx;
  padding: 24rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.8), rgba(243, 249, 245, 0.7));
}

.workspace-bar__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 20rpx;
}

.workspace-bar__copy {
  flex: 1;
  min-width: 0;
}

.workspace-bar__eyebrow {
  display: block;
  font-size: 20rpx;
  color: rgba(91, 52, 23, 0.66);
}

.workspace-bar__body {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
}

.workspace-tabs {
  display: inline-flex;
  gap: 8rpx;
  padding: 8rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: inset 0 0 0 1rpx rgba(91, 52, 23, 0.06);
}

.workspace-tabs__item {
  min-width: 132rpx;
  height: 84rpx;
  padding: 0 24rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-soft);
  font-size: 26rpx;
  font-weight: 700;
  transition: transform 180ms ease, background 220ms ease, color 220ms ease, box-shadow 220ms ease;
}

.workspace-tabs__item--active {
  background: linear-gradient(135deg, rgba(166, 222, 200, 0.96), rgba(241, 201, 143, 0.84));
  color: var(--ink);
  box-shadow: 0 14rpx 28rpx rgba(100, 70, 42, 0.12);
}

.workspace-tabs__item--pressed {
  transform: scale(0.97);
}

.workspace-unread {
  flex: 1;
  min-width: 0;
  height: 100rpx;
  padding: 0 24rpx;
  border-radius: 30rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: rgba(255, 255, 255, 0.74);
  color: var(--ink);
  box-shadow: inset 0 0 0 1rpx rgba(91, 52, 23, 0.05);
  transition: transform 180ms ease, background 220ms ease, box-shadow 220ms ease, opacity 180ms ease;
}

.workspace-unread--active {
  background: rgba(255, 255, 255, 0.92);
  box-shadow:
    inset 0 0 0 1rpx rgba(91, 52, 23, 0.05),
    0 14rpx 28rpx rgba(96, 68, 45, 0.12);
}

.workspace-unread--disabled {
  opacity: 0.72;
}

.workspace-unread--pressed {
  transform: scale(0.98);
}

.workspace-unread__copy {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.workspace-unread__label {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--ink);
}

.workspace-unread__text {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  line-height: 1.5;
  color: var(--ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workspace-unread__badge {
  min-width: 46rpx;
  height: 46rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #efb970, #de8653);
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.workspace-unread__arrow {
  flex-shrink: 0;
  font-size: 24rpx;
  color: var(--ink-soft);
  transition: transform 220ms ease, color 220ms ease;
}

.workspace-unread__arrow--open {
  transform: rotate(180deg);
  color: var(--ink);
}

.unread-panel {
  margin-bottom: 28rpx;
  padding: 24rpx;
}

.unread-panel__empty {
  padding: 18rpx 6rpx 4rpx;
  font-size: 22rpx;
  color: var(--ink-soft);
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.session-list--unread {
  gap: 16rpx;
}

@media screen and (max-width: 420px) {
  .workspace-bar__head,
  .workspace-bar__body {
    flex-direction: column;
  }

  .workspace-tabs {
    width: 100%;
  }

  .workspace-tabs__item {
    flex: 1;
    min-width: 0;
  }

  .workspace-unread {
    width: 100%;
    height: auto;
    min-height: 96rpx;
    padding: 18rpx 20rpx;
  }
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

.session-list-empty {
  padding: 28rpx 24rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--ink-soft);
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
