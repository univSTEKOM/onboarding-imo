import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { describe, beforeEach, it, expect, jest } from 'bun:test';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

function makeRequest(token?: string): Request {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    query: {},
  } as unknown as Request;
}

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: { isTokenBlacklisted: jest.Mock; getProfile: jest.Mock };

  beforeEach(() => {
    authService = { isTokenBlacklisted: jest.fn(), getProfile: jest.fn() };
    const configService = {
      get: jest.fn(() => 'test-secret'),
    } as unknown as ConfigService;
    strategy = new JwtStrategy(
      configService,
      authService as unknown as AuthService,
    );
  });

  const payload: JwtPayload = {
    sub: 1,
    email: 'a@b.com',
    roles: [],
    permissions: [],
    emailVerified: true,
  };

  it('should reject a blacklisted token', async () => {
    authService.isTokenBlacklisted.mockResolvedValue(true);

    await expect(
      strategy.validate(makeRequest('abc'), payload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject when the user no longer exists', async () => {
    authService.isTokenBlacklisted.mockResolvedValue(false);
    authService.getProfile.mockResolvedValue(null);

    await expect(
      strategy.validate(makeRequest('abc'), payload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should return the authenticated user with merged permissions', async () => {
    authService.isTokenBlacklisted.mockResolvedValue(false);
    authService.getProfile.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      emailVerifiedAt: new Date(),
      permissions: [{ name: 'direct.perm' }],
      roles: [{ name: 'editor', permissions: [{ name: 'role.perm' }] }],
    });

    const result = await strategy.validate(makeRequest('abc'), payload);

    expect(result.userId).toBe(1);
    expect(result.roles).toEqual(['editor']);
    expect(result.permissions.sort()).toEqual(['direct.perm', 'role.perm']);
    expect(result.emailVerified).toBe(true);
  });

  it('should extract the token from the query string when no header is present', async () => {
    authService.isTokenBlacklisted.mockResolvedValue(false);
    authService.getProfile.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      emailVerifiedAt: null,
      permissions: [],
      roles: [],
    });
    const req = {
      headers: {},
      query: { token: 'query-token' },
    } as unknown as Request;

    await strategy.validate(req, payload);

    expect(authService.isTokenBlacklisted).toHaveBeenCalledWith('query-token');
  });
});
