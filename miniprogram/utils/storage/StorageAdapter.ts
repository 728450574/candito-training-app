// 存储抽象层接口
// 统一本地存储与云端存储的访问契约，所有方法异步 Promise 返回，支持泛型。
// 业务 stores 通过 storageManager.getActiveAdapter() 获取当前实现，不直接依赖具体后端。

export interface StorageAdapter {
  /** 读取指定 key 的值，空值/不存在返回 null */
  get<T>(key: string): Promise<T | null>

  /** 写入指定 key 的值 */
  set<T>(key: string, value: T): Promise<void>

  /** 删除指定 key */
  remove(key: string): Promise<void>

  /** 列出所有以 prefix 开头的 key */
  list(prefix: string): Promise<string[]>

  /** 清除指定前缀的 key；未传 prefix 则清除全部 */
  clear(prefix?: string): Promise<void>
}
