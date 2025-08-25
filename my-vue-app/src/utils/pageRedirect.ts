/**
 * 页面重定向工具
 * 实现从 A 页面跳转到 B 页面后自动重定向回 A 页面的功能
 */

export interface RedirectOptions {
  targetUrl: string
  returnUrl?: string
  delay?: number
  enableAutoReturn?: boolean
  onBeforeRedirect?: () => void
  onAfterRedirect?: () => void
}

export class PageRedirect {
  private options: RedirectOptions
  private redirectTimer: number | null = null

  constructor(options: RedirectOptions) {
    this.options = {
      delay: 100, // 默认延迟100ms
      enableAutoReturn: true,
      returnUrl: window.location.href,
      ...options
    }
  }

  /**
   * 执行重定向
   */
  redirect(): void {
    this.options.onBeforeRedirect?.()

    if (this.options.enableAutoReturn) {
      // 保存当前页面URL
      this.saveReturnUrl()
    }

    // 延迟跳转，确保URL保存完成
    this.redirectTimer = window.setTimeout(() => {
      window.location.href = this.options.targetUrl
    }, this.options.delay)
  }

  /**
   * 保存返回URL
   */
  private saveReturnUrl(): void {
    const returnUrl = this.options.returnUrl || window.location.href
    sessionStorage.setItem('pageRedirect_returnUrl', returnUrl)
    sessionStorage.setItem('pageRedirect_timestamp', Date.now().toString())
  }

  /**
   * 取消重定向
   */
  cancel(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer)
      this.redirectTimer = null
    }
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.cancel()
  }
}

/**
 * 检查并处理自动返回
 */
export function checkAndHandleReturn(): boolean {
  const returnUrl = sessionStorage.getItem('pageRedirect_returnUrl')
  const timestamp = sessionStorage.getItem('pageRedirect_timestamp')
  
  if (returnUrl && timestamp) {
    const now = Date.now()
    const redirectTime = parseInt(timestamp)
    const timeDiff = now - redirectTime
    
    // 如果重定向时间在30分钟内，则认为是有效的返回
    if (timeDiff < 30 * 60 * 1000) {
      // 清除存储的数据
      sessionStorage.removeItem('pageRedirect_returnUrl')
      sessionStorage.removeItem('pageRedirect_timestamp')
      
      // 重定向回原页面
      window.location.href = returnUrl
      return true
    } else {
      // 清除过期的数据
      sessionStorage.removeItem('pageRedirect_returnUrl')
      sessionStorage.removeItem('pageRedirect_timestamp')
    }
  }
  
  return false
}

/**
 * 便捷函数：直接重定向
 */
export function redirectToPage(options: RedirectOptions): PageRedirect {
  const redirect = new PageRedirect(options)
  redirect.redirect()
  return redirect
}

/**
 * 便捷函数：检查是否需要返回
 */
export function handlePageReturn(): boolean {
  return checkAndHandleReturn()
}

/**
 * 获取当前页面的返回URL（如果存在）
 */
export function getReturnUrl(): string | null {
  return sessionStorage.getItem('pageRedirect_returnUrl')
}

/**
 * 清除返回URL
 */
export function clearReturnUrl(): void {
  sessionStorage.removeItem('pageRedirect_returnUrl')
  sessionStorage.removeItem('pageRedirect_timestamp')
} 