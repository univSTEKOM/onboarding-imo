import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { describe, beforeEach, it, expect, jest } from 'bun:test';
import { MailService } from './mail.service';

interface MailClient {
  messages: { create: jest.Mock };
}

describe('MailService', () => {
  let service: MailService;
  let messagesCreate: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'MAILGUN_API_KEY') return 'test-api-key';
              if (key === 'MAILGUN_DOMAIN') return 'mg.test.com';
              if (key === 'MAILGUN_FROM') return 'no-reply@test.com';
              if (key === 'APP_URL') return 'http://localhost:3000';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    // The real Mailgun client is built in the constructor (network-free). Swap
    // it for a fake so no request is ever issued during the tests.
    messagesCreate = jest.fn().mockResolvedValue({ id: 'msg-1' });
    (service as unknown as { client: MailClient }).client = {
      messages: { create: messagesCreate },
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sendVerificationEmail should send to the address with the verify link', async () => {
    await service.sendVerificationEmail('user@b.com', 'http://verify/abc');

    expect(messagesCreate).toHaveBeenCalledTimes(1);
    const [domain, payload] = messagesCreate.mock.calls[0] as [
      string,
      { to: string[]; subject: string; html: string; text: string },
    ];
    expect(domain).toBe('mg.test.com');
    expect(payload.to).toEqual(['user@b.com']);
    expect(payload.subject).toMatch(/verify/i);
    expect(payload.html).toContain('http://verify/abc');
  });

  it('sendInvitationEmail should send the invitation link', async () => {
    await service.sendInvitationEmail('user@b.com', 'http://invite/abc');

    const [, payload] = messagesCreate.mock.calls[0] as [
      string,
      { subject: string; text: string },
    ];
    expect(payload.subject).toMatch(/invited/i);
    expect(payload.text).toContain('http://invite/abc');
  });

  it('sendPasswordReset should send the reset link', async () => {
    await service.sendPasswordReset('user@b.com', 'http://reset/abc');

    const [, payload] = messagesCreate.mock.calls[0] as [
      string,
      { subject: string; html: string },
    ];
    expect(payload.subject).toMatch(/reset/i);
    expect(payload.html).toContain('http://reset/abc');
  });

  it('should swallow transport errors instead of throwing', async () => {
    messagesCreate.mockRejectedValue(new Error('mailgun down'));

    await expect(
      service.sendVerificationEmail('user@b.com', 'http://verify/abc'),
    ).resolves.toBeUndefined();
  });
});
