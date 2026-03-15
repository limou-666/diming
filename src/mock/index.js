import contactsSource from './data/contacts.json';
import conversationsSource from './data/conversations.json';
import messagesSource from './data/messages.json';
import profileSource from './data/profile.json';

const clone = (value) => JSON.parse(JSON.stringify(value));
const wait = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

let contactState = clone(contactsSource);
let conversationState = clone(conversationsSource);
let messageState = clone(messagesSource);
let profileState = clone(profileSource);
const fetchCache = new Map();
const pendingFetches = new Map();

let cacheVersion = 0;

/**
 * 任意写操作后统一清空读取缓存，保证后续读取拿到最新快照。
 */
function invalidateFetchCache() {
  cacheVersion += 1;
  fetchCache.clear();
  pendingFetches.clear();
}

/**
 * 带缓存和并发去重的读取封装。
 *
 * @param {string} key 当前请求的缓存键。
 * @param {() => any} load 实际构建数据快照的函数。
 * @param {number} [delay=0] 模拟接口延迟，命中缓存时会跳过。
 * @returns {Promise<any>} 深拷贝后的读取结果。
 */
async function resolveCached(key, load, delay = 0) {
  if (fetchCache.has(key)) {
    return clone(fetchCache.get(key));
  }

  const requestKey = `${cacheVersion}:${key}`;
  if (!pendingFetches.has(requestKey)) {
    const requestVersion = cacheVersion;
    pendingFetches.set(
      requestKey,
      (async () => {
        if (delay) {
          await wait(delay);
        }
        const value = load();
        if (requestVersion === cacheVersion) {
          fetchCache.set(key, value);
        }
        return value;
      })()
    );
  }

  try {
    const value = await pendingFetches.get(requestKey);
    return clone(value);
  } finally {
    pendingFetches.delete(requestKey);
  }
}

const replyPools = {
  ct_001: [
    '我先把你的重点收成 3 个关键词，再顺着给建议。',
    '这个方向可以继续，我建议下一条先补限制条件。',
    '如果你愿意，我可以把刚才的内容整理成更清楚的行动版。'
  ],
  ct_002: [
    '这一版气质已经对了，下一步更该收紧对比度。',
    '我建议保留暖白底，不要让色块把阅读区压住。',
    '如果想更高级，先减少装饰，再强化留白。'
  ],
  ct_003: [
    '这件事先别扩范围，先把第一条主链路闭环。',
    '我会建议先确定 MVP 边界，再决定补哪些细节。',
    '你现在最需要的是优先级，不是功能清单。'
  ],
  default: [
    '这个点我已经记住了，下一步可以继续往细节推进。',
    '我理解你的目标了，可以再补一个限制条件，我会给得更准。',
    '当前方向成立，我建议继续把使用场景讲具体一点。'
  ]
};

function getContactsMap() {
  return new Map(contactState.map((item) => [item.id, item]));
}

function getConversationContact(conversation) {
  return getContactsMap().get(conversation.contactId);
}

/**
 * 会话列表排序规则：置顶优先，其次按最近更新时间倒序。
 *
 * @param {Object} left 左侧会话。
 * @param {Object} right 右侧会话。
 * @returns {number} 排序结果。
 */
function sortConversations(left, right) {
  if (left.pinned !== right.pinned) {
    return left.pinned ? -1 : 1;
  }
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

function withContact(conversation) {
  return {
    ...clone(conversation),
    contact: clone(getConversationContact(conversation))
  };
}

function buildPreview(message) {
  if (message.type === 'image') {
    return message.caption || '发送了一张图片';
  }
  return message.content || '';
}

function getMessages(conversationId) {
  return clone(messageState[conversationId] || []);
}

export async function fetchPagedConversations(page = 1, pageSize = 6) {
  return resolveCached(
    `paged:${page}:${pageSize}`,
    () => {
      const sorted = [...conversationState].sort(sortConversations);
      const start = (page - 1) * pageSize;
      const list = sorted.slice(start, start + pageSize).map(withContact);
      return {
        list,
        hasMore: start + pageSize < sorted.length,
        total: sorted.length
      };
    },
    page === 1 ? 180 : 260
  );
}

/**
 * 读取全部未读会话，并保持与主会话列表一致的排序规则。
 *
 * @returns {Promise<Array>} 按默认会话排序返回的未读会话列表。
 */
export async function fetchUnreadConversations() {
  return resolveCached(
    'unread',
    () =>
      [...conversationState]
        .filter((item) => item.unreadCount > 0)
        .sort(sortConversations)
        .map(withContact),
    140
  );
}

export async function fetchConversationOverview() {
  return resolveCached('overview', () => {
    const total = conversationState.length;
    const unreadTotal = conversationState.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
    const activeCount = conversationState.reduce((sum, item) => {
      const contact = getConversationContact(item);
      return sum + (contact?.status === '在线' ? 1 : 0);
    }, 0);

    return {
      total,
      unreadTotal,
      activeCount
    };
  }, 120);
}

/**
 * 组装聊天页首屏所需的完整数据包。
 *
 * @param {string} conversationId 会话 ID。
 * @returns {Promise<{conversation: Object, contact: Object, messages: Array} | null>} 聊天页所需的会话、联系人与消息数据。
 */
export async function fetchConversationBundle(conversationId) {
  return resolveCached(`bundle:${conversationId}`, () => {
    const conversation = conversationState.find((item) => item.id === conversationId);
    if (!conversation) {
      return null;
    }
    return {
      conversation: withContact(conversation),
      contact: clone(getConversationContact(conversation)),
      messages: getMessages(conversationId)
    };
  }, 180);
}

export async function fetchContact(contactId) {
  return resolveCached(`contact:${contactId}`, () => {
    const contact = contactState.find((item) => item.id === contactId);
    return contact ? clone(contact) : null;
  }, 160);
}

export async function fetchContactsByIds(contactIds = []) {
  const key = [...new Set(contactIds)].sort().join(',');
  return resolveCached(`contacts:${key}`, () => {
    const idSet = new Set(contactIds);
    return contactState.filter((item) => idSet.has(item.id)).map((item) => clone(item));
  }, 140);
}

export async function fetchProfile() {
  return resolveCached('profile', () => clone(profileState), 120);
}

export function markConversationRead(conversationId) {
  const target = conversationState.find((item) => item.id === conversationId);
  if (target) {
    target.unreadCount = 0;
    invalidateFetchCache();
  }
}

/**
 * 追加一条消息，并同步更新会话列表里的预览信息。
 *
 * @param {string} conversationId 会话 ID。
 * @param {Object} message 新消息对象。
 * @param {{ incrementUnread?: boolean }} [options={}] 追加时的附加选项。
 */
export function appendMessage(conversationId, message, options = {}) {
  const { incrementUnread = false } = options;
  const bucket = messageState[conversationId] || [];
  bucket.push(clone(message));
  messageState[conversationId] = bucket;

  const target = conversationState.find((item) => item.id === conversationId);
  if (!target) {
    return;
  }

  target.lastMessage = buildPreview(message);
  target.lastMessageType = message.type;
  target.updatedAt = message.createdAt;
  if (incrementUnread) {
    target.unreadCount += 1;
  }

  invalidateFetchCache();
}

export function patchMessage(conversationId, messageId, patch = {}) {
  const bucket = messageState[conversationId] || [];
  const target = bucket.find((item) => item.id === messageId);
  if (!target) {
    return;
  }
  Object.assign(target, clone(patch));
  invalidateFetchCache();
}

export function buildOutgoingTextMessage(content, senderId = profileState.id) {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    senderId,
    type: 'text',
    content,
    createdAt: new Date().toISOString(),
    status: 'sending',
    isFresh: true
  };
}

export function buildOutgoingImageMessage(imageUrl, caption = '我发来了一张图片', senderId = profileState.id) {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    senderId,
    type: 'image',
    imageUrl,
    caption,
    createdAt: new Date().toISOString(),
    status: 'sending',
    isFresh: true
  };
}

/**
 * 生成联系人的一条 mock 跟进回复，可选地带上用户刚提到的提示词。
 *
 * @param {string} contactId 联系人 ID。
 * @param {string} [seedText=''] 用于拼接回复上下文的种子文本。
 * @returns {Object} 新生成的联系人文本消息。
 */
export function buildMockReply(contactId, seedText = '') {
  const list = replyPools[contactId] || replyPools.default;
  const target = contactState.find((item) => item.id === contactId);
  const hint = seedText.trim().slice(0, 10);
  const reply = list[Math.floor(Math.random() * list.length)];
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    senderId: contactId,
    type: 'text',
    content: hint ? `${reply} 你刚提到“${hint}”。` : reply,
    createdAt: new Date().toISOString(),
    status: 'sent',
    isFresh: true,
    senderName: target?.nickname || ''
  };
}

export function getConversationIdByContact(contactId) {
  const contact = contactState.find((item) => item.id === contactId);
  return contact?.conversationId || '';
}

/**
 * 路由跳转前预热聊天页数据。
 *
 * @param {string} conversationId 会话 ID。
 * @returns {Promise<void>}
 */
export function primeConversationBundle(conversationId) {
  return fetchConversationBundle(conversationId).then(() => undefined);
}

/**
 * 路由跳转前预热联系人详情数据。
 *
 * @param {string} contactId 联系人 ID。
 * @returns {Promise<void>}
 */
export function primeContact(contactId) {
  return fetchContact(contactId).then(() => undefined);
}

/**
 * 路由跳转前预热个人资料数据。
 *
 * @returns {Promise<void>}
 */
export function primeProfile() {
  return fetchProfile().then(() => undefined);
}
