<template>
  <view class="chat-page">
    <view class="chat-page__inner page-reveal" :class="{ 'page-reveal--entered': pageRevealed }">
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
            <view class="chat-scroll__content">
              <view class="chat-banner panel">
                <text class="chat-banner__title">{{ contact.motto }}</text>
                <text class="chat-banner__text">支持文本与自选图片消息，发送后自动滚动，并保留轻量动画反馈。</text>
              </view>

              <view
                :key="`chat-messages-${layoutVersion}`"
                class="chat-messages"
                :class="{ 'chat-messages--anchored': composerAnchored }"
              >
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
              </view>
            </view>
          </scroll-view>

          <view class="composer panel">
            <button class="composer__tool" hover-class="composer__tool--active" @tap="sendImage">
              图
            </button>
            <input
              v-model="draft"
              :focus="composerFocused"
              class="composer__input"
              type="text"
              maxlength="200"
              confirm-type="send"
              :cursor-spacing="20"
              placeholder="输入消息，回车或点击发送"
              placeholder-class="composer__placeholder"
              @focus="handleComposerFocus"
              @blur="handleComposerBlur"
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
import { usePageReveal } from '@/composables/usePageReveal';
import {
  appendMessage,
  buildMockReply,
  buildOutgoingImageMessage,
  buildOutgoingTextMessage,
  fetchConversationBundle,
  fetchProfile,
  markConversationRead,
  patchMessage,
  primeContact,
  primeProfile
} from '@/mock';
import { navigateToPage } from '@/utils/navigation';

const draft = ref('');
const loading = ref(true);
const conversationId = ref('');
const contact = ref(null);
const currentUser = ref(null);
const messages = ref([]);
const scrollTop = ref(0);
const scrollWithAnimation = ref(false);
const composerFocused = ref(false);
const composerAnchored = ref(false);
const keyboardHeight = ref(0);
const keyboardVisible = ref(false);
const baseWindowHeight = ref(0);
const currentWindowHeight = ref(0);
const layoutVersion = ref(0);
const { pageRevealed } = usePageReveal();
const KEYBOARD_RESIZE_THRESHOLD = 80;
const KEYBOARD_SYNC_DELAYS = [0, 80, 180, 320];
const DEFAULT_SYNC_DELAYS = [80, 220, 420];
const BLUR_SYNC_DELAYS = [0, 120, 260, 420, 620];

/**
 * 反馈操作只挂在最新一条来自对方的文本消息上。
 */
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

let replyTimer = null;
let scrollTimers = [];
let feedbackTimers = [];
let keyboardListenersBound = false;

/**
 * 首次进入聊天页时并行加载会话数据和当前用户资料。
 *
 * @param {string} id 会话 ID。
 * @returns {Promise<void>}
 */
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

/**
 * 新消息的入场动画结束后，把临时状态回写成稳定状态。
 *
 * @param {Object} message 需要清理临时状态的消息对象。
 */
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

/**
 * 同时更新当前页面里的消息对象和 mock 存储中的消息对象。
 *
 * @param {string} messageId 消息 ID。
 * @param {Object} [patch={}] 需要合并到消息上的字段。
 */
function patchLocalMessage(messageId, patch = {}) {
  const target = messages.value.find((item) => item.id === messageId);
  if (target) {
    Object.assign(target, patch);
  }
  patchMessage(conversationId.value, messageId, patch);
}

/**
 * 统一处理来自对方的新消息追加，自动滚到底并清理 fresh 状态。
 *
 * @param {Object} message 需要插入列表的消息对象。
 * @returns {Promise<void>}
 */
async function appendIncomingMessage(message) {
  messages.value = messages.value.concat(message);
  appendMessage(conversationId.value, message, { incrementUnread: false });
  await scrollToBottom(false);
  clearFreshState(message);
}

/**
 * 统一处理当前用户发送出的消息，追加到本地列表后按需安排自动回复。
 *
 * @param {Object} message 待发送的消息对象。
 * @param {string} [seedText=''] 用于生成后续 mock 回复的种子文本。
 * @returns {Promise<void>}
 */
async function pushMessage(message, seedText = '') {
  messages.value = messages.value.concat(message);
  appendMessage(conversationId.value, message, { incrementUnread: false });
  await scrollToBottom(false);
  clearFreshState(message);
  if (seedText) {
    scheduleReply(seedText);
  }
}

