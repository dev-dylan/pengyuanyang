<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import AppLauncherExample from './components/AppLauncherExample.vue'
import PageRedirectExample from './components/PageRedirectExample.vue'
</script>

<template>
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <HelloWorld msg="Vite + Vue" />
  
  <!-- App 启动器示例 -->
  <AppLauncherExample />
  
  <!-- 页面重定向示例 -->
  <PageRedirectExample />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

.app-launcher-demo {
  margin-top: 2rem;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 12px;
  text-align: center;
}

.app-launcher-demo h3 {
  margin-bottom: 1rem;
  color: #333;
}
</style>
