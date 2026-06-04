import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { MailService } from '../mail/mail.service';

import { User } from '../users/entities/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(BlacklistedToken)
    private blacklistedTokenRepository: Repository<BlacklistedToken>,
    @InjectRepository(PasswordResetToken)
    private resetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(EmailVerificationToken)
    private verificationTokenRepository: Repository<EmailVerificationToken>,
    private configService: ConfigService,
    private mailService: MailService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async validateGoogleUser(token: string): Promise<Omit<User, 'password'>> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const user = await this.usersService.findOneByEmail(payload.email);
      if (!user) {
        throw new UnauthorizedException(
          `Your email (${payload.email}) is not registered in this system. Please contact an administrator to get access.`,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async validateGoogleAccessToken(
    accessToken: string,
  ): Promise<Omit<User, 'password'>> {
    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new UnauthorizedException('Invalid Google access token');
      }

      const payload = (await response.json()) as { email: string };
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google user information');
      }

      const user = await this.usersService.findOneByEmail(payload.email);
      if (!user) {
        throw new UnauthorizedException(
          `Your email (${payload.email}) is not registered in this system. Please contact an administrator to get access.`,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Google access token validation failed');
    }
  }

  login(user: Omit<User, 'password'>) {
    const permissions = new Set<string>();
    user.permissions?.forEach((p) => permissions.add(p.name));
    user.roles?.forEach((r) => {
      r.permissions?.forEach((p) => permissions.add(p.name));
    });

    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      roles: user.roles?.map((r) => r.name) || [],
      permissions: Array.from(permissions),
      emailVerified: !!user.emailVerifiedAt,
    };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  async blacklistToken(token: string) {
    const blacklistedToken = this.blacklistedTokenRepository.create({ token });
    await this.blacklistedTokenRepository.save(blacklistedToken);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistedToken = await this.blacklistedTokenRepository.findOneBy({
      token,
    });
    return !!blacklistedToken;
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);
      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      const permissions = new Set<string>();
      user.permissions?.forEach((p) => permissions.add(p.name));
      user.roles?.forEach((r) => {
        r.permissions?.forEach((p) => permissions.add(p.name));
      });

      const newPayload: JwtPayload = {
        email: user.email,
        sub: user.id,
        roles: user.roles?.map((r) => r.name) || [],
        permissions: Array.from(permissions),
        emailVerified: !!user.emailVerifiedAt,
      };

      return {
        access_token: this.jwtService.sign(newPayload),
        refresh_token: this.jwtService.sign(newPayload, { expiresIn: '7d' }),
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getProfile(userId: number) {
    return this.usersService.findOne(userId);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const GENERIC_MESSAGE =
      'If an account with that email exists, a reset link has been sent.';

    const user = await this.usersService.findOneByEmail(email);
    if (!user) return { message: GENERIC_MESSAGE };

    // Remove any existing unused tokens for this user
    await this.resetTokenRepository.delete({
      userId: user.id,
      usedAt: IsNull(),
    });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.resetTokenRepository.save(
      this.resetTokenRepository.create({ token, userId: user.id, expiresAt }),
    );

    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await this.mailService.sendPasswordReset(email, resetUrl);

    return { message: GENERIC_MESSAGE };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    const INVALID_MSG = 'Invalid or expired reset token.';

    const resetToken = await this.resetTokenRepository.findOneBy({ token });
    if (!resetToken) throw new BadRequestException(INVALID_MSG);
    if (resetToken.usedAt !== null) throw new BadRequestException(INVALID_MSG);
    if (resetToken.expiresAt < new Date())
      throw new BadRequestException(INVALID_MSG);

    await this.usersService.update(resetToken.userId, { password });

    resetToken.usedAt = new Date();
    await this.resetTokenRepository.save(resetToken);

    return { message: 'Password has been reset successfully.' };
  }

  async findUserByEmailForVerification(email: string) {
    return this.usersService.findOneByEmail(email);
  }

  @OnEvent('user.created')
  async onUserCreated(payload: {
    userId: number;
    email: string;
    emailVerified?: boolean;
  }) {
    // Invited users arrive via an emailed link, so their address is already
    // proven — skip the separate verification email for them.
    if (payload.emailVerified) return;
    await this.sendVerificationEmail(payload.userId, payload.email);
  }

  async sendVerificationEmail(userId: number, email: string): Promise<void> {
    // Remove existing unused tokens for this user
    await this.verificationTokenRepository.delete({
      userId,
      usedAt: IsNull(),
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.verificationTokenRepository.save(
      this.verificationTokenRepository.create({ token, userId, expiresAt }),
    );

    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    await this.mailService.sendVerificationEmail(email, verifyUrl);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const record = await this.verificationTokenRepository.findOneBy({ token });
    if (!record) throw new NotFoundException('Verification token not found');
    if (record.usedAt) throw new BadRequestException('Token already used');
    if (record.expiresAt < new Date())
      throw new BadRequestException('Token expired');

    await this.usersService.markEmailVerified(record.userId);

    record.usedAt = new Date();
    await this.verificationTokenRepository.save(record);

    return { message: 'Email verified successfully' };
  }
}
