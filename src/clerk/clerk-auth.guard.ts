// src/common/guards/clerk-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { clerkClient } from 'src/clerk/clerk.config';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private config: ConfigService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 🟢 check decorator @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization?.split(' ')?.[1];

    if (!token) {
      throw new UnauthorizedException('No authorization token');
    }

    try {
      // 🟢 verify JWT
      const payload = await verifyToken(token, {
        secretKey: this.config.get('CLERK_SECRET_KEY'),
      });

      // 🟢 fetch user profile from Clerk
      const user = await clerkClient.users.getUser(payload.sub);

      const role = user.privateMetadata.role || 'user';

      // attach to request
      req.user = {
        userId: payload.sub,
        email: payload.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role,
        clerkUser: user,
      };

      return true;
    } catch (err) {
      console.error('Clerk auth error:', err);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
