import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as client from 'openid-client';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { UsersService } from '../users/users.service';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';

const SCOPE = 'openid email profile roles divisions offline_access';
const BACKCHANNEL_LOGOUT_EVENT =
  'http://schemas.openid.net/event/backchannel-logout';

export interface SsoClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  phone_number?: string;
  sid?: string;
}

export interface SsoCallbackResult {
  claims: SsoClaims;
  idToken: string;
  sid?: string;
}

@Injectable()
export class SsoService implements OnModuleInit {
  private readonly logger = new Logger(SsoService.name);
  private config?: client.Configuration;
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly env: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  // Provision-or-update the local user for an SSO identity. SSO is the identity
  // source: a first-time user is auto-created (email-based, auto-verified, with a
  // random unusable password) and granted the configured default role; the
  // SSO roles/permissions claims are intentionally ignored (managed in-app).
  async provisionUser(claims: SsoClaims): Promise<Omit<User, 'password'>> {
    const email = claims.email!;
    const existing = await this.usersService.findOneByEmail(email);

    if (!existing) {
      const defaultRoleName =
        this.env.get<string>('SSO_DEFAULT_ROLE') ?? 'user';
      const role = await this.rolesRepository.findOneBy({
        name: defaultRoleName,
      });
      await this.usersService.create(
        {
          email,
          password: crypto.randomBytes(32).toString('hex'),
          fullname: claims.name,
          phone: claims.phone_number,
          roleIds: role ? [role.id] : undefined,
        },
        { autoVerify: true },
      );
    } else if (
      (claims.name && claims.name !== existing.fullname) ||
      (claims.phone_number && claims.phone_number !== existing.phone)
    ) {
      await this.usersService.update(existing.id, {
        fullname: claims.name ?? existing.fullname ?? undefined,
        phone: claims.phone_number ?? existing.phone ?? undefined,
      });
    }

    // Reload with roles + role permissions so login() can build the JWT claims.
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Failed to provision SSO user');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  get enabled(): boolean {
    return !!this.config;
  }

  async onModuleInit(): Promise<void> {
    const issuer = this.env.get<string>('SSO_ISSUER');
    const clientId = this.env.get<string>('SSO_CLIENT_ID');
    const clientSecret = this.env.get<string>('SSO_CLIENT_SECRET');

    if (!issuer || !clientId || !clientSecret) {
      this.logger.log(
        'SSO not configured (SSO_ISSUER unset) — SSO login disabled',
      );
      return;
    }

    try {
      this.config = await client.discovery(
        new URL(issuer),
        clientId,
        clientSecret,
        client.ClientSecretPost(clientSecret),
      );
      this.jwks = createRemoteJWKSet(
        new URL(`${issuer.replace(/\/$/, '')}/jwks`),
      );
      this.logger.log(`SSO discovery complete for issuer ${issuer}`);
    } catch (err) {
      this.logger.error(
        'SSO discovery failed — SSO login disabled',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  private requireConfig(): client.Configuration {
    if (!this.config) {
      throw new ServiceUnavailableException('SSO is not configured');
    }
    return this.config;
  }

  async newPkce(): Promise<{
    verifier: string;
    challenge: string;
    state: string;
  }> {
    const verifier = client.randomPKCECodeVerifier();
    const challenge = await client.calculatePKCECodeChallenge(verifier);
    return { verifier, challenge, state: client.randomState() };
  }

  // `prompt: 'none'` requests a silent authorization — the IdP either returns a
  // code (an active session exists) or errors with `login_required`.
  buildAuthUrl(challenge: string, state: string, prompt?: 'none'): URL {
    return client.buildAuthorizationUrl(this.requireConfig(), {
      redirect_uri: this.env.getOrThrow<string>('SSO_REDIRECT_URI'),
      scope: SCOPE,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      ...(prompt ? { prompt } : {}),
    });
  }

  async exchange(
    currentUrl: URL,
    verifier: string,
    state: string,
  ): Promise<SsoCallbackResult> {
    const tokens = await client.authorizationCodeGrant(
      this.requireConfig(),
      currentUrl,
      { pkceCodeVerifier: verifier, expectedState: state },
    );
    const claims = tokens.claims() as unknown as SsoClaims | undefined;
    if (!claims?.email) {
      throw new UnauthorizedException(
        'SSO token did not include an email claim',
      );
    }
    return { claims, idToken: tokens.id_token!, sid: claims.sid };
  }

  endSessionUrl(idToken: string): URL {
    return client.buildEndSessionUrl(this.requireConfig(), {
      id_token_hint: idToken,
      post_logout_redirect_uri: this.env.getOrThrow<string>(
        'SSO_POST_LOGOUT_URI',
      ),
    });
  }

  // Verify a back-channel logout_token per the OIDC Back-Channel Logout spec:
  // RS256 against the IdP JWKS, matching iss/aud, the backchannel-logout event
  // claim present, and no `nonce`. Returns the targeted session id / subject.
  async verifyLogoutToken(
    logoutToken: string,
  ): Promise<{ sid?: string; sub?: string }> {
    if (!this.config || !this.jwks) {
      throw new ServiceUnavailableException('SSO is not configured');
    }
    const { payload } = await jwtVerify(logoutToken, this.jwks, {
      issuer: this.env.getOrThrow<string>('SSO_ISSUER'),
      audience: this.env.getOrThrow<string>('SSO_CLIENT_ID'),
    });

    const events = payload.events as Record<string, unknown> | undefined;
    if (!events || !(BACKCHANNEL_LOGOUT_EVENT in events)) {
      throw new UnauthorizedException('Not a back-channel logout token');
    }
    if ('nonce' in payload) {
      throw new UnauthorizedException('logout_token must not contain a nonce');
    }
    const sid = typeof payload.sid === 'string' ? payload.sid : undefined;
    const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
    if (!sid && !sub) {
      throw new UnauthorizedException('logout_token missing sid and sub');
    }
    return { sid, sub };
  }
}
