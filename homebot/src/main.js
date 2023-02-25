import { createApp } from 'vue'
import App from './App.vue'
import DevUI from 'vue-devui';
import 'vue-devui/style.css';
import '@devui-design/icons/icomoon/devui-icon.css';
import { ThemeServiceInit, infinityTheme } from 'devui-theme';
import './assets/main.css'

ThemeServiceInit({ infinityTheme }, 'infinityTheme');
createApp(App).use(DevUI).mount('#app');

// createApp(App).mount('#app')
