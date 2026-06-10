import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import type { Request } from 'express';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          const query = req.query as Record<string, unknown>;
          const token = query.token;
          return typeof token === 'string' ? token : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'secretKey',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const query = req.query as Record<string, unknown>;
    const queryToken = query.token;
    const token =
      ExtractJwt.fromAuthHeaderAsBearerToken()(req) ||
      (typeof queryToken === 'string' ? queryToken : undefined);

    if (token && (await this.authService.isTokenBlacklisted(token))) {
      throw new UnauthorizedException('Token is invalidated');
    }

    // SSO sessions ended via back-channel logout are revoked by their sid.
    if (payload.sid && (await this.authService.isSessionRevoked(payload.sid))) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const user = await this.authService.getProfile(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = new Set<string>();
    if (user.permissions) {
      user.permissions.forEach((p) => permissions.add(p.name));
    }
    if (user.roles) {
      user.roles.forEach((r) => {
        if (r.permissions) {
          r.permissions.forEach((p) => permissions.add(p.name));
        }
      });
    }

    return {
      userId: user.id,
      email: user.email,
      roles: user.roles ? user.roles.map((r) => r.name) : [],
      permissions: Array.from(permissions),
      emailVerified: !!user.emailVerifiedAt,
    };
  }
}
