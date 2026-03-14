import { ref } from 'vue';
import { fetchPagedConversations } from '@/mock';

export function usePagedSessions(pageSize = 6) {
  const sessions = ref([]);
  const page = ref(1);
  const hasMore = ref(true);
  const loading = ref(false);
  const refreshing = ref(false);

  async function loadInitial() {
    loading.value = true;
    try {
      const result = await fetchPagedConversations(1, pageSize);
      sessions.value = result.list;
      page.value = 1;
      hasMore.value = result.hasMore;
    } finally {
      loading.value = false;
    }
  }

  async function refresh() {
    refreshing.value = true;
    try {
      const result = await fetchPagedConversations(1, pageSize);
      sessions.value = result.list;
      page.value = 1;
      hasMore.value = result.hasMore;
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
    loading,
    refreshing,
    hasMore,
    loadInitial,
    refresh,
    loadMore
  };
}