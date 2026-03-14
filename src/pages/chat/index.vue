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
        <scroll-view
          class="chat-scroll"
          scroll-y
          enhanced
          show-scrollbar="false"
          :scroll-into-view="scrollAnchor"
          :scroll-with-animation="true"
        >
          <view class="chat-banner panel">
            <text class="chat-banner__title">{{ contact.motto }}</text>
            <text class="chat-banner__text">支持文本与图片消息，发送后自动滚动，并保留轻量动画反馈。</text>
          </view>

          <view v-for="message in messages" :id="`msg-${message.id}`" :key="message.id" class="chat-message">
            <ChatBubble :message="message" :contact="contact" :current-user="currentUser" />
          </view>

          <view id="scroll-bottom" class="chat-bottom-anchor" />
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
            placeholder="输入消息，回车或点击发送"
            placeholder-class="composer__placeholder"
            @confirm="handleSend"
          />
          <button class="composer__send" hover-class="composer__send--active" @tap="handleSend">
            发送
          </button>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup>
import { nextTick, ref } from 'vue';
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
  markConversationRead
} from '@/mock';

const draft = ref('');
const loading = ref(true);
const conversationId = ref('');
const conversation = ref(null);
const contact = ref(null);
const currentUser = ref(null);
const messages = ref([]);
const scrollAnchor = ref('scroll-bottom');

const imagePool = [
  { imageUrl: '/static/mock/book-future.svg', caption: '这张书单封面适合做图片消息演示。' },
  { imageUrl: '/static/mock/smart-city.svg', caption: '这张城市概念图可以模拟分享图片。' },
  { imageUrl: '/static/mock/travel-board.svg', caption: '这张情绪板适合演示图片卡片。' }
];

let imageIndex = 0;
let replyTimer = null;

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

  conversation.value = bundle.conversation;
  contact.value = bundle.contact;
  currentUser.value = profile;
  messages.value = bundle.messages;
  markConversationRead(id);
  loading.value = false;
  await nextTick();
  scrollToBottom(false);
}

function clearFreshState(message) {
  setTimeout(() => {
    message.isFresh = false;
    if (message.status === 'sending') {
      message.status = 'sent';
    }
  }, 320);
}

async function pushMessage(message, seedText = '') {
  messages.value = messages.value.concat(message);
  appendMessage(conversationId.value, message, { incrementUnread: false });
  await nextTick();
  scrollToBottom(true);
  clearFreshState(message);
  if (seedText) {
    scheduleReply(seedText);
  }
}

function scrollToBottom(animated = true) {
  const lastMessage = messages.value[messages.value.length - 1];
  scrollAnchor.value = animated && lastMessage ? `msg-${lastMessage.id}` : 'scroll-bottom';
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
    messages.value = messages.value.concat(reply);
    appendMessage(conversationId.value, reply, { incrementUnread: false });
    await nextTick();
    scrollToBottom(true);
    clearFreshState(reply);
  }, 960);
}

function openContact() {
  if (!contact.value) {
    return;
  }
  uni.navigateTo({
    url: `/pages/contact/index?contactId=${contact.value.id}&conversationId=${conversationId.value}`
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
});
</script>

<style scoped lang="scss">
.chat-page {
  min-height: 100vh;
  padding: 0 30rpx 24rpx;
  background:
    radial-gradient(circle at top, rgba(166, 222, 200, 0.28), transparent 34%),
    linear-gradient(180deg, #faf5ec 0%, #f5efe5 50%, #eef7f1 100%);
}

.chat-page__inner {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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
  padding-bottom: 12rpx;
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

.chat-bottom-anchor {
  height: 2rpx;
}

.composer {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 18rpx;
  padding: 18rpx;
}

.composer__tool,
.composer__send {
  width: 88rpx;
  height: 88rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
}

.composer__tool {
  background: rgba(255, 255, 255, 0.68);
  color: var(--ink);
}

.composer__send {
  background: linear-gradient(135deg, #efbb72, #de8a58);
  color: #fff;
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
</style>