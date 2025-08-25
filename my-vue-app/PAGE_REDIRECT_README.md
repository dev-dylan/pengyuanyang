# 页面重定向解决方案

这个解决方案实现了从 A 页面跳转到 B 页面后自动重定向回 A 页面的功能，相当于没有发生跳转。

## 功能特性

- ✅ 从 A 页面跳转到 B 页面后自动返回 A 页面
- ✅ 支持自定义返回 URL
- ✅ 支持禁用自动返回功能
- ✅ 提供组件和工具函数两种使用方式
- ✅ 完整的事件回调支持
- ✅ 超时保护机制（30分钟有效期）
- ✅ TypeScript 类型支持

## 核心原理

### 1. URL 保存机制
- 使用 `sessionStorage` 保存当前页面 URL
- 同时保存时间戳，用于超时检查
- 在跳转前保存，确保数据完整性

### 2. 自动返回检测
- 在目标页面加载时检查是否有返回 URL
- 如果存在且未超时，自动重定向回原页面
- 清除已使用的返回 URL 数据

### 3. 超时保护
- 返回 URL 有效期为 30 分钟
- 超时后自动清除过期数据
- 防止长期占用存储空间

## 使用方法

### 1. 组件方式

```vue
<template>
  <!-- 基础用法：自动返回当前页面 -->
  <PageRedirect 
    target-url="http://app.homture.com/acceptInvite"
    button-text="跳转到邀请页面"
    @beforeRedirect="handleBeforeRedirect"
    @afterRedirect="handleAfterRedirect"
  />
  
  <!-- 自定义返回URL -->
  <PageRedirect 
    target-url="http://app.homture.com/acceptInvite"
    return-url="https://example.com"
    button-text="跳转并返回指定页面"
  />
  
  <!-- 禁用自动返回 -->
  <PageRedirect 
    target-url="http://app.homture.com/acceptInvite"
    :enable-auto-return="false"
    button-text="跳转（不自动返回）"
  />
</template>

<script setup>
import PageRedirect from './components/PageRedirect.vue'

const handleBeforeRedirect = () => {
  console.log('开始重定向...')
}

const handleAfterRedirect = () => {
  console.log('重定向完成')
}
</script>
```

### 2. 工具函数方式

```typescript
import { redirectToPage, handlePageReturn, getReturnUrl } from './utils/pageRedirect'

// 基础重定向
const redirect = redirectToPage({
  targetUrl: 'http://app.homture.com/acceptInvite',
  returnUrl: window.location.href,
  delay: 100,
  onBeforeRedirect: () => {
    console.log('开始重定向')
  }
})

// 取消重定向
redirect.cancel()

// 在目标页面检查并处理返回
if (handlePageReturn()) {
  console.log('正在返回原页面')
}

// 获取当前返回URL
const returnUrl = getReturnUrl()
console.log('返回URL:', returnUrl)
```

### 3. 在目标页面中处理返回

在目标页面（B 页面）的入口文件中添加：

```typescript
// main.ts 或 App.vue 的 onMounted 中
import { handlePageReturn } from './utils/pageRedirect'

// 检查是否需要返回
if (handlePageReturn()) {
  // 如果返回了，这里不会执行，因为页面已经重定向了
  console.log('用户已返回原页面')
} else {
  // 正常显示页面内容
  console.log('正常显示页面')
}
```

## API 文档

### PageRedirect 组件 Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| targetUrl | string | - | 目标页面 URL |
| returnUrl | string | window.location.href | 返回页面 URL |
| delay | number | 100 | 跳转延迟（毫秒） |
| enableAutoReturn | boolean | true | 是否启用自动返回 |
| buttonText | string | '跳转到目标页面' | 按钮文本 |

### PageRedirect 组件 Events

| 事件 | 说明 |
|------|------|
| beforeRedirect | 重定向前触发 |
| afterRedirect | 重定向后触发 |

### RedirectOptions 接口

```typescript
interface RedirectOptions {
  targetUrl: string
  returnUrl?: string
  delay?: number
  enableAutoReturn?: boolean
  onBeforeRedirect?: () => void
  onAfterRedirect?: () => void
}
```

## 实现细节

### 1. URL 保存

