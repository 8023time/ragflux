import type { CookieOptions, Request, Response } from 'express';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

export type RefreshTokenCookieConfig = {
  secure: boolean;
  maxAge: number;
};

function refreshTokenCookieOptions(config: RefreshTokenCookieConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.secure,
    sameSite: 'lax',
    maxAge: config.maxAge,
    path: '/',
  };
}

export function setRefreshTokenCookie(res: Response, refreshToken: string, config: RefreshTokenCookieConfig) {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions(config));
}

export function clearRefreshTokenCookie(res: Response, config: RefreshTokenCookieConfig) {
  res.cookie(REFRESH_TOKEN_COOKIE, '', {
    ...refreshTokenCookieOptions(config),
    maxAge: 0,
  });
}

export function readRefreshToken(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  const fromParsed = cookies?.[REFRESH_TOKEN_COOKIE];
  if (fromParsed) {
    return fromParsed;
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) {
      continue;
    }

    const key = part.slice(0, separator).trim();
    if (key !== REFRESH_TOKEN_COOKIE) {
      continue;
    }

    return decodeURIComponent(part.slice(separator + 1).trim());
  }

  return undefined;
}