/**
 * 清理所有尚未执行的滚动同步定时器，避免重复触发滚动。
 */
function clearScrollTimers() {
  scrollTimers.forEach((timer) => clearTimeout(timer));
  scrollTimers = [];
}

/**
 * 控制消息区是否贴底布局，并在退出贴底时强制重建列表布局。
 *
 * @param {boolean} nextValue 下一帧是否需要贴底。
 */
function setComposerAnchored(nextValue) {
  const wasAnchored = composerAnchored.value;
  if (composerAnchored.value === nextValue) {
    return;
  }

  composerAnchored.value = nextValue;
  if (wasAnchored && !nextValue) {
    layoutVersion.value += 1;
  }
}

/**
 * 查询聊天滚动容器与内容区域尺寸，用于判断当前是否需要强制贴底。
 *
 * @returns {Promise<{ scrollRect?: UniApp.NodeInfo, contentRect?: UniApp.NodeInfo }>}
 */
function queryChatLayout() {
  return new Promise((resolve) => {
    const query = uni.createSelectorQuery();
    query.select('.chat-scroll').boundingClientRect();
    query.select('.chat-scroll__content').boundingClientRect();
    query.exec((result) => {
      resolve({
        scrollRect: result?.[0],
        contentRect: result?.[1]
      });
    });
  });
}

/**
 * 将平台回调里的尺寸值规整为非负整数像素。
 *
 * @param {number} value 原始尺寸值。
 * @returns {number} 规整后的尺寸值。
 */
