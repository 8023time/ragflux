/** 发送邮箱验证码。 */
export interface SendCodeRequest {
  email: string;
}

/** 使用邮箱验证码登录。 */
export interface LoginRequest {
  email: string;
  code: string;
}

/** 当前用户的公开信息。 */
export interface AuthUser {
  id: number;
  email: string;
  nickname: string;
}

/** 登录成功后返回的用户与访问令牌。刷新令牌放在 Cookie 中。 */
export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

/** 刷新访问令牌后的响应。只包含新的访问令牌，不返回用户信息。 */
export interface RefreshResponse {
  accessToken: string;
}
