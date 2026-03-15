import { ref } from 'vue';
import { fetchConversationOverview, fetchPagedConversations, fetchUnreadConversations } from '@/mock';

/**
 * 管理会话列表的分页、刷新和概览统计。
 *
 * @param {number} pageSize 每页加载的会话数量。
 * @returns {{
 *   sessions: import('vue').Ref<Array>,
 *   unreadSessions: import('vue').Ref<Array>,
 *   total: import('vue').Ref<number>,
 *   unreadTotal: import('vue').Ref<number>,
 *   activeCount: import('vue').Ref<number>,
 *   loading: import('vue').Ref<boolean>,
 *   refreshing: import('vue').Ref<boolean>,
 *   hasMore: import('vue').Ref<boolean>,
 *   loadInitial: () => Promise<void>,
 *   refresh: () => Promise<void>,
 *   loadMore: () => Promise<void | undefined>
 * }} 会话分页相关的状态与操作。
 */
export function usePagedSessions(pageSize = 6) {
  const sessions = ref([]);
  const unreadSessions = ref([]);
  const page = ref(1);
  const total = ref(0);
  const unreadTotal = ref(0);
  const activeCount = ref(0);
  const hasMore = ref(true);
  const loading = ref(false);
  const refreshing = ref(false);

  /**
   * 用第一页结果重置当前列表状态。
   *
   * @param {{ list: Array, hasMore: boolean, total: number }} result 首页请求结果。
   */
  function applyFirstPage(result) {
    sessions.value = result.list;
    page.value = 1;
    hasMore.value = result.hasMore;
    total.value = result.total;
  }

  /**
   * 同步页面顶部未读区域要使用的未读会话列表。
   *
   * @param {Array} list 当前全部未读会话。
   */
  function applyUnreadSessions(list) {
    unreadSessions.value = list;
  }

  /**
   * 同步会话列表顶部用到的统计卡片数据。
   *
   * @param {{ unreadTotal: number, activeCount: number, total: number }} overview 概览统计数据。
   */
  function applyOverview(overview) {
    unreadTotal.value = overview.unreadTotal;
    activeCount.value = overview.activeCount;
    total.value = overview.total;
  }

  /**
   * 首次进入页面时并行加载列表首页与概览数据。
   *
   * @returns {Promise<void>}
   */
  async function loadInitial() {
    loading.value = true;
    try {
      const [result, overview, unreadList] = await Promise.all([
        fetchPagedConversations(1, pageSize),
        fetchConversationOverview(),
        fetchUnreadConversations()
      ]);
      applyFirstPage(result);
      applyOverview(overview);
      applyUnreadSessions(unreadList);
    } finally {
      loading.value = false;
    }
  }

  /**
   * 下拉刷新时回到第一页，并刷新顶部统计。
   *
   * @returns {Promise<void>}
   */
  async function refresh() {
    refreshing.value = true;
    try {
      const [result, overview, unreadList] = await Promise.all([
        fetchPagedConversations(1, pageSize),
        fetchConversationOverview(),
        fetchUnreadConversations()
      ]);
      applyFirstPage(result);
      applyOverview(overview);
      applyUnreadSessions(unreadList);
    } finally {
      refreshing.value = false;
    }
  }

  /**
   * 继续加载下一页，内部会拦截重复请求和无更多数据的情况。
   *
   * @returns {Promise<void | undefined>}
   */
  async function loadMore() {
    if (loading.value || refreshing.value || !hasMore.value) {
      return;
    }
    loading.value = true;
    try {
      const nextPage = page.value + 1;
      const result = await fetchPagedConversations(nextPage, pageSize);
      sessions.value = sessions.value.concat(result.list);
      page.value = nextPage;
      hasMore.value = result.hasMore;
    } finally {
      loading.value = false;
    }
  }

  return {
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
  };
}
