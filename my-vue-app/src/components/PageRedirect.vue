<template>
  <div class="page-redirect">
    <button @click="handleRedirect" :disabled="isRedirecting" class="redirect-btn">
      {{ isRedirecting ? '正在跳转...' : buttonText }}
    </button>
    
    <div v-if="showCancel" class="cancel-section">
      <p>正在跳转到 {{ targetUrl }}...</p>
      <button @click="cancelRedirect" class="cancel-btn">取消跳转</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { redirectToPage, type RedirectOptions } from '../utils/pageRedirect'

interface Props {
  targetUrl: string
  returnUrl?: string
  delay?: number
  enableAutoReturn?: boolean
  buttonText?: string
}

const props = withDefaults(defineProps<Props>(), {
  delay: 100,
  enableAutoReturn: true,
  buttonText: '跳转到目标页面'
})

const emit = defineEmits(['beforeRedirect', 'afterRedirect'])

const isRedirecting = ref(false)
const showCancel = ref(false)
const redirectInstance = ref<any>(null)

const handleRedirect = () => {
  if (isRedirecting.value) return
  
  isRedirecting.value = true
  showCancel.value = true
  
  const options: RedirectOptions = {
    targetUrl: props.targetUrl,
    returnUrl: props.returnUrl,
    delay: props.delay,
    enableAutoReturn: props.enableAutoReturn,
    onBeforeRedirect: () => {
      emit('beforeRedirect')
    },
    onAfterRedirect: () => {
      emit('afterRedirect')
    }
  }
  
  redirectInstance.value = redirectToPage(options)
  
  // 3秒后隐藏取消按钮
  setTimeout(() => {
    showCancel.value = false
  }, 3000)
}

const cancelRedirect = () => {
  if (redirectInstance.value) {
    redirectInstance.value.cancel()
    isRedirecting.value = false
    showCancel.value = false
  }
}
</script>

<style scoped>
.page-redirect {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.redirect-btn {
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

.redirect-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.redirect-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.cancel-section {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  max-width: 300px;
}

.cancel-section p {
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