<template>
  <div class="app-launcher-example">
    <h2>App 启动器使用示例</h2>
    
    <div class="example-section">
      <h3>1. 使用组件方式</h3>
      <AppLauncher 
        app-url="http://app.homture.com/acceptInvite"
        fallback-url="https://apps.apple.com/app/your-app-id"
        :timeout="3000"
        @success="handleSuccess"
        @failure="handleFailure"
        @redirect="handleRedirect"
      />
    </div>

    <div class="example-section">
      <h3>2. 使用工具函数方式</h3>
      <button @click="launchWithUtility" class="utility-btn">
        启动应用（工具函数）
      </button>
      <div v-if="showCancel" class="cancel-section">
        <p>正在跳转到应用商店...</p>
        <button @click="cancelLaunch" class="cancel-btn">取消跳转</button>
      </div>
    </div>

    <div class="example-section">
      <h3>3. 自定义配置</h3>
      <div class="config-form">
        <div class="form-group">
          <label>App URL:</label>
          <input v-model="customConfig.appUrl" type="text" placeholder="myapp://open" />
        </div>
        <div class="form-group">
          <label>备用链接:</label>
          <input v-model="customConfig.fallbackUrl" type="text" placeholder="https://apps.apple.com/app/your-app-id" />
        </div>
        <div class="form-group">
          <label>超时时间 (ms):</label>
          <input v-model="customConfig.timeout" type="number" min="1000" max="10000" />
        </div>
        <div class="form-group">
          <label>
            <input v-model="customConfig.enableAutoReturn" type="checkbox" />
            启用自动返回
          </label>
        </div>
        <button @click="launchWithCustomConfig" class="custom-btn">
          使用自定义配置启动
        </button>
      </div>
    </div>

    <div class="example-section">
      <h3>4. 事件日志</h3>
      <div class="event-log">
        <div v-for="(event, index) in eventLog" :key="index" class="log-item" :class="event.type">
          <span class="timestamp">{{ event.timestamp }}</span>
          <span class="message">{{ event.message }}</span>
        </div>
      </div>
      <button @click="clearLog" class="clear-btn">清空日志</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLauncher from './AppLauncher.vue'
import { launchApp, checkReturnUrl, type AppLaunchOptions } from '../utils/appLauncher'

interface EventLogItem {
  timestamp: string
  message: string
  type: 'success' | 'failure' | 'redirect' | 'info'
}

const showCancel = ref(false)
const eventLog = ref<EventLogItem[]>([])
const launcherInstance = ref<any>(null)

const customConfig = ref({
  appUrl: 'myapp://open',
  fallbackUrl: 'https://apps.apple.com/app/your-app-id',
  timeout: 3000,
  enableAutoReturn: true
})

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
const handleSuccess = () => {
  addLog('应用启动成功！', 'success')
}

const handleFailure = () => {
  addLog('应用启动失败', 'failure')
}

const handleRedirect = () => {
  addLog('正在重定向到应用商店', 'redirect')
}

// 使用工具函数启动
const launchWithUtility = () => {
  showCancel.value = true
  addLog('使用工具函数启动应用...', 'info')
  
  launcherInstance.value = launchApp({
    appUrl: 'myapp://open',
    fallbackUrl: 'https://apps.apple.com/app/your-app-id',
    timeout: 3000,
    onSuccess: () => {
      addLog('工具函数：应用启动成功！', 'success')
      showCancel.value = false
    },
    onFailure: () => {
      addLog('工具函数：应用启动失败', 'failure')
    },
    onRedirect: () => {
      addLog('工具函数：正在重定向到应用商店', 'redirect')
    }
  })
}

// 取消启动
const cancelLaunch = () => {
  if (launcherInstance.value) {
    launcherInstance.value.cancelRedirect()
    addLog('用户取消了跳转', 'info')
  }
  showCancel.value = false
}

// 使用自定义配置启动
const launchWithCustomConfig = () => {
  addLog('使用自定义配置启动应用...', 'info')
  
  const config: AppLaunchOptions = {
    ...customConfig.value,
    onSuccess: () => {
      addLog('自定义配置：应用启动成功！', 'success')
    },
    onFailure: () => {
      addLog('自定义配置：应用启动失败', 'failure')
    },
    onRedirect: () => {
      addLog('自定义配置：正在重定向到应用商店', 'redirect')
    }
  }
  
  launchApp(config)
}

// 组件挂载时检查返回URL
onMounted(() => {
  addLog('组件已挂载，检查返回URL...', 'info')
  
  if (checkReturnUrl()) {
    addLog('检测到返回URL，用户可能从应用商店返回', 'info')
  }
})
</script>

<style scoped>
.app-launcher-example {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
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

.utility-btn, .custom-btn {
  padding: 12px 24px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.utility-btn:hover, .custom-btn:hover {
  background: #218838;
}

.cancel-section {
  margin-top: 1rem;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
}

.cancel-section p {
  margin: 0 0 0.5rem 0;
  color: #856404;
}

.cancel-btn {
  padding: 6px 12px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #5a6268;
}

.config-form {
  display: grid;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #495057;
}

.form-group input[type="text"],
.form-group input[type="number"] {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input[type="checkbox"] {
  margin-right: 0.5rem;
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

.log-item.failure {
  background: #f8d7da;
  color: #721c24;
}

.log-item.redirect {
  background: #fff3cd;
  color: #856404;
}

.log-item.info {
  background: #d1ecf1;
  color: #0c5460;
}

.timestamp {
  font-weight: bold;
  min-width: 80px;
}

.clear-btn {
  margin-top: 1rem;
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.clear-btn:hover {
  background: #c82333;
}
</style> 