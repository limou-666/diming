import { nextTick, ref } from 'vue';
import { onHide, onShow, onUnload } from '@dcloudio/uni-app';

export function usePageReveal(delay = 24) {
  const pageRevealed = ref(false);
  let revealTimer = null;

  function clearRevealTimer() {
    if (revealTimer) {
      clearTimeout(revealTimer);
      revealTimer = null;
    }
  }

  async function revealPage() {
    clearRevealTimer();
    pageRevealed.value = false;
    await nextTick();
    revealTimer = setTimeout(() => {
      pageRevealed.value = true;
      revealTimer = null;
    }, delay);
  }

  onShow(() => {
    revealPage();
  });

  onHide(() => {
    clearRevealTimer();
    pageRevealed.value = false;
  });

  onUnload(() => {
    clearRevealTimer();
  });

  return {
    pageRevealed,
    revealPage
  };
}
