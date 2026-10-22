/**
 * 浏览器 localStorage 封装。
 * 隐私模式、禁用存储或超出配额时不抛错，写入结果用返回值表示。
 */
export const localStore = {
  /**
   * 读取原始字符串。
   * @param key 存储键
   * @returns 存储值；不存在或存储不可用时为 null
   */
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /**
   * 写入原始字符串。主题等需要和页面内联脚本共用的值应走这里，不要再包一层 JSON。
   * @param key 存储键
   * @param value 原始字符串
   * @returns 是否写入成功
   */
  setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 删除一项。
   * @param key 存储键
   * @returns 是否删除成功
   */
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 读取并解析 JSON。
   * @param key 存储键
   * @returns 解析后的值；不存在、存储不可用或内容损坏时为 null
   */
  getJSON<T>(key: string): T | null {
    const raw = this.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  /**
   * 将值序列化为 JSON 后写入。`undefined` 会删除该项。
   * @param key 存储键
   * @param value 可序列化的值
   * @returns 是否写入成功
   */
  setJSON(key: string, value: unknown): boolean {
    if (value === undefined) return this.removeItem(key);
    try {
      const raw = JSON.stringify(value);
      if (raw === undefined) return false;
      return this.setItem(key, raw);
    } catch {
      return false;
    }
  },
};
