/**
 * 全局事件总线
 * 用于跨组件通信，特别是数据更新通知
 */

type EventCallback = (...args: any[]) => void

class EventBus {
  private events: Map<string, EventCallback[]> = new Map()

  /**
   * 订阅事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)
    console.log(`[EventBus] 订阅事件: ${event}, 当前订阅数: ${this.events.get(event)!.length}`)
  }

  /**
   * 取消订阅事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  off(event: string, callback: EventCallback): void {
    if (!this.events.has(event))
      return

    const callbacks = this.events.get(event)!
    const index = callbacks.indexOf(callback)
    if (index > -1) {
      callbacks.splice(index, 1)
      console.log(`[EventBus] 取消订阅事件: ${event}, 剩余订阅数: ${callbacks.length}`)
    }
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param args 传递给回调函数的参数
   */
  emit(event: string, ...args: any[]): void {
    if (!this.events.has(event)) {
      console.log(`[EventBus] 触发事件: ${event}, 但没有订阅者`)
      return
    }

    const callbacks = this.events.get(event)!
    console.log(`[EventBus] 触发事件: ${event}, 通知 ${callbacks.length} 个订阅者`)
    callbacks.forEach((callback) => {
      try {
        callback(...args)
      }
      catch (error) {
        console.error(`[EventBus] 执行事件回调时出错 (${event}):`, error)
      }
    })
  }

  /**
   * 一次性订阅事件（触发一次后自动取消订阅）
   * @param event 事件名称
   * @param callback 回调函数
   */
  once(event: string, callback: EventCallback): void {
    const onceCallback: EventCallback = (...args: any[]) => {
      callback(...args)
      this.off(event, onceCallback)
    }
    this.on(event, onceCallback)
  }

  /**
   * 清除所有事件订阅
   */
  clear(): void {
    console.log('[EventBus] 清除所有事件订阅')
    this.events.clear()
  }

  /**
   * 获取所有已注册的事件名称
   */
  getEvents(): string[] {
    return Array.from(this.events.keys())
  }
}

// 创建单例实例
export const eventBus = new EventBus()

// 预定义的事件名称常量
export const EventNames = {
  // 统计数据更新事件
  STATS_UPDATED: 'stats:updated',

  // 专注会话相关事件
  FOCUS_SESSION_STARTED: 'focus:session:started',
  FOCUS_SESSION_COMPLETED: 'focus:session:completed',
  FOCUS_SESSION_PAUSED: 'focus:session:paused',

  // 待办事项相关事件
  TODO_CREATED: 'todo:created',
  TODO_UPDATED: 'todo:updated',
  TODO_DELETED: 'todo:deleted',
  TODO_COMPLETED: 'todo:completed',

  // 番茄钟相关事件
  POMODORO_COMPLETED: 'pomodoro:completed',

  // 数据刷新请求
  REQUEST_DATA_REFRESH: 'data:refresh:request',
} as const

export default eventBus
