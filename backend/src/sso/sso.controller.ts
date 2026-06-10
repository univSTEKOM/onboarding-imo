import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { SsoService } from './sso.service';
import { AuthService } from '../auth/auth.service';

const isProd = () => process.env.NODE_ENV === 'production';
const SSO_COOKIE_PATH = '/api/auth/sso';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@ApiExcludeController()
@Controller('auth/sso')
export class SsoController {
  constructor(
    private readonly sso: SsoService,
    private readonly authService: AuthService,
    private readonly env: ConfigService,
  ) {}

  // Kick off the OIDC authorization-code + PKCE flow.
  @Get('login')
  async login(@Res() res: Response): Promise<void> {
    const { verifier, challenge, state } = await this.sso.newPkce();
    const transient = {
      httpOnly: true,
      secure: isProd(),
      sameSite: 'lax' as const, // must survive the cross-site return from the IdP
      path: SSO_COOKIE_PATH,
      maxAge: 10 * 60 * 1000,
    };
    res.cookie('sso_verifier', verifier, transient);
    res.cookie('sso_state', state, transient);
    res.redirect(this.sso.buildAuthUrl(challenge, state).href);
  }

  // IdP redirects the browser back here with ?code & ?state.
  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const cookies = req.cookies as Record<string, string | undefined>;
    const verifier = cookies['sso_verifier'];
    const state = cookies['sso_state'];
    if (!verifier || !state) {
      throw new BadRequestException('Missing or expired SSO login session');
    }

    // Rebuild the exact registered redirect URI + the incoming query string.
    const redirectUri = this.env.getOrThrow<string>('SSO_REDIRECT_URI');
    const currentUrl = new URL(redirectUri);
    const qIndex = req.url.indexOf('?');
    currentUrl.search = qIndex >= 0 ? req.url.slice(qIndex) : '';

    const { claims, idToken, sid } = await this.sso.exchange(
      currentUrl,
      verifier,
      state,
    );
    res.clearCookie('sso_verifier', { path: SSO_COOKIE_PATH });
    res.clearCookie('sso_state', { path: SSO_COOKIE_PATH });

    const user = await this.sso.provisionUser(claims);
    const tokens = this.authService.login(user, sid);
    this.setAuthCookies(res, tokens, idToken);

    res.redirect(this.env.get<string>('SSO_SUCCESS_REDIRECT') ?? '/');
  }

  // RP-initiated logout: clear our session, then bounce through the IdP's
  // end-session endpoint so the IdP session ends too.
  @Get('logout')
  ssoLogout(@Req() req: Request, @Res() res: Response): void {
    const cookies = req.cookies as Record<string, string | undefined>;
    const idToken = cookies['sso_id_token'];

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token');
    res.clearCookie('csrf_token', { path: '/' });
    res.clearCookie('sso_id_token', { path: SSO_COOKIE_PATH });

    if (this.sso.enabled && idToken) {
      res.redirect(this.sso.endSessionUrl(idToken).href);
      return;
    }
    res.redirect(this.env.get<string>('SSO_POST_LOGOUT_URI') ?? '/');
  }

  // Back-channel logout: the IdP POSTs a signed logout_token here on single
  // logout. Verify it and revoke the matching session app-wide.
  @Post('backchannel-logout')
  @HttpCode(200)
  async backchannelLogout(
    @Body() body: { logout_token?: string },
  ): Promise<Record<string, never>> {
    if (!body?.logout_token) {
      throw new BadRequestException('logout_token is required');
    }
    const { sid, sub } = await this.sso.verifyLogoutToken(body.logout_token);
    if (sid) {
      await this.authService.revokeSession(sid, sub);
    }
    return {};
  }

  // Mirrors the cookie pattern in auth.controller.ts, plus a non-httpOnly
  // access_token cookie (the SPA decodes it client-side) and an httpOnly
  // sso_id_token kept as the end-session hint — both required by the redirect
  // flow, which can't return the access token in a JSON body.
  private setAuthCookies(
    res: Response,
    tokens: { access_token: string; refresh_token: string },
    idToken: string,
  ): void {
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: isProd(),
      sameSite: 'strict',
      maxAge: WEEK_MS,
    });
    res.cookie('access_token', tokens.access_token, {
      httpOnly: false,
      secure: isProd(),
      sameSite: 'strict',
      path: '/',
      maxAge: WEEK_MS,
    });
    res.cookie('csrf_token', crypto.randomBytes(16).toString('hex'), {
      httpOnly: false,
      secure: isProd(),
      sameSite: 'lax',
      path: '/',
      maxAge: WEEK_MS,
    });
    res.cookie('sso_id_token', idToken, {
      httpOnly: true,
      secure: isProd(),
      sameSite: 'lax',
      path: SSO_COOKIE_PATH,
      maxAge: WEEK_MS,
    });
  }
}
