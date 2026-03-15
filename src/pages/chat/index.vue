<template>
  <view class="chat-page">
    <view class="chat-page__inner">
      <AppHeader
        :title="contact?.nickname || '聊天详情'"
        :subtitle="contact ? `${contact.role} · 点击标题查看资料` : '正在加载会话'"
        rightLabel="资料"
        :titleClickable="true"
        @action="openContact"
        @titleclick="openContact"
      />

      <view v-if="loading" class="chat-loading panel">
        <text class="chat-loading__title">正在准备对话内容</text>
        <text class="chat-loading__text">Mock 数据、联系人资料与消息记录正在载入。</text>
      </view>

      <template v-else>
        <view class="chat-body">
          <scroll-view
            class="chat-scroll"
            scroll-y
            enhanced
            show-scrollbar="false"
            :scroll-top="scrollTop"
            :scroll-with-animation="scrollWithAnimation"
          >
            <view class="chat-banner panel">
              <text class="chat-banner__title">{{ contact.motto }}</text>
              <text class="chat-banner__text">支持文本与图片消息，发送后自动滚动，并保留轻量动画反馈。</text>
            </view>

            <view v-for="message in messages" :key="message.id" class="chat-message">
              <ChatBubble
                :message="message"
                :contact="contact"
                :current-user="currentUser"
                :show-feedback="message.id === latestFeedbackMessageId"
                @avatarclick="handleAvatarClick"
                @feedback="handleMessageFeedback"
                @layoutchange="handleBubbleLayoutChange"
              />
            </view>

            <view class="chat-bottom-spacer" />
          </scroll-view>

          <view class="composer panel">
            <button class="composer__tool" hover-class="composer__tool--active" @tap="sendImage">
              图
            </button>
            <input
              v-model="draft"
              class="composer__input"
              type="text"
              maxlength="200"
              confirm-type="send"
              :cursor-spacing="20"
              placeholder="输入消息，回车或点击发送"
              placeholder-class="composer__placeholder"
              @focus="handleComposerFocus"
              @confirm="handleSend"
            />
            <button class="composer__send" hover-class="composer__send--active" @tap="handleSend">
              <text class="composer__send-text">发送</text>
            </button>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import AppHeader from '@/components/AppHeader.vue';
import ChatBubble from '@/components/ChatBubble.vue';
import {
  appendMessage,
  buildMockReply,
  buildOutgoingImageMessage,
  buildOutgoingTextMessage,
  fetchConversationBundle,
  fetchProfile,
  markConversationRead,
  patchMessage
} from '@/mock';

const draft = ref('');
const loading = ref(true);
const conversationId = ref('');
const contact = ref(null);
const currentUser = ref(null);
const messages = ref([]);
const scrollTop = ref(0);
const scrollWithAnimation = ref(false);
const latestFeedbackMessageId = computed(() => {
  const currentUserId = currentUser.value?.id;
  if (!currentUserId) {
    return '';
  }

  for (let index = messages.value.length - 1; index >= 0; index -= 1) {
    const message = messages.value[index];
    if (message.senderId !== currentUserId && message.type === 'text') {
      return message.id;
    }
  }

  return '';
});

const imagePool = [
  { imageUrl: '/static/mock/book-future.svg', caption: '这张书单封面适合做图片消息演示。' },
  { imageUrl: '/static/mock/smart-city.svg', caption: '这张城市概念图可以模拟分享图片。' },
  { imageUrl: '/static/mock/travel-board.svg', caption: '这张情绪板适合演示图片卡片。' }
];

let imageIndex = 0;
let replyTimer = null;
let scrollTimers = [];
let feedbackTimers = [];

async function loadPage(id) {
  loading.value = true;
  const [bundle, profile] = await Promise.all([fetchConversationBundle(id), fetchProfile()]);
  if (!bundle) {
    loading.value = false;
    uni.showToast({
      title: '会话不存在',
      icon: 'none'
    });
    return;
  }

  contact.value = bundle.contact;
  currentUser.value = profile;
  messages.value = bundle.messages;
  markConversationRead(id);
  loading.value = false;
  await scrollToBottom(false);
}

function clearFreshState(message) {
  setTimeout(() => {
    const target = messages.value.find((item) => item.id === message.id);
    if (target) {
      target.isFresh = false;
      if (target.status === 'sending') {
        target.status = 'sent';
      }
    }
    patchMessage(conversationId.value, message.id, {
      isFresh: false,
      status: 'sent'
    });
  }, 320);
}

function patchLocalMessage(messageId, patch = {}) {
  const target = messages.value.find((item) => item.id === messageId);
  if (target) {
    Object.assign(target, patch);
  }
  patchMessage(conversationId.value, messageId, patch);
}

async function appendIncomingMessage(message) {
  messages.value = messages.value.concat(message);
  appendMessage(conversationId.value, message, { incrementUnread: false });
  await scrollToBottom(false);
  clearFreshState(message);
}

async function pushMessage(message, seedText = '') {
  messages.value = messages.value.concat(message);
  appendMessage(conversationId.value, message, { incrementUnread: false });
  await scrollToBottom(false);
  clearFreshState(message);
  if (seedText) {
    scheduleReply(seedText);
  }
}

function clearScrollTimers() {
  scrollTimers.forEach((timer) => clearTimeout(timer));
  scrollTimers = [];
}

function scheduleBottomSync(animated = true, delays = [80]) {
  clearScrollTimers();
  scrollTimers = delays.map((delay) =>
    setTimeout(async () => {
      scrollWithAnimation.value = animated;
      await nextTick();
      scrollTop.value += 1000000;
    }, delay)
  );
}

