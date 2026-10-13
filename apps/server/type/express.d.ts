import type { AuthUser } from '@libs/auth';

declare module 'express' {
  interface Request {
    user: AuthUser;
  }
}
