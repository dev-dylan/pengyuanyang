<template>
  <div class="page-redirect-example">
    <h2>页面重定向演示</h2>
    <p class="current-page">当前页面: {{ currentPage }}</p>
    
    <div class="example-section">
      <h3>1. 基础重定向（自动返回）</h3>
      <p>点击按钮跳转到目标页面，然后会自动重定向回当前页面</p>
      <PageRedirect 
        target-url="http://app.homture.com/acceptInvite"
        button-text="跳转到邀请页面"
        @beforeRedirect="handleBeforeRedirect"
        @afterRedirect="handleAfterRedirect"
      />
    </div>

    <div class="example-section">
      <h3>2. 自定义返回URL</h3>
      <p>跳转到目标页面后，重定向到指定的URL而不是当前页面</p>
      <div class="form-group">
        <label>自定义返回URL:</label>
        <input v-model="customReturnUrl" type="text" placeholder="https://example.com" />
      </div>
      <PageRedirect 
        target-url="http://app.homture.com/acceptInvite"
        :return-url="customReturnUrl"
        button-text="跳转并返回指定页面"
      />
    </div>

    <div class="example-section">
      <h3>3. 禁用自动返回</h3>
      <p>跳转到目标页面后，不会自动返回</p>
      <PageRedirect 
        target-url="http://app.homture.com/acceptInvite"
        :enable-auto-return="false"
        button-text="跳转（不自动返回）"
      />
    </div>

    <div class="example-section">
      <h3>4. 使用工具函数</h3>
      <p>直接使用工具函数进行重定向</p>
      <div class="button-group">
        <button @click="redirectWithUtility" class="utility-btn">
          工具函数重定向
        </button>
        <button @click="checkReturnStatus" class="check-btn">
          检查返回状态
        </button>
        <button @click="clearReturnUrl" class="clear-btn">
          清除返回URL
        </button>
      </div>
    </div>

    <div class="example-section">
      <h3>5. 事件日志</h3>
      <div class="event-log">
        <div v-for="(event, index) in eventLog" :key="index" class="log-item" :class="event.type">
          <span class="timestamp">{{ event.timestamp }}</span>
          <span class="message">{{ event.message }}</span>
        </div>
      </div>
      <button @click="clearLog" class="clear-log-btn">清空日志</button>
    </div>

    <div class="example-section">
      <h3>6. 返回URL信息</h3>
      <div class="return-info">
        <p><strong>当前返回URL:</strong> {{ currentReturnUrl || '无' }}</p>
        <p><strong>是否检测到返回:</strong> {{ hasReturnUrl ? '是' : '否' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageRedirect from './PageRedirect.vue'
import { 
  redirectToPage, 
  handlePageReturn, 
  getReturnUrl, 
  clearReturnUrl as clearReturnUrlUtil 
} from '../utils/pageRedirect'

interface EventLogItem {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

const currentPage = ref(window.location.href)
const customReturnUrl = ref('https://example.com')
const eventLog = ref<EventLogItem[]>([])

// 计算属性
const currentReturnUrl = computed(() => getReturnUrl())
const hasReturnUrl = computed(() => !!currentReturnUrl.value)

// 添加日志
const addLog = (message: string, type: EventLogItem['type'] = 'info') => {
  eventLog.value.unshift({
    timestamp: new Date().toLocaleTimeString(),
    message,
    type
  })
}

// 清空日志
const clearLog = () => {
  eventLog.value = []
}

// 事件处理函数
const handleBeforeRedirect = () => {
  addLog('开始重定向...', 'info')
}

const handleAfterRedirect = () => {
  addLog('重定向完成', 'success')
}

// 使用工具函数重定向
const redirectWithUtility = () => {
  addLog('使用工具函数进行重定向...', 'info')
  
  redirectToPage({
    targetUrl: 'http://app.homture.com/acceptInvite',
    returnUrl: window.location.href,
    delay: 200,
    onBeforeRedirect: () => {
      addLog('工具函数：开始重定向', 'info')
    }
  })
}

// 检查返回状态
const checkReturnStatus = () => {
  const returnUrl = getReturnUrl()
  if (returnUrl) {
    addLog(`检测到返回URL: ${returnUrl}`, 'success')
  } else {
    addLog('未检测到返回URL', 'warning')
  }
}

// 清除返回URL
const clearReturnUrl = () => {
  clearReturnUrlUtil()
  addLog('已清除返回URL', 'info')
}

// 组件挂载时检查是否需要返回
onMounted(() => {
  addLog('页面已加载，检查是否需要返回...', 'info')
  
  if (handlePageReturn()) {
    addLog('检测到返回请求，正在重定向回原页面', 'success')
  } else {
    addLog('无需返回，正常显示页面', 'info')
  }
  
  // 定期检查返回URL状态
  setInterval(() => {
    const returnUrl = getReturnUrl()
    if (returnUrl && !eventLog.value.some(log => log.message.includes('检测到返回URL'))) {
      addLog(`检测到返回URL: ${returnUrl}`, 'success')
    }
  }, 5000)
})
</script>

<style scoped>
.page-redirect-example {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.current-page {
  background: #e9ecef;
  padding: 1rem;
  border-radius: 6px;
  font-family: monospace;
  font-size: 14px;
  word-break: break-all;
}

.example-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #fff;
}

.example-section h3 {
  margin-top: 0;
  color: #495057;
  border-bottom: 2px solid #007bff;
  padding-bottom: 0.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.button-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.utility-btn, .check-btn, .clear-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.utility-btn {
  background: #28a745;
  color: white;
}

.utility-btn:hover {
  background: #218838;
}

.check-btn {
  background: #17a2b8;
  color: white;
}

.check-btn:hover {
  background: #138496;
}

.clear-btn {
  background: #dc3545;
  color: white;
}

.clear-btn:hover {
  background: #c82333;
}

.event-log {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 1rem;
  background: #f8f9fa;
}

.log-item {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.log-item.success {
  background: #d4edda;
  color: #155724;
}

.log-item.warning {
  background: #fff3cd;
  color: #856404;
}

.log-item.error {
  background: #f8d7da;
  color: #721c24;
}

.log-item.info {
  background: #d1ecf1;
  color: #0c5460;
}

.timestamp {
  font-weight: bold;
  min-width: 80px;
}

.clear-log-btn {
  margin-top: 1rem;
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.clear-log-btn:hover {
  background: #5a6268;
}

.return-info {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.return-info p {
  margin: 0.5rem 0;
  font-family: monospace;
  font-size: 14px;
}

.return-info strong {
  color: #495057;
}
</style> 