const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * 把不同来源的时间值统一转换成 `Date` 实例。
 *
 * @param {string | number | Date} value 原始时间值。
 * @returns {Date} 可直接参与格式化的日期对象。
 */
function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

/**
 * 将数字补齐为两位字符串，便于输出时间片段。
 *
 * @param {number | string} value 待补齐的数值。
 * @returns {string} 两位格式的字符串结果。
 */
function pad(value) {
  return `${value}`.padStart(2, '0');
}

/**
 * 按会话列表的展示规则格式化更新时间。
 *
 * @param {string | number | Date} value 原始时间值。
 * @returns {string} 用于会话卡片展示的时间文本。
 */
export function formatSessionTime(value) {
  const date = toDate(value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const sameYear = now.getFullYear() === date.getFullYear();
  const sameDay = now.toDateString() === date.toDateString();
  const yesterday = new Date(now.getTime() - ONE_DAY).toDateString() === date.toDateString();

  if (sameDay) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  if (yesterday) {
    return '昨天';
  }

  if (diff < 7 * ONE_DAY) {
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  }

  if (sameYear) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 格式化聊天气泡旁展示的时分时间。
 *
 * @param {string | number | Date} value 原始时间值。
 * @returns {string} `HH:mm` 格式的时间文本。
 */
export function formatChatTime(value) {
  const date = toDate(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
