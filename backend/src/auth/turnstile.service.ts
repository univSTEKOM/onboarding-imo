import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
}

@Injectable()
export class TurnstileService {
  constructor(private readonly configService: ConfigService) {}

  async verify(token: string, ip?: string): Promise<void> {
    const secret = this.configService.get<string>('TURNSTILE_SECRET_KEY');

    // Skip verification when not configured (development without a key)
    if (!secret) return;

    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.append('remoteip', ip);

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body },
    );

    if (!response.ok) {
      throw new UnauthorizedException(
        'Security verification service unavailable',
      );
    }

    const data = (await response.json()) as TurnstileResponse;

    if (!data.success) {
      throw new UnauthorizedException(
        'Security verification failed. Please try again.',
      );
    }
  }
}
