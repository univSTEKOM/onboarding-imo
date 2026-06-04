import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { IAuthRequest } from './interfaces/auth-request.interface';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionType } from './permissions.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionType[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredPermissions) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<IAuthRequest>();
    return requiredPermissions.some((permission) =>
      user.permissions?.includes(permission),
    );
  }
}
