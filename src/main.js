import { createSSRApp } from 'vue';
import App from './App.vue';

/**
 * 创建 uni-app 运行所需的 Vue 应用实例。
 *
 * @returns {{ app: import('vue').App }} 应用启动入口对象。
 */
export function createApp() {
  const app = createSSRApp(App);
  return {
    app
  };
}
