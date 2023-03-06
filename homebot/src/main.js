import { createApp } from 'vue'
import App from './App.vue'
import DevUI from 'vue-devui';
import { createRouter, createWebHashHistory } from 'vue-router';
import { ThemeServiceInit, infinityTheme } from 'devui-theme';

import 'vue-devui/style.css';
import '@devui-design/icons/icomoon/devui-icon.css';
import './assets/main.css'

// import Input from './components/input.vue'
// import Select from './components/select.vue'

// 1. 定义路由组件.
// 也可以从其他文件导入
const Input = { template: '<div>Input</div>' }
const Select = { template: '<div>Select</div>' }

// 2. 定义一些路由
// 每个路由都需要映射到一个组件。
// 我们后面再讨论嵌套路由。
const routes = [
  { path: '/src/components/input.vue', component: Input },
  { path: '/src/components/select.vue', component: Select },
]

// 3. 创建路由实例并传递 `routes` 配置
// 你可以在这里输入更多的配置，但我们在这里
// 暂时保持简单
const router = createRouter({
  // 4. 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式。
  history: createWebHashHistory(),
  routes, // `routes: routes` 的缩写
})

// // 5. 创建并挂载根实例
// const app = Vue.createApp({})
// //确保 _use_ 路由实例使
// //整个应用支持路由。
// app.use(router)

ThemeServiceInit({ infinityTheme }, 'infinityTheme');
createApp(App).use(DevUI).use(router).mount('#app');