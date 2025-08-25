# App 启动器解决方案

这个解决方案提供了完整的 AppUrl 唤起失败后的重定向功能，包括自动返回到当前页面的机制。

## 功能特性

- ✅ 智能检测 App 是否成功启动
- ✅ 超时自动跳转到备用链接（应用商店）
- ✅ 保存当前页面 URL，支持自动返回
- ✅ 用户可取消重定向操作
- ✅ 提供组件和工具函数两种使用方式
- ✅ 完整的事件回调支持
- ✅ TypeScript 类型支持

## 核心原理

### 1. 检测 App 启动成功
- 监听 `document.visibilitychange` 事件
- 当页面被隐藏时，认为 App 启动成功
- 监听 `window.focus` 事件，处理从 App 返回的情况

### 2. 超时处理
- 设置超时时间（默认 2 秒）
- 超时后自动跳转到备用链接
- 给用户 1.5 秒时间取消操作

### 3. 自动返回机制
- 使用 `sessionStorage` 保存当前页面 URL
- 在备用页面检测返回 URL
- 支持自动重定向回原页面

## 使用方法

### 1. 组件方式

```vue
<template>
  <AppLauncher 
    app-url="myapp://open"
    fallback-url="https://apps.apple.com/app/your-app-id"
    :timeout="3000"
    @success="handleSuccess"
    @failure="handleFailure"
    @redirect="handleRedirect"
  />
</template>

<script setup>
import AppLauncher from './components/AppLauncher.vue'

const handleSuccess = () => {
  console.log('应用启动成功')
}

const handleFailure = () => {
  console.log('应用启动失败')
}

const handleRedirect = () => {
  console.log('正在重定向到应用商店')
}
</script>
```

### 2. 工具函数方式

```typescript
import { launchApp, checkReturnUrl } from './utils/appLauncher'

// 启动应用
const launcher = launchApp({
  appUrl: 'myapp://open',
  fallbackUrl: 'https://apps.apple.com/app/your-app-id',
  timeout: 3000,
  enableAutoReturn: true,
  onSuccess: () => {
    console.log('应用启动成功')
  },
  onFailure: () => {
    console.log('应用启动失败')
  },
  onRedirect: () => {
    console.log('正在重定向到应用商店')
  }
})

// 取消重定向
launcher.cancelRedirect()

// 检查返回 URL（在备用页面使用）
if (checkReturnUrl()) {
  console.log('用户从应用商店返回')
}
```

## API 文档

### AppLauncher 组件 Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| appUrl | string | - | App 的 URL Scheme |
| fallbackUrl | string | - | 备用链接（通常是应用商店） |
| timeout | number | 2000 | 超时时间（毫秒） |
| currentPageUrl | string | window.location.href | 当前页面 URL |

### AppLauncher 组件 Events

| 事件 | 说明 |
|------|------|
| success | App 启动成功时触发 |
| failure | App 启动失败时触发 |
| redirect | 跳转到备用链接时触发 |

### AppLaunchOptions 接口

```typescript
interface AppLaunchOptions {
  appUrl: string
  fallbackUrl: string
  timeout?: number
  currentPageUrl?: string
  enableAutoReturn?: boolean
  onSuccess?: () => void
  onFailure?: () => void
  onRedirect?: () => void
}
```

## 实现细节

### 1. 页面可见性检测

```typescript
const handleVisibilityChange = () => {
  if (document.hidden) {
    // 页面被隐藏，说明可能成功打开了应用
    emit('success')
    cleanup()
  }
}
```

### 2. 超时处理

```typescript
// 设置超时，如果超时则认为打开失败
redirectTimer.value = window.setTimeout(() => {
  handleLaunchFailure()
}, props.timeout)
```

### 3. 自动返回机制

```typescript
// 保存当前页面URL到sessionStorage
sessionStorage.setItem('returnUrl', props.currentPageUrl)

// 在备用页面检查返回URL
const returnUrl = sessionStorage.getItem('returnUrl')
if (returnUrl && returnUrl !== window.location.href) {
  sessionStorage.removeItem('returnUrl')
  // 可以选择自动重定向回去
  // window.location.href = returnUrl
}
```

## 最佳实践

### 1. 设置合适的超时时间
- 移动端：2-3 秒
- 桌面端：1-2 秒
- 根据网络环境调整

### 2. 提供用户友好的提示
```vue
<div v-if="showFallback" class="fallback-message">
  <p>应用打开失败，正在跳转到应用商店...</p>
  <button @click="cancelRedirect">取消跳转</button>
</div>
```

### 3. 处理不同平台
```typescript
const getFallbackUrl = () => {
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return 'https://apps.apple.com/app/your-app-id'
  } else if (userAgent.includes('android')) {
    return 'https://play.google.com/store/apps/details?id=your.package.name'
  }
  return 'https://your-website.com/download'
}
```

### 4. 错误处理
```typescript
try {
  window.location.href = props.appUrl
} catch (error) {
  console.error('启动应用失败:', error)
  handleLaunchFailure()
}
```

## 注意事项

1. **浏览器兼容性**：`document.visibilitychange` 在大多数现代浏览器中支持
2. **移动端优化**：在移动端可能需要更长的超时时间
3. **用户体验**：始终提供取消选项，避免强制跳转
4. **安全性**：验证 URL 格式，防止恶意跳转
5. **测试**：在不同设备和浏览器中测试功能

## 示例项目

运行项目查看完整示例：

```bash
npm install
npm run dev
```

访问 `http://localhost:5173` 查看 App 启动器演示页面。 