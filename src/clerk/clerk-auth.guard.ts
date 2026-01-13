// src/common/guards/clerk-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { clerkClient } from 'src/clerk/clerk.config';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { ROLES_KEY } from 'src/common/decorators/role.decorator';
import { Role } from 'src/modules/employee/enum/role.enum';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private config: ConfigService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return true; // Tạm thời vô hiệu hóa guard để phát triển các phần khác
    const handler = context.getHandler();
    const clazz = context.getClass();

    // ---------------------------
    // 1) Check @Public()
    // ---------------------------
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      handler,
      clazz,
    ]);
    if (isPublic) return true;

    // ---------------------------
    // 2) Get Auth Header
    // ---------------------------
    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization?.split(' ')?.[1];

    if (!token) throw new UnauthorizedException('No authorization token');

    try {
      // ---------------------------
      // 3) Verify JWT bằng Clerk
      // ---------------------------
      const payload = await verifyToken(token, {
        secretKey: this.config.get('CLERK_SECRET_KEY'),
      });

      // ---------------------------
      // 4) Fetch user từ Clerk API
      // ---------------------------
      const user = await clerkClient.users.getUser(payload.sub);
      const role = (user.privateMetadata.role as Role) || Role.STAFF;

      // Gắn user vào request
      req.user = {
        userId: payload.sub,
        email: payload.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role,
        clerkUser: user,
      };

      // ---------------------------
      // 5) Role checking (tích hợp RolesGuard)
      // ---------------------------
      const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
        ROLES_KEY,
        [handler, clazz],
      );

      // Không có yêu cầu role → pass luôn
      if (!requiredRoles?.length) return true;

      // Nếu route có yêu cầu role mà user không thuộc
      if (!requiredRoles.includes(role)) {
        throw new ForbiddenException('No permission');
      }

      return true;
    } catch (err) {
      console.error('Clerk auth error:', err);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
