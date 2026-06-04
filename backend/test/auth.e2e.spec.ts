import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'bun:test';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { setupTestApp, type TestContext } from './utils/setup-app';
import {
  adminEmail,
  adminPassword,
  adminToken,
  createUser,
  loginViaHttp,
  tokenFor,
} from './utils/auth';
import { cleanDatabase } from './utils/db-clean';
import { PasswordResetToken } from '@/auth/entities/password-reset-token.entity';
import { EmailVerificationToken } from '@/auth/entities/email-verification-token.entity';
import { User } from '@/users/entities/user.entity';

describe('Auth (e2e)', () => {
  let ctx: TestContext;
  let server: App;

  beforeAll(async () => {
    ctx = await setupTestApp();
    server = ctx.app.getHttpServer() as App;
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.dataSource, adminEmail());
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('POST /auth/login', () => {
    it('logs the admin in and sets auth cookies', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: adminEmail(), password: adminPassword() })
        .expect(201);

      expect(res.body.access_token).toBeDefined();
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
      expect(cookies.some((c) => c.startsWith('csrf_token='))).toBe(true);
    });

    it('rejects a wrong password with 401', async () => {
      await request(server)
        .post('/api/auth/login')
        .send({ email: adminEmail(), password: 'wrong-password' })
        .expect(401);
    });

    it('rejects a malformed email with 400', async () => {
      await request(server)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'whatever' })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('issues a new access token with a valid refresh + CSRF pair', async () => {
      const { cookies, csrfToken } = await loginViaHttp(
        ctx,
        adminEmail(),
        adminPassword(),
      );

      const res = await request(server)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .expect(201);

      expect(res.body.access_token).toBeDefined();
    });

    it('rejects when the CSRF token is missing with 403', async () => {
      const { cookies } = await loginViaHttp(
        ctx,
        adminEmail(),
        adminPassword(),
      );

      await request(server)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('POST /auth/logout', () => {
    it('blacklists the access token so it can no longer be used', async () => {
      const { accessToken, cookies, csrfToken } = await loginViaHttp(
        ctx,
        adminEmail(),
        adminPassword(),
      );

      await request(server)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .expect(201);

      await request(server)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('rejects logout without a CSRF token with 403', async () => {
      const { accessToken } = await loginViaHttp(
        ctx,
        adminEmail(),
        adminPassword(),
      );

      await request(server)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });

  describe('GET /auth/profile', () => {
    it('returns the current user for a valid token', async () => {
      const token = await adminToken(ctx);

      const res = await request(server)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.email).toBe(adminEmail());
    });

    it('rejects an unauthenticated request with 401', async () => {
      await request(server).get('/api/auth/profile').expect(401);
    });

    it('stays reachable for an unverified user (guarded by raw AuthGuard)', async () => {
      // /auth/profile uses AuthGuard('jwt') directly — not the email-verifying
      // JwtAuthGuard — so it must remain accessible before verification.
      const user = await createUser(ctx, {
        email: 'unverified@b.com',
        verified: false,
      });
      const token = tokenFor(ctx, user.id, user.email);

      await request(server)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('returns a generic message and mails a known address', async () => {
      const res = await request(server)
        .post('/api/auth/forgot-password')
        .send({ email: adminEmail() })
        .expect(201);

      expect(res.body.message).toContain('If an account');
      expect(ctx.mail.sendPasswordReset).toHaveBeenCalled();
    });

    it('rejects a malformed email with 400', async () => {
      await request(server)
        .post('/api/auth/forgot-password')
        .send({ email: 'nope' })
        .expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('resets the password for a valid token', async () => {
      const user = await createUser(ctx, { email: 'resettable@b.com' });
      const repo = ctx.app.get<Repository<PasswordResetToken>>(
        getRepositoryToken(PasswordResetToken),
      );
      const token = randomUUID();
      await repo.save(
        repo.create({
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      );

      await request(server)
        .post('/api/auth/reset-password')
        .send({ token, password: 'brand-new-pass' })
        .expect(201);

      await request(server)
        .post('/api/auth/login')
        .send({ email: 'resettable@b.com', password: 'brand-new-pass' })
        .expect(201);
    });

    it('rejects an unknown token with 400', async () => {
      await request(server)
        .post('/api/auth/reset-password')
        .send({ token: randomUUID(), password: 'brand-new-pass' })
        .expect(400);
    });

    it('rejects a non-UUID token with 400', async () => {
      await request(server)
        .post('/api/auth/reset-password')
        .send({ token: 'not-a-uuid', password: 'brand-new-pass' })
        .expect(400);
    });
  });

  describe('GET /auth/verify-email', () => {
    it('verifies the email for a valid token', async () => {
      const user = await createUser(ctx, {
        email: 'toverify@b.com',
        verified: false,
      });
      const repo = ctx.app.get<Repository<EmailVerificationToken>>(
        getRepositoryToken(EmailVerificationToken),
      );
      const token = 'verify-token-123';
      await repo.save(
        repo.create({
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      );

      await request(server)
        .get(`/api/auth/verify-email?token=${token}`)
        .expect(200);

      const userRepo = ctx.app.get<Repository<User>>(getRepositoryToken(User));
      const refreshed = await userRepo.findOneByOrFail({ id: user.id });
      expect(refreshed.emailVerifiedAt).toBeTruthy();
    });

    it('returns 404 when the token is missing', async () => {
      await request(server).get('/api/auth/verify-email').expect(404);
    });

    it('returns 404 for an unknown token', async () => {
      await request(server)
        .get('/api/auth/verify-email?token=does-not-exist')
        .expect(404);
    });
  });

  describe('POST /auth/google', () => {
    it('rejects an invalid Google token with 401', async () => {
      await request(server)
        .post('/api/auth/google')
        .send({ token: 'invalid-google-id-token' })
        .expect(401);
    });
  });
});
