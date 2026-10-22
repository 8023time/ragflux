/** HTTP JSON 响应信封。成功时 code 为 0，data 为业务数据；失败时 code 非 0，msg 为错误说明。 */
export interface ApiResponse<T> {
  code: number;
  msg?: string;
  data?: T;
}