function normalizeDimension(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

/**
 * 兼容不同平台的 resize 回调结构，统一提取窗口高度。
 *
 * @param {Object | null} [snapshot=null] 平台回调提供的窗口尺寸快照。
 * @returns {number} 当前可用的窗口高度。
 */
function getWindowHeight(snapshot = null) {
  const resizeHeight = snapshot?.size?.windowHeight ?? snapshot?.windowHeight ?? snapshot?.height;
  const normalizedResizeHeight = normalizeDimension(resizeHeight);
  if (normalizedResizeHeight > 0) {
    return normalizedResizeHeight;
  }

  if (typeof uni.getWindowInfo === 'function') {
    const windowInfo = uni.getWindowInfo();
    const normalizedWindowHeight = normalizeDimension(windowInfo?.windowHeight);
    if (normalizedWindowHeight > 0) {
      return normalizedWindowHeight;
    }
  }

  if (typeof uni.getSystemInfoSync === 'function') {
    const systemInfo = uni.getSystemInfoSync();
    return normalizeDimension(systemInfo?.windowHeight);
  }

  return 0;
}

/**
 * 同步键盘显隐和窗口高度状态，并在缺少键盘高度回调时用窗口缩小做兜底判断。
 *
 * @param {{ height?: number, windowHeight?: number }} [options={}] 当前键盘高度与窗口高度。
 * @returns {boolean} 键盘当前是否处于可见状态。
 */
function syncKeyboardState({
  height = keyboardHeight.value,
  windowHeight = currentWindowHeight.value,
  forceClosed = false
} = {}) {
  const nextKeyboardHeight = normalizeDimension(height);
  const nextWindowHeight = normalizeDimension(windowHeight) || currentWindowHeight.value || getWindowHeight();
  const hasBaseHeight = baseWindowHeight.value > 0;
  const fallbackVisible = Boolean(
    hasBaseHeight && nextWindowHeight && nextWindowHeight < baseWindowHeight.value - KEYBOARD_RESIZE_THRESHOLD
  );
  const nextVisible = forceClosed ? nextKeyboardHeight > 0 : nextKeyboardHeight > 0 || fallbackVisible;

  keyboardHeight.value = nextKeyboardHeight;
  currentWindowHeight.value = nextWindowHeight;
  keyboardVisible.value = nextVisible;

  if ((!hasBaseHeight && nextWindowHeight > 0 && !nextVisible) || (!nextVisible && nextWindowHeight > 0)) {
    baseWindowHeight.value = nextWindowHeight;
  }

  return nextVisible;
}

/**
 * 根据当前贴底状态同步滚动位置；内容不足一屏时会先重置滚动值以触发刷新。
 *
 * @param {boolean} [animated=true] 是否启用滚动动画。
 * @returns {Promise<void>}
 */
async function syncBottomPosition(animated = true) {
  const shouldAnchorToBottom = composerAnchored.value;
  await nextTick();

  if (!shouldAnchorToBottom) {
    const { scrollRect, contentRect } = await queryChatLayout();
    if (scrollRect && contentRect && contentRect.height <= scrollRect.height + 1) {
      scrollWithAnimation.value = false;
      scrollTop.value += 1;
      await nextTick();
      scrollTop.value = 0;
      return;
    }
  }

  scrollWithAnimation.value = animated && !keyboardVisible.value;
  await nextTick();
  scrollTop.value += 1000000;
}

/**
 * 响应键盘高度变化，更新页面贴底态并安排后续滚动同步。
 *
 * @param {{ height?: number }} [event={}] 键盘高度变化事件。
 */
function handleKeyboardHeightChange(event = {}) {
  const nextKeyboardHeight = normalizeDimension(event?.height);
  const nextVisible = syncKeyboardState({
    height: nextKeyboardHeight,
    windowHeight: getWindowHeight(),
    forceClosed: nextKeyboardHeight === 0
  });
  setComposerAnchored(nextVisible);
  if (!nextVisible) {
    composerFocused.value = false;
  }
  scheduleBottomSync(false, nextVisible ? KEYBOARD_SYNC_DELAYS : BLUR_SYNC_DELAYS);
}

/**
 * 响应窗口尺寸变化，兼容键盘弹起或收起时的布局调整。
 *
 * @param {Object} [event={}] 平台 resize 事件快照。
 */
function handleWindowResize(event = {}) {
  const nextWindowHeight = getWindowHeight(event);
  const nextVisible = syncKeyboardState({
    windowHeight: nextWindowHeight,
    forceClosed: !composerAnchored.value
  });
  setComposerAnchored(nextVisible);
  if (!nextVisible && keyboardHeight.value === 0) {
    composerFocused.value = false;
  }
  scheduleBottomSync(false, nextVisible ? KEYBOARD_SYNC_DELAYS : BLUR_SYNC_DELAYS);
}

/**
 * 注册键盘与窗口尺寸监听，并记录初始高度作为键盘判断基准。
 */
function bindKeyboardListeners() {
  if (keyboardListenersBound) {
    return;
  }

  const initialWindowHeight = getWindowHeight();
  currentWindowHeight.value = initialWindowHeight;
  baseWindowHeight.value = initialWindowHeight;
  syncKeyboardState({
    height: 0,
    windowHeight: initialWindowHeight
  });

  if (typeof uni.onKeyboardHeightChange === 'function') {
    uni.onKeyboardHeightChange(handleKeyboardHeightChange);
  }

  if (typeof uni.onWindowResize === 'function') {
    uni.onWindowResize(handleWindowResize);
  }

  keyboardListenersBound = true;
}

/**
 * 注销键盘与窗口尺寸监听，避免页面销毁后残留回调。
 */
function unbindKeyboardListeners() {
  if (!keyboardListenersBound) {
    return;
  }

  if (typeof uni.offKeyboardHeightChange === 'function') {
    uni.offKeyboardHeightChange(handleKeyboardHeightChange);
  }

  if (typeof uni.offWindowResize === 'function') {
    uni.offWindowResize(handleWindowResize);
  }

  keyboardListenersBound = false;
}

/**
 * 在多个时间点重复同步到底部，兼容图片加载和键盘弹起造成的高度变化。
 *
 * @param {boolean} [animated=true] 是否启用滚动动画。
 * @param {number[]} [delays=[80]] 每次同步的延迟时间。
 */
function scheduleBottomSync(animated = true, delays = DEFAULT_SYNC_DELAYS) {
  clearScrollTimers();
  const nextAnimated = animated && !keyboardVisible.value;
  scrollTimers = delays.map((delay) =>
    setTimeout(() => {
      syncBottomPosition(nextAnimated);
    }, delay)
  );
}

/**
 * 立即请求滚动到底部，并追加几次兜底同步。
 *
 * @param {boolean} [animated=true] 是否启用滚动动画。
 * @returns {Promise<void>}
 */
async function scrollToBottom(animated = true) {
  const nextAnimated = animated && !keyboardVisible.value;
  await syncBottomPosition(nextAnimated);
  scheduleBottomSync(nextAnimated, DEFAULT_SYNC_DELAYS);
}

/**
 * 输入框聚焦时先同步一次窗口状态，再安排多次贴底兜底。
 */
function handleComposerFocus() {
  composerFocused.value = true;
  syncKeyboardState({
    windowHeight: getWindowHeight()
  });
  scheduleBottomSync(false, KEYBOARD_SYNC_DELAYS);
}

/**
 * 输入框失焦后逐步关闭贴底状态，兼容不同平台键盘收起节奏。
 */
function handleComposerBlur() {
  composerFocused.value = false;
  setComposerAnchored(false);
  clearScrollTimers();
  scrollTimers = BLUR_SYNC_DELAYS.map((delay) =>
    setTimeout(() => {
      syncKeyboardState({
        height: 0,
        windowHeight: getWindowHeight(),
        forceClosed: true
      });
      setComposerAnchored(false);
      syncBottomPosition(false);
    }, delay)
  );
}

/**
 * 气泡内容高度变化时重新安排贴底同步，主要用于图片消息加载完成后。
 */
function handleBubbleLayoutChange() {
  scheduleBottomSync(false, KEYBOARD_SYNC_DELAYS);
}

/**
 * 根据点击的是自己还是对方头像，跳转到对应的资料页。
 *
 * @param {{ isSelf?: boolean }} payload 头像点击事件透传的数据。
 */
function handleAvatarClick(payload) {
  if (payload?.isSelf) {
    primeProfile();
    navigateToPage('/pages/profile/index');
    return;
  }

  openContact();
}

/**
 * 处理单条消息下方的反馈动作，包括点赞和“再来一条”。
 *
 * @param {{ action: string, messageId: string }} payload 由消息气泡抛出的反馈动作。
 */
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

/**
 * 发送当前输入框中的文本消息；空内容时直接提示并终止。
 */
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

/**
 * 调起系统选图面板，允许用户从相册或相机中选择一张图片。
 *
 * @returns {Promise<{ tempFilePaths?: string[], tempFiles?: Array }>}
 */
function chooseUserImage() {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: resolve,
      fail: reject
    });
  });
}

