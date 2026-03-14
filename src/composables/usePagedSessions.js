import { ref } from 'vue';
import { fetchConversationOverview, fetchPagedConversations } from '@/mock';

export function usePagedSessions(pageSize = 6) {
  const sessions = ref([]);
  const page = ref(1);
  const total = ref(0);
  const unreadTotal = ref(0);
  const activeCount = ref(0);
  const hasMore = ref(true);
  const loading = ref(false);
  const refreshing = ref(false);

  function applyFirstPage(result) {
    sessions.value = result.list;
    page.value = 1;
    hasMore.value = result.hasMore;
    total.value = result.total;
  }

  function applyOverview(overview) {
    unreadTotal.value = overview.unreadTotal;
    activeCount.value = overview.activeCount;
    total.value = overview.total;
  }

  async function loadInitial() {
    loading.value = true;
    try {
      const [result, overview] = await Promise.all([
        fetchPagedConversations(1, pageSize),
        fetchConversationOverview()
      ]);
      applyFirstPage(result);
      applyOverview(overview);
    } finally {
      loading.value = false;
    }
  }

  async function refresh() {
    refreshing.value = true;
    try {
      const [result, overview] = await Promise.all([
        fetchPagedConversations(1, pageSize),
        fetchConversationOverview()
      ]);
      applyFirstPage(result);
      applyOverview(overview);
    } finally {
      refreshing.value = false;
    }
  }

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
