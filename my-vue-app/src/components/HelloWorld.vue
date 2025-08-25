<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ msg: string }>()

const count = ref(0)

function openApp() {
    const appUrl = "https://app.homture.com/app/acceptInvite?code=asdewq1231erte2313";
    // const appUrl = "homture://frame/app/acceptInvite?code=1xxdfgi";
    const appStoreUrl = "https://apps.apple.com/app/id123456"; // iOS 下载页
    const playStoreUrl = "https://play.google.com/store/apps/details?id=com.homture.app"; // Android 下载页
   
    // 尝试打开 App，2 秒后检测是否成功唤起
    window.location.href = appUrl;
    // setTimeout(() => {
    //   if (!document.hidden) { // 页面未隐藏说明唤起失败
    //     const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    //     // window.location.href = isIOS ? appStoreUrl : playStoreUrl;
    //     window.location.href = 'homture://app/createGift?code=xxxx';
    //   }
    // }, 500); 
  }

// 触发Android AppLink的函数
const triggerAppLink = () => {
  // const appLinkUrl = 'https://app.homture.com/app/createGift?code=xxxx'

  // window.open(appLinkUrl);
  openApp();

  
  // // 尝试打开AppLink
  // try {
  //   // 优先尝试在当前窗口打开
  //   window.location.href = appLinkUrl
  // } catch (error) {
  //   console.error('Failed to trigger AppLink:', error)
  //   // 如果失败，尝试在新窗口打开
  //   window.open(appLinkUrl, '_blank')
  // }
}
</script>

<template>
  <h1>{{ msg }}</h1>

  <div class="card">
    <button type="button" @click="count++">count is {{ count }}</button>
    <p>
      Edit
      <code>components/HelloWorld.vue</code> to test HMR
    </p>
  </div>

  <!-- 添加AppLink按钮 -->
  <div class="card">
    <button type="button" @click="triggerAppLink" class="applink-btn">
      打开 Homture App 创建礼品
    </button>
    <p>点击按钮将触发Android AppLink，打开Homture应用</p>
    <a href="https://app.homture.com/app/createGift?code=xxxx">Open App</a>

  </div>

  <p>
    Check out
    <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
      >create-vue</a
    >, the official Vue + Vite starter
  </p>
  <p>
    Install
    <a href="https://github.com/johnsoncodehk/volar" target="_blank">Volar</a>
    in your IDE for a better DX
  </p>
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}

.applink-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin: 8px 0;
}

.applink-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.applink-btn:active {
  transform: translateY(0);
}
</style>