/**
 * 基于用户所选文件生成一条简短的图片说明，避免直接展示过长文件名。
 *
 * @param {string} filePath 本地临时图片路径。
 * @param {string} [fileName=''] 选图接口返回的原始文件名。
 * @returns {string} 用于图片消息卡片展示的说明文字。
 */
function buildSelectedImageCaption(filePath, fileName = '') {
  const sourceName = fileName || filePath.split('/').pop() || '';
  const normalizedName = sourceName.replace(/\.[^.]+$/, '').trim();
  if (!normalizedName) {
    return '我上传了一张图片';
  }

  const shortName = normalizedName.length > 12 ? `${normalizedName.slice(0, 12)}...` : normalizedName;
  return `图片：${shortName}`;
}

/**
 * 发送用户自行选择的图片，不再使用固定 mock 图片池。
 *
 * @returns {Promise<void>}
 */
async function sendImage() {
  try {
    const result = await chooseUserImage();
    const imageUrl = result?.tempFilePaths?.[0];
    if (!imageUrl) {
      return;
    }

    const caption = buildSelectedImageCaption(imageUrl, result?.tempFiles?.[0]?.name);
    const message = buildOutgoingImageMessage(imageUrl, caption, currentUser.value.id);
    await pushMessage(message, caption);
  } catch (error) {
    const errorMessage = String(error?.errMsg || error?.message || '');
    if (errorMessage.toLowerCase().includes('cancel')) {
      return;
    }

    uni.showToast({
      title: '选图失败，请重试',
      icon: 'none'
    });
  }
}

/**
 * 模拟联系人稍后回复的节奏，并复用统一的追加逻辑。
 *
 * @param {string} seedText 用于生成回复上下文的种子文本。
 */
function scheduleReply(seedText) {
  if (replyTimer) {
    clearTimeout(replyTimer);
  }
  replyTimer = setTimeout(async () => {
    const reply = buildMockReply(contact.value.id, seedText);
    await appendIncomingMessage(reply);
  }, 960);
}

/**
 * 打开当前聊天对象的联系人资料页。
 */
function openContact() {
  if (!contact.value) {
    return;
  }
  primeContact(contact.value.id);
  navigateToPage(`/pages/contact/index?contactId=${contact.value.id}`);
}

onLoad(async (options) => {
  bindKeyboardListeners();
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
  unbindKeyboardListeners();
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

.chat-scroll__content {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.chat-messages--anchored {
  justify-content: flex-end;
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
