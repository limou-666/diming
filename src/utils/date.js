const ONE_DAY = 24 * 60 * 60 * 1000;

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function pad(value) {
  return `${value}`.padStart(2, '0');
}

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

export function formatChatTime(value) {
  const date = toDate(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatFullDate(value) {
  const date = toDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}