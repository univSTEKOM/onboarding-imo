import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: ReturnType<InstanceType<typeof Mailgun>['client']>;
  private readonly domain: string;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY') ?? '';
    const mailgunUrl =
      this.configService.get<string>('MAILGUN_URL') ??
      'https://api.mailgun.net';

    this.domain = this.configService.get<string>('MAILGUN_DOMAIN') ?? '';
    this.from =
      this.configService.get<string>('MAILGUN_FROM') ?? 'no-reply@example.com';
    this.appUrl =
      this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';

    const mg = new Mailgun(FormData);
    this.client = mg.client({ username: 'api', key: apiKey, url: mailgunUrl });
  }

  async sendVerificationEmail(email: string, verifyUrl: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:24px;font-weight:700;color:#0f172a;">
                <span style="color:#F3AA28;">Nest</span><span style="color:#0d9488;">plate</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;padding:40px 36px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Verify your email address</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#64748b;text-align:center;line-height:1.6;">
                Thanks for signing up! Click the button below to verify your email address.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${verifyUrl}"
                       style="display:inline-block;padding:14px 36px;background-color:#0d9488;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.01em;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;text-align:center;">
                This link expires in <strong style="color:#64748b;">24 hours</strong>.
              </p>
              <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 20px;">
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-align:center;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 20px;font-size:12px;text-align:center;word-break:break-all;">
                <a href="${verifyUrl}" style="color:#0d9488;">${verifyUrl}</a>
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} Nestplate. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.client.messages.create(this.domain, {
        from: this.from,
        to: [email],
        subject: 'Verify your email address',
        html,
        text: `Verify your email address\n\nThanks for signing up! Click the link below to verify your email (expires in 24 hours):\n\n${verifyUrl}\n\nIf you didn't create an account, you can safely ignore this email.`,
      });
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
    }
  }

  async sendInvitationEmail(email: string, inviteUrl: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:24px;font-weight:700;color:#0f172a;">
                <span style="color:#F3AA28;">Nest</span><span style="color:#0d9488;">plate</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;padding:40px 36px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">You've been invited</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#64748b;text-align:center;line-height:1.6;">
                You've been invited to join Nestplate. Click the button below to set up your account.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${inviteUrl}"
                       style="display:inline-block;padding:14px 36px;background-color:#0d9488;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.01em;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;text-align:center;">
                This invitation expires in <strong style="color:#64748b;">7 days</strong>.
              </p>
              <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 20px;">
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-align:center;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 20px;font-size:12px;text-align:center;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#0d9488;">${inviteUrl}</a>
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
                If you weren't expecting this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} Nestplate. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.client.messages.create(this.domain, {
        from: this.from,
        to: [email],
        subject: "You've been invited to Nestplate",
        html,
        text: `You've been invited to Nestplate\n\nClick the link below to set up your account (expires in 7 days):\n\n${inviteUrl}\n\nIf you weren't expecting this invitation, you can safely ignore this email.`,
      });
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${email}`, error);
    }
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:24px;font-weight:700;color:#0f172a;">
                <span style="color:#F3AA28;">Nest</span><span style="color:#0d9488;">plate</span>
              </span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;padding:40px 36px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Password Reset Request</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#64748b;text-align:center;line-height:1.6;">
                We received a request to reset the password for your Nestplate account.<br>
                Click the button below to set a new password.
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:14px 36px;background-color:#0d9488;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.01em;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Expiry note -->
              <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;text-align:center;">
                This link expires in <strong style="color:#64748b;">30 minutes</strong>.
              </p>
              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 20px;">
              <!-- Fallback link -->
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-align:center;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 20px;font-size:12px;text-align:center;word-break:break-all;">
                <a href="${resetUrl}" style="color:#0d9488;">${resetUrl}</a>
              </p>
              <!-- Security note -->
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email.<br>
                Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} Nestplate. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.client.messages.create(this.domain, {
        from: this.from,
        to: [email],
        subject: 'Reset your Nestplate password',
        html,
        text: `Reset your Nestplate password\n\nWe received a request to reset your password. Click the link below (expires in 30 minutes):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
    }
  }
}