async function scrollToBottom(animated = true) {
  scrollWithAnimation.value = animated;
  await nextTick();
  scrollTop.value += 1000000;
  scheduleBottomSync(animated, [80, 220, 420]);
}

function handleComposerFocus() {
  scheduleBottomSync(false, [120, 260, 420]);
}

function handleBubbleLayoutChange() {
  scheduleBottomSync(false, [40, 160, 320]);
}

function handleAvatarClick(payload) {
  if (payload?.isSelf) {
    uni.navigateTo({
      url: '/pages/profile/index'
    });
    return;
  }

  openContact();
}

function handleMessageFeedback(payload) {
  const target = messages.value.find((item) => item.id === payload?.messageId);
  if (!target || !contact.value) {
    return;
  }

  if (payload.action === 'like') {
    patchLocalMessage(target.id, {
      liked: !target.liked
    });
    return;
  }

  if (payload.action !== 'reroll' || target.feedbackPending) {
    return;
  }

  patchLocalMessage(target.id, {
    feedbackPending: true
  });

  const timer = setTimeout(async () => {
    const seedText = target.content || target.caption || '';
    const reply = buildMockReply(contact.value.id, seedText);
    await appendIncomingMessage(reply);
    patchLocalMessage(target.id, {
      feedbackPending: false
    });
    feedbackTimers = feedbackTimers.filter((item) => item !== timer);
  }, 540);

  feedbackTimers.push(timer);
}

function handleSend() {
  const content = draft.value.trim();
  if (!content) {
    uni.showToast({
      title: '先输入一点内容',
      icon: 'none'
    });
    return;
  }
  draft.value = '';
  const message = buildOutgoingTextMessage(content, currentUser.value.id);
  pushMessage(message, content);
}

function sendImage() {
  const asset = imagePool[imageIndex % imagePool.length];
  imageIndex += 1;
  const message = buildOutgoingImageMessage(asset.imageUrl, asset.caption, currentUser.value.id);
  pushMessage(message, asset.caption);
}

function scheduleReply(seedText) {
  if (replyTimer) {
    clearTimeout(replyTimer);
  }
  replyTimer = setTimeout(async () => {
    const reply = buildMockReply(contact.value.id, seedText);
    await appendIncomingMessage(reply);
  }, 960);
}

function openContact() {
  if (!contact.value) {
    return;
  }
  uni.navigateTo({
    url: `/pages/contact/index?contactId=${contact.value.id}`
  });
}

onLoad(async (options) => {
  conversationId.value = options?.conversationId || 'cv_001';
  await loadPage(conversationId.value);
});

onUnload(() => {
  if (replyTimer) {
    clearTimeout(replyTimer);
  }
  feedbackTimers.forEach((timer) => clearTimeout(timer));
  feedbackTimers = [];
  clearScrollTimers();
});
</script>

<style scoped lang="scss">
.chat-page {
  min-height: var(--app-height, 100vh);
  height: var(--app-height, 100vh);
  overflow: hidden;
  padding: 0 30rpx;
  background:
    radial-gradient(circle at top, rgba(166, 222, 200, 0.28), transparent 34%),
    linear-gradient(180deg, #faf5ec 0%, #f5efe5 50%, #eef7f1 100%);
}

.chat-page__inner {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.chat-loading {
  margin-top: 18rpx;
  padding: 30rpx;
}

.chat-loading__title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ink);
}

.chat-loading__text {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--ink-soft);
}

.chat-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

.chat-banner {
  margin-bottom: 24rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, rgba(166, 222, 200, 0.62), rgba(255, 250, 244, 0.72));
}

.chat-banner__title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink);
}

.chat-banner__text {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: var(--ink-soft);
}

.chat-message {
  margin-bottom: 6rpx;
}

.chat-bottom-spacer {
  height: 24rpx;
}

.composer {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
  padding: 18rpx;
}

.composer__tool,
.composer__send {
  height: 88rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.composer__tool {
  width: 88rpx;
  background: rgba(255, 255, 255, 0.68);
  font-size: 26rpx;
  color: var(--ink);
}

.composer__send {
  min-width: 108rpx;
  padding: 0 22rpx;
  background: linear-gradient(135deg, #efbb72, #de8a58);
  color: #fff;
}

.composer__send-text {
  display: block;
  white-space: nowrap;
  font-size: 24rpx;
  line-height: 1.2;
}

.composer__tool--active,
.composer__send--active {
  transform: scale(0.96);
}

.composer__input {
  flex: 1;
  height: 88rpx;
  padding: 0 24rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.78);
  font-size: 26rpx;
  color: var(--ink);
}

.composer__placeholder {
  color: #ae9a89;
}

@supports (height: 100dvh) {
  .chat-page {
    height: 100dvh;
    min-height: 100dvh;
  }
}

@media screen and (max-width: 420px) {
  .chat-page {
    padding: 0 20rpx;
  }

  .chat-banner {
    margin-bottom: 20rpx;
    padding: 22rpx;
  }

  .composer {
    gap: 12rpx;
    padding: 14rpx;
    border-radius: 28rpx;
  }

  .composer__tool,
  .composer__send,
  .composer__input {
    height: 82rpx;
  }

  .composer__tool {
    width: 82rpx;
  }

  .composer__send {
    min-width: 96rpx;
    padding: 0 18rpx;
  }

  .composer__input {
    padding: 0 20rpx;
  }
}
</style>
