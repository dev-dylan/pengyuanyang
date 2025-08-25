<template>
  <div class="app-launcher">
    <button @click="launchApp" :disabled="isLaunching" class="launch-btn">
      {{ isLaunching ? '正在打开应用...' : '打开应用' }}
    </button>
    <div v-if="showFallback" class="fallback-message">
      <p>应用打开失败，正在跳转到应用商店...</p>
      <button @click="cancelRedirect" class="cancel-btn">取消跳转</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  appUrl: string
  fallbackUrl: string
  timeout?: number
  currentPageUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  timeout: 2000,
  currentPageUrl: window.location.href
})

const emit = defineEmits(['success', 'failure', 'redirect'])

const isLaunching = ref(false)
const showFallback = ref(false)
const redirectTimer = ref<number | null>(null)
const visibilityTimer = ref<number | null>(null)

// 检测页面可见性变化
const handleVisibilityChange = () => {
  if (document.hidden) {
    // 页面被隐藏，说明可能成功打开了应用
    emit('success')
    cleanup()
  }
}

// 检测页面焦点变化
const handleFocus = () => {
  // 页面重新获得焦点，说明可能从应用返回
  cleanup()
}

// 清理定时器
const cleanup = () => {
  if (redirectTimer.value) {
    clearTimeout(redirectTimer.value)
    redirectTimer.value = null
  }
  if (visibilityTimer.value) {
    clearTimeout(visibilityTimer.value)
    visibilityTimer.value = null
  }
  isLaunching.value = false
  showFallback.value = false
}

// 启动应用
const launchApp = async () => {
  if (isLaunching.value) return
  
  isLaunching.value = true
  showFallback.value = false
  
  try {
    // 设置页面可见性监听
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    // 尝试打开应用
    window.location.href = props.appUrl
    
    // 设置超时，如果超时则认为打开失败
    redirectTimer.value = window.setTimeout(() => {
      handleLaunchFailure()
    }, props.timeout)
    
  } catch (error) {
    console.error('启动应用失败:', error)
    handleLaunchFailure()
  }
}

// 处理启动失败
const handleLaunchFailure = () => {
  emit('failure')
  showFallback.value = true
  
  // 延迟跳转到备用链接
  visibilityTimer.value = window.setTimeout(() => {
    redirectToFallback()
  }, 1500) // 给用户1.5秒时间取消
}

// 跳转到备用链接
const redirectToFallback = () => {
  emit('redirect')
  
  // 保存当前页面URL到sessionStorage，用于后续重定向回来
  sessionStorage.setItem('returnUrl', props.currentPageUrl)
  
  // 跳转到备用链接（通常是应用商店）
  window.location.href = props.fallbackUrl
}

// 取消重定向
const cancelRedirect = () => {
  cleanup()
  emit('failure')
}

// 组件挂载时检查是否需要返回
onMounted(() => {
  // 检查是否有返回URL
  const returnUrl = sessionStorage.getItem('returnUrl')
  if (returnUrl && returnUrl !== window.location.href) {
    // 清除存储的URL
    sessionStorage.removeItem('returnUrl')
    
    // 可以选择自动重定向回去
    // window.location.href = returnUrl
  }
})

// 组件卸载时清理
onUnmounted(() => {
  cleanup()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('focus', handleFocus)
})
</script>

<style scoped>
.app-launcher {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.launch-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.launch-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.launch-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.fallback-message {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  max-width: 300px;
}

.fallback-message p {
  margin: 0 0 12px 0;
  color: #856404;
  font-size: 14px;
}

.cancel-btn {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.cancel-btn:hover {
  background: #5a6268;
}
</style> 