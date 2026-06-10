import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, beforeEach, afterEach, it, expect, jest } from 'bun:test';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { RevokedSsoSession } from './entities/revoked-sso-session.entity';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findOneByEmail: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    markEmailVerified: jest.Mock;
  };
  let jwtService: JwtService;
  let mailService: {
    sendPasswordReset: jest.Mock;
    sendVerificationEmail: jest.Mock;
    sendInvitationEmail: jest.Mock;
  };
  let resetTokenRepository: {
    delete: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };
  let verificationTokenRepository: {
    delete: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };
  let blacklistRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };
  let revokedSsoSessionRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      findOneByEmail: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      markEmailVerified: jest.fn(),
    };
    mailService = {
      sendPasswordReset: jest.fn(),
      sendVerificationEmail: jest.fn(),
      sendInvitationEmail: jest.fn(),
    };
    resetTokenRepository = {
      delete: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((e) => Promise.resolve(e)),
      findOneBy: jest.fn(),
    };
    verificationTokenRepository = {
      delete: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((e) => Promise.resolve(e)),
      findOneBy: jest.fn(),
    };
    blacklistRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((e) => Promise.resolve(e)),
      findOneBy: jest.fn(),
    };
    revokedSsoSessionRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((e) => Promise.resolve(e)),
      findOneBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'signed-token'), verify: jest.fn() },
        },
        {
          provide: getRepositoryToken(BlacklistedToken),
          useValue: blacklistRepository,
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: resetTokenRepository,
        },
        {
          provide: getRepositoryToken(EmailVerificationToken),
          useValue: verificationTokenRepository,
        },
        {
          provide: getRepositoryToken(RevokedSsoSession),
          useValue: revokedSsoSessionRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GOOGLE_CLIENT_ID') return 'google-client-id';
              if (key === 'APP_URL') return 'http://localhost:3000';
              return undefined;
            }),
          },
        },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return the user without the password when credentials match', async () => {
      const hash = await bcrypt.hash('secret', 10);
      usersService.findOneByEmail.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        password: hash,
      });

      const result = await service.validateUser('a@b.com', 'secret');

      expect(result).toBeTruthy();
      expect((result as Record<string, unknown>).password).toBeUndefined();
      expect((result as User).email).toBe('a@b.com');
    });

    it('should return null when the password is wrong', async () => {
      const hash = await bcrypt.hash('secret', 10);
      usersService.findOneByEmail.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        password: hash,
      });

      await expect(
        service.validateUser('a@b.com', 'wrong'),
      ).resolves.toBeNull();
    });

    it('should return null when the email is unknown', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('missing@b.com', 'secret'),
      ).resolves.toBeNull();
    });
  });

  describe('login', () => {
    it('should sign access and refresh tokens with merged permissions', () => {
      const user = {
        id: 1,
        email: 'a@b.com',
        emailVerifiedAt: new Date(),
        permissions: [{ name: 'direct.perm' }],
        roles: [{ name: 'editor', permissions: [{ name: 'role.perm' }] }],
      } as unknown as User;

      const result = service.login(user);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      const payload = (jwtService.sign as jest.Mock).mock.calls[0][0] as {
        permissions: string[];
        emailVerified: boolean;
        roles: string[];
      };
      expect(payload.permissions.sort()).toEqual(['direct.perm', 'role.perm']);
      expect(payload.roles).toEqual(['editor']);
      expect(payload.emailVerified).toBe(true);
    });
  });

  describe('token blacklist', () => {
    it('blacklistToken should persist the token', async () => {
      await service.blacklistToken('abc');
      expect(blacklistRepository.create).toHaveBeenCalledWith({ token: 'abc' });
      expect(blacklistRepository.save).toHaveBeenCalled();
    });

    it('isTokenBlacklisted should reflect repository lookups', async () => {
      blacklistRepository.findOneBy.mockResolvedValue({ token: 'abc' });
      await expect(service.isTokenBlacklisted('abc')).resolves.toBe(true);

      blacklistRepository.findOneBy.mockResolvedValue(null);
      await expect(service.isTokenBlacklisted('abc')).resolves.toBe(false);
    });
  });

  describe('refresh', () => {
    it('should issue fresh tokens for a valid refresh token', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 1 });
      usersService.findOne.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        roles: [],
        permissions: [],
      });

      const result = await service.refresh('valid-refresh');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('should throw UnauthorizedException for an invalid refresh token', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('bad token');
      });

      await expect(service.refresh('bad')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should return the generic message without mailing an unknown email', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@b.com');

      expect(result.message).toContain('If an account');
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should create a reset token and send the email for a known user', async () => {
      usersService.findOneByEmail.mockResolvedValue({ id: 1 });

      await service.forgotPassword('a@b.com');

      expect(resetTokenRepository.delete).toHaveBeenCalled();
      expect(resetTokenRepository.save).toHaveBeenCalled();
      expect(mailService.sendPasswordReset).toHaveBeenCalledWith(
        'a@b.com',
        expect.stringContaining('/reset-password?token='),
      );
    });
  });

  describe('resetPassword', () => {
    it('should reject an unknown token', async () => {
      resetTokenRepository.findOneBy.mockResolvedValue(null);
      await expect(service.resetPassword('t', 'pw')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject an already used token', async () => {
      resetTokenRepository.findOneBy.mockResolvedValue({
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      });
      await expect(service.resetPassword('t', 'pw')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject an expired token', async () => {
      resetTokenRepository.findOneBy.mockResolvedValue({
        usedAt: null,
        expiresAt: new Date(Date.now() - 10000),
      });
      await expect(service.resetPassword('t', 'pw')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update the password and consume the token when valid', async () => {
      const token = {
        userId: 5,
        usedAt: null,
        expiresAt: new Date(Date.now() + 10000),
      };
      resetTokenRepository.findOneBy.mockResolvedValue(token);

      const result = await service.resetPassword('t', 'new-pw');

      expect(usersService.update).toHaveBeenCalledWith(5, {
        password: 'new-pw',
      });
      expect(token.usedAt).toBeInstanceOf(Date);
      expect(result.message).toContain('reset successfully');
    });
  });

  describe('validateGoogleUser', () => {
    it('should throw when the Google payload has no email', async () => {
      (service as unknown as { googleClient: unknown }).googleClient = {
        verifyIdToken: jest.fn().mockResolvedValue({ getPayload: () => null }),
      };

      await expect(service.validateGoogleUser('tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw when the email is not registered', async () => {
      (service as unknown as { googleClient: unknown }).googleClient = {
        verifyIdToken: jest
          .fn()
          .mockResolvedValue({ getPayload: () => ({ email: 'x@b.com' }) }),
      };
      usersService.findOneByEmail.mockResolvedValue(null);

      await expect(service.validateGoogleUser('tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return the user without password when registered', async () => {
      (service as unknown as { googleClient: unknown }).googleClient = {
        verifyIdToken: jest
          .fn()
          .mockResolvedValue({ getPayload: () => ({ email: 'x@b.com' }) }),
      };
      usersService.findOneByEmail.mockResolvedValue({
        id: 1,
        email: 'x@b.com',
        password: 'secret-hash',
      });

      const result = await service.validateGoogleUser('tok');
      expect((result as Record<string, unknown>).password).toBeUndefined();
    });
  });

  describe('validateGoogleAccessToken', () => {
    const originalFetch = globalThis.fetch;
    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should throw when Google rejects the access token', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({ ok: false }) as never;

      await expect(service.validateGoogleAccessToken('ya29.x')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return the registered user for a valid access token', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ email: 'x@b.com' }),
      }) as never;
      usersService.findOneByEmail.mockResolvedValue({
        id: 1,
        email: 'x@b.com',
        password: 'secret-hash',
      });

      const result = await service.validateGoogleAccessToken('ya29.x');
      expect((result as User).email).toBe('x@b.com');
    });
  });

  describe('verifyEmail', () => {
    it('should throw NotFoundException for an unknown token', async () => {
      verificationTokenRepository.findOneBy.mockResolvedValue(null);
      await expect(service.verifyEmail('t')).rejects.toThrow(NotFoundException);
    });

    it('should reject an already used token', async () => {
      verificationTokenRepository.findOneBy.mockResolvedValue({
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      });
      await expect(service.verifyEmail('t')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject an expired token', async () => {
      verificationTokenRepository.findOneBy.mockResolvedValue({
        usedAt: null,
        expiresAt: new Date(Date.now() - 10000),
      });
      await expect(service.verifyEmail('t')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should mark the email verified and consume the token when valid', async () => {
      const record = {
        userId: 5,
        usedAt: null,
        expiresAt: new Date(Date.now() + 10000),
      };
      verificationTokenRepository.findOneBy.mockResolvedValue(record);

      const result = await service.verifyEmail('t');

      expect(usersService.markEmailVerified).toHaveBeenCalledWith(5);
      expect(record.usedAt).toBeInstanceOf(Date);
      expect(result.message).toContain('verified');
    });
  });

  describe('sendVerificationEmail', () => {
    it('should purge old tokens, persist a new one and mail the link', async () => {
      await service.sendVerificationEmail(5, 'a@b.com');

      expect(verificationTokenRepository.delete).toHaveBeenCalled();
      expect(verificationTokenRepository.save).toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        'a@b.com',
        expect.stringContaining('/verify-email?token='),
      );
    });
  });
});
