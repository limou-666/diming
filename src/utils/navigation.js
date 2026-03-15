const ENTER_ANIMATION = {
  animationType: 'slide-in-right',
  animationDuration: 220
};

const BACK_ANIMATION = {
  animationType: 'slide-out-right',
  animationDuration: 220
};

const RELAUNCH_ANIMATION = {
  animationType: 'fade-in',
  animationDuration: 180
};

export function navigateToPage(url, options = {}) {
  return uni.navigateTo({
    url,
    ...ENTER_ANIMATION,
    ...options
  });
}

export function navigateBackPage(options = {}) {
  return uni.navigateBack({
    ...BACK_ANIMATION,
    ...options
  });
}

export function reLaunchPage(url, options = {}) {
  return uni.reLaunch({
    url,
    ...RELAUNCH_ANIMATION,
    ...options
  });
}
