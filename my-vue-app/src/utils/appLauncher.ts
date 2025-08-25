/**
 * App 启动器工具函数
 * 处理 AppUrl 唤起失败后的重定向逻辑
 */

export interface AppLaunchOptions {
  appUrl: string
  fallbackUrl: string
  timeout?: number
  currentPageUrl?: string
  enableAutoReturn?: boolean
  onSuccess?: () => void
  onFailure?: () => void
  onRedirect?: () => void
}

export class AppLauncher {
  private options: AppLaunchOptions
  private redirectTimer: number | null = null
  private visibilityTimer: number | null = null
  private isLaunching = false

  constructor(options: AppLaunchOptions) {
    this.options = {
      timeout: 2000,
      currentPageUrl: window.location.href,
      enableAutoReturn: true,
      ...options
    }
  }

  /**
   * 启动应用
   */
  async launch(): Promise<void> {
    if (this.isLaunching) return

    this.isLaunching = true

    try {
      // 设置页面可见性监听
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
      window.addEventListener('focus', this.handleFocus.bind(this))

      // 尝试打开应用
      window.location.href = this.options.appUrl

      // 设置超时，如果超时则认为打开失败
      this.redirectTimer = window.setTimeout(() => {
        this.handleLaunchFailure()
      }, this.options.timeout)

    } catch (error) {
      console.error('启动应用失败:', error)
      this.handleLaunchFailure()
    }
  }

  /**
   * 检测页面可见性变化
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // 页面被隐藏，说明可能成功打开了应用
      this.options.onSuccess?.()
      this.cleanup()
    }
  }

  /**
   * 检测页面焦点变化
   */
  private handleFocus(): void {
    // 页面重新获得焦点，说明可能从应用返回
    this.cleanup()
  }

  /**
   * 处理启动失败
   */
  private handleLaunchFailure(): void {
    this.options.onFailure?.()
    
    // 延迟跳转到备用链接
    this.visibilityTimer = window.setTimeout(() => {
      this.redirectToFallback()
    }, 1500) // 给用户1.5秒时间取消
  }

  /**
   * 跳转到备用链接
   */
  private redirectToFallback(): void {
    this.options.onRedirect?.()

    if (this.options.enableAutoReturn) {
      // 保存当前页面URL到sessionStorage，用于后续重定向回来
      sessionStorage.setItem('returnUrl', this.options.currentPageUrl!)
    }

    // 跳转到备用链接（通常是应用商店）
    window.location.href = this.options.fallbackUrl
  }

  /**
   * 取消重定向
   */
  cancelRedirect(): void {
    this.cleanup()
    this.options.onFailure?.()
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer)
      this.redirectTimer = null
    }
    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer)
      this.visibilityTimer = null
    }
    this.isLaunching = false

    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    window.removeEventListener('focus', this.handleFocus.bind(this))
  }

  /**
   * 检查并处理返回逻辑
   */
  static checkAndHandleReturn(): boolean {
    const returnUrl = sessionStorage.getItem('returnUrl')
    if (returnUrl && returnUrl !== window.location.href) {
      // 清除存储的URL
      sessionStorage.removeItem('returnUrl')
      
      // 可以选择自动重定向回去
      // window.location.href = returnUrl
      return true
    }
    return false
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.cleanup()
  }
}

/**
 * 便捷函数：直接启动应用
 */
export function launchApp(options: AppLaunchOptions): AppLauncher {
  const launcher = new AppLauncher(options)
  launcher.launch()
  return launcher
}

/**
 * 便捷函数：检查是否需要返回
 */
export function checkReturnUrl(): boolean {
  return AppLauncher.checkAndHandleReturn()
} 