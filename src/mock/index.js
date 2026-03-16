import contactsSource from './data/contacts.json';
import conversationsSource from './data/conversations.json';
import messagesSource from './data/messages.json';
import profileSource from './data/profile.json';

/**
 * 通过 JSON 序列化做简单深拷贝，避免 mock 状态被外部直接改写。
 *
 * @param {any} value 待拷贝的数据。
 * @returns {any} 拷贝后的新对象。
 */
const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * 模拟接口请求的基础延时。
 *
 * @param {number} [ms=180] 延迟时长。
 * @returns {Promise<void>} 延迟结束后的 Promise。
 */
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

/**
 * 生成联系人 ID 到联系人对象的映射，便于后续按需查找。
 *
 * @returns {Map<string, Object>} 当前联系人数据映射表。
 */
function getContactsMap() {
  return new Map(contactState.map((item) => [item.id, item]));
}

/**
 * 根据会话信息补出关联的联系人对象。
 *
 * @param {{ contactId: string }} conversation 会话对象。
 * @returns {Object | undefined} 命中的联系人对象。
 */
function getConversationContact(conversation) {
  return getContactsMap().get(conversation.contactId);
}

/**
 * 会话列表排序规则：严格按最近更新时间倒序。
 *
 * @param {Object} left 左侧会话。
 * @param {Object} right 右侧会话。
 * @returns {number} 排序结果。
 */
function sortConversations(left, right) {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

/**
 * 为会话快照补充联系人信息，生成页面可直接消费的数据结构。
 *
 * @param {Object} conversation 原始会话对象。
 * @returns {Object} 带联系人字段的会话快照。
 */
function withContact(conversation) {
  return {
    ...clone(conversation),
    contact: clone(getConversationContact(conversation))
  };
}

/**
 * 生成会话列表里展示的最后一条消息预览文本。
 *
 * @param {Object} message 消息对象。
 * @returns {string} 用于列表展示的预览文案。
 */
function buildPreview(message) {
  if (message.type === 'image') {
    return message.caption || '发送了一张图片';
  }
  return message.content || '';
}

/**
 * 读取并深拷贝指定会话的消息列表。
 *
 * @param {string} conversationId 会话 ID。
 * @returns {Array} 该会话的消息快照。
 */
function getMessages(conversationId) {
  return clone(messageState[conversationId] || []);
}

/**
 * 分页读取会话列表，并补充列表页所需的联系人数据。
 *
 * @param {number} [page=1] 页码。
 * @param {number} [pageSize=6] 每页条数。
 * @returns {Promise<{ list: Array, hasMore: boolean, total: number }>} 当前分页结果。
 */
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

/**
 * 汇总会话首页顶部统计卡片需要的概览数据。
 *
 * @returns {Promise<{ total: number, unreadTotal: number, activeCount: number }>} 会话概览统计。
 */
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

/**
 * 按联系人 ID 读取联系人详情数据。
 *
 * @param {string} contactId 联系人 ID。
 * @returns {Promise<Object | null>} 联系人详情；不存在时返回 `null`。
 */
export async function fetchContact(contactId) {
  return resolveCached(`contact:${contactId}`, () => {
    const contact = contactState.find((item) => item.id === contactId);
    return contact ? clone(contact) : null;
  }, 160);
}

/**
 * 按联系人 ID 批量读取联系人数据，并自动去重。
 *
 * @param {string[]} [contactIds=[]] 联系人 ID 列表。
 * @returns {Promise<Array>} 命中的联系人快照列表。
 */
export async function fetchContactsByIds(contactIds = []) {
  const key = [...new Set(contactIds)].sort().join(',');
  return resolveCached(`contacts:${key}`, () => {
    const idSet = new Set(contactIds);
    return contactState.filter((item) => idSet.has(item.id)).map((item) => clone(item));
  }, 140);
}

/**
 * 读取当前用户资料快照。
 *
 * @returns {Promise<Object>} 当前用户资料。
 */
export async function fetchProfile() {
  return resolveCached('profile', () => clone(profileState), 120);
}

/**
 * 将指定会话标记为已读，并刷新相关缓存。
 *
 * @param {string} conversationId 会话 ID。
 * @returns {void}
 */
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

/**
 * 给指定消息打补丁，常用于同步发送态、点赞态等局部字段。
 *
 * @param {string} conversationId 会话 ID。
 * @param {string} messageId 消息 ID。
 * @param {Object} [patch={}] 需要合并到消息上的字段。
 * @returns {void}
 */
export function patchMessage(conversationId, messageId, patch = {}) {
  const bucket = messageState[conversationId] || [];
  const target = bucket.find((item) => item.id === messageId);
  if (!target) {
    return;
  }
  Object.assign(target, clone(patch));
  invalidateFetchCache();
}

/**
 * 构造一条当前用户发出的文本消息草稿。
 *
 * @param {string} content 消息正文。
 * @param {string} [senderId=profileState.id] 发送者 ID。
 * @returns {Object} 带临时发送状态的文本消息对象。
 */
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

/**
 * 构造一条当前用户发出的图片消息草稿。
 *
 * @param {string} imageUrl 图片地址。
 * @param {string} [caption='我发来了一张图片'] 图片说明。
 * @param {string} [senderId=profileState.id] 发送者 ID。
 * @returns {Object} 带临时发送状态的图片消息对象。
 */
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
  const hint = seedText.trim().slice(0, 10);
  const reply = list[Math.floor(Math.random() * list.length)];
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    senderId: contactId,
    type: 'text',
    content: hint ? `${reply} 你刚提到“${hint}”。` : reply,
    createdAt: new Date().toISOString(),
    status: 'sent',
    isFresh: true
  };
}

/**
 * 根据联系人 ID 反查其所属会话 ID。
 *
 * @param {string} contactId 联系人 ID。
 * @returns {string} 命中的会话 ID；未命中时返回空字符串。
 */
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
