import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Ip,
  Query,
  UnauthorizedException,
  NotFoundException,
  ClassSerializerInterceptor,
  Res,
} from '@nestjs/common';
import crypto from 'crypto';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TurnstileService } from './turnstile.service';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import type { IAuthRequest } from './interfaces/auth-request.interface';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

import { NoFilesInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly turnstileService: TurnstileService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    schema: { properties: { access_token: { type: 'string' } } },
  })
  @UseInterceptors(NoFilesInterceptor())
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.turnstileService.verify(loginDto.turnstileToken ?? '', ip);

    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = this.authService.login(user);
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const csrfToken = crypto.randomBytes(16).toString('hex');
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { access_token: tokens.access_token };
  }

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with Google' })
  @ApiResponse({
    status: 200,
    schema: { properties: { access_token: { type: 'string' } } },
  })
  @UseInterceptors(NoFilesInterceptor())
  async googleLogin(
    @Body() googleLoginDto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // If it's a standard Google access token, validate it with the access token method
    const user = googleLoginDto.token.startsWith('ya29.')
      ? await this.authService.validateGoogleAccessToken(googleLoginDto.token)
      : await this.authService.validateGoogleUser(googleLoginDto.token);

    const tokens = this.authService.login(user);
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const csrfToken = crypto.randomBytes(16).toString('hex');
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { access_token: tokens.access_token };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiResponse({
    status: 200,
    schema: { properties: { access_token: { type: 'string' } } },
  })
  async refresh(
    @Request() req: IAuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req.cookies as Record<string, string | undefined>)[
      'refresh_token'
    ];
    if (!refreshToken)
      throw new UnauthorizedException('Refresh token not found');

    const tokens = await this.authService.refresh(refreshToken);
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { access_token: tokens.access_token };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @ApiOperation({ summary: 'Logout and clear refresh token cookie' })
  @ApiResponse({
    status: 200,
    schema: { properties: { message: { type: 'string' } } },
  })
  async logout(
    @Request() req: IAuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (token) {
      await this.authService.blacklistToken(token);
    }
    res.clearCookie('refresh_token');
    res.clearCookie('csrf_token', { path: '/' });
    return { message: 'Logout successful' };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({
    status: 200,
    schema: { properties: { message: { type: 'string' } } },
  })
  @UseInterceptors(NoFilesInterceptor())
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({
    status: 200,
    schema: { properties: { message: { type: 'string' } } },
  })
  @UseInterceptors(NoFilesInterceptor())
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({
    status: 200,
    schema: { properties: { message: { type: 'string' } } },
  })
  @UseInterceptors(NoFilesInterceptor())
  async resendVerification(@Body() dto: ResendVerificationDto) {
    const user = await this.authService.findUserByEmailForVerification(
      dto.email,
    );
    if (!user || user.emailVerifiedAt) {
      return {
        message:
          'If your email is registered and unverified, a new link has been sent.',
      };
    }
    await this.authService.sendVerificationEmail(user.id, user.email);
    return {
      message:
        'If your email is registered and unverified, a new link has been sent.',
    };
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address using token from email' })
  @ApiResponse({
    status: 200,
    schema: { properties: { message: { type: 'string' } } },
  })
  async verifyEmail(@Query('token') token: string) {
    if (!token) throw new NotFoundException('Token not provided');
    return this.authService.verifyEmail(token);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: User })
  getProfile(@Request() req: IAuthRequest) {
    return this.authService.getProfile(req.user.userId);
  }
}