```typescript
private saveReturnUrl(): void {
  const returnUrl = this.options.returnUrl || window.location.href
  sessionStorage.setItem('pageRedirect_returnUrl', returnUrl)
  sessionStorage.setItem('pageRedirect_timestamp', Date.now().toString())
}
```

### 2. 返回检测

```typescript
export function checkAndHandleReturn(): boolean {
  const returnUrl = sessionStorage.getItem('pageRedirect_returnUrl')
  const timestamp = sessionStorage.getItem('pageRedirect_timestamp')
  
  if (returnUrl && timestamp) {
    const now = Date.now()
    const redirectTime = parseInt(timestamp)
    const timeDiff = now - redirectTime
    
    // 30分钟内有效
    if (timeDiff < 30 * 60 * 1000) {
      sessionStorage.removeItem('pageRedirect_returnUrl')
      sessionStorage.removeItem('pageRedirect_timestamp')
      window.location.href = returnUrl
      return true
    }
  }
  
  return false
}
```

### 3. 延迟跳转

```typescript
// 延迟跳转，确保URL保存完成
this.redirectTimer = window.setTimeout(() => {
  window.location.href = this.options.targetUrl
}, this.options.delay)
```

## 使用场景

### 1. 应用内分享链接
```typescript
// 用户点击分享链接，跳转到邀请页面后自动返回
redirectToPage({
  targetUrl: 'http://app.homture.com/acceptInvite?code=123',
  returnUrl: window.location.href
})
```

### 2. 第三方授权
```typescript
// 跳转到第三方授权页面，授权完成后返回
redirectToPage({
  targetUrl: 'https://oauth.example.com/authorize',
  returnUrl: 'https://myapp.com/callback'
})
```

### 3. 支付跳转
```typescript
// 跳转到支付页面，支付完成后返回
redirectToPage({
  targetUrl: 'https://pay.example.com/checkout',
  returnUrl: 'https://myapp.com/order/success'
})
```

## 最佳实践

### 1. 设置合适的延迟时间
```typescript
// 确保数据保存完成
const delay = 100 // 100ms 通常足够
```

### 2. 处理不同场景
```typescript
// 根据业务需求决定是否启用自动返回
const enableAutoReturn = userWantsToReturn // 根据用户偏好设置
```

### 3. 错误处理
```typescript
try {
  redirectToPage({
    targetUrl: targetUrl,
    onBeforeRedirect: () => {
      // 保存当前状态
      saveCurrentState()
    }
  })
} catch (error) {
  console.error('重定向失败:', error)
  // 处理错误
}
```

### 4. 用户体验优化
```vue
<template>
  <PageRedirect 
    target-url="http://app.homture.com/acceptInvite"
    button-text="查看邀请详情"
  >
    <template #loading>
      <div>正在跳转...</div>
    </template>
  </PageRedirect>
</template>
```

## 注意事项

1. **浏览器兼容性**：`sessionStorage` 在大多数现代浏览器中支持
2. **安全性**：验证 URL 格式，防止恶意跳转
3. **用户体验**：提供取消选项，避免强制跳转
4. **数据清理**：定期清理过期的返回 URL 数据
5. **测试**：在不同设备和浏览器中测试功能

## 示例项目

运行项目查看完整示例：

```bash
npm install
npm run dev
```

访问 `http://localhost:5173` 查看页面重定向演示页面。

## 常见问题

### Q: 为什么有时候不会自动返回？
A: 可能的原因：
- 返回 URL 已过期（超过30分钟）
- 目标页面没有调用 `handlePageReturn()`
- 浏览器禁用了 `sessionStorage`

### Q: 如何自定义返回逻辑？
A: 可以禁用自动返回，然后手动处理：
```typescript
redirectToPage({
  targetUrl: 'http://example.com',
  enableAutoReturn: false,
  onAfterRedirect: () => {
    // 自定义返回逻辑
    setTimeout(() => {
      window.history.back()
    }, 2000)
  }
})
```

### Q: 如何清除返回 URL？
A: 使用 `clearReturnUrl()` 函数：
```typescript
import { clearReturnUrl } from './utils/pageRedirect'
clearReturnUrl()
``` 