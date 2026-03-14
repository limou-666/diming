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
  await wait(page === 1 ? 180 : 260);
  const sorted = [...conversationState].sort(sortConversations);
  const start = (page - 1) * pageSize;
  const list = sorted.slice(start, start + pageSize).map(withContact);
  return {
    list,
    hasMore: start + pageSize < sorted.length,
    total: sorted.length
  };
}

export async function fetchConversationOverview() {
  await wait(120);
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
}

export async function fetchConversationBundle(conversationId) {
  await wait(180);
  const conversation = conversationState.find((item) => item.id === conversationId);
  if (!conversation) {
    return null;
  }
  return {
    conversation: withContact(conversation),
    contact: clone(getConversationContact(conversation)),
    messages: getMessages(conversationId)
  };
}

export async function fetchContact(contactId) {
  await wait(160);
  const contact = contactState.find((item) => item.id === contactId);
  return contact ? clone(contact) : null;
}

export async function fetchContactsByIds(contactIds = []) {
  await wait(140);
  const idSet = new Set(contactIds);
  return contactState.filter((item) => idSet.has(item.id)).map((item) => clone(item));
}

export async function fetchProfile() {
  await wait(120);
  return clone(profileState);
}

export function markConversationRead(conversationId) {
  const target = conversationState.find((item) => item.id === conversationId);
  if (target) {
    target.unreadCount = 0;
  }
}

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
