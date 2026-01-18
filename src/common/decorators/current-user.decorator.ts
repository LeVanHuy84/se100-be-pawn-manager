import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserInfo {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserInfo => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
