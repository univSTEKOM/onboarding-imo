import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ALLOW_UNVERIFIED_KEY } from './allow-unverified.decorator';
import type { IAuthRequest } from './interfaces/auth-request.interface';

/**
 * Authenticates the request via the JWT strategy and additionally requires the
 * user's email address to be verified. Routes decorated with
 * `@AllowUnverified()` skip the verification check.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = (await super.canActivate(context)) as boolean;
    if (!isAuthenticated) {
      return false;
    }

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowUnverified) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<IAuthRequest>();
    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Please verify your email address to continue.',
      );
    }

    return true;
  }
}
