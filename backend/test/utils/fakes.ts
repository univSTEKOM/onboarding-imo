import { jest } from 'bun:test';

/**
 * In-memory stand-ins for the external services the app talks to, so E2E tests
 * are deterministic and need no real credentials or network access.
 */

export interface FakeMailService {
  sendVerificationEmail: jest.Mock;
  sendInvitationEmail: jest.Mock;
  sendPasswordReset: jest.Mock;
}

export function makeFakeMail(): FakeMailService {
  return {
    sendVerificationEmail: jest.fn(async () => undefined),
    sendInvitationEmail: jest.fn(async () => undefined),
    sendPasswordReset: jest.fn(async () => undefined),
  };
}

export const fakeTurnstile = {
  verify: async (): Promise<void> => undefined,
};

export const passThroughGuard = {
  canActivate: (): boolean => true,
};

/**
 * Fake Bun `S3Client`. `write` is a no-op and `arrayBuffer` returns fixed bytes
 * so upload / view / stream endpoints behave end-to-end without touching S3.
 */
export function makeFakeS3() {
  const bytes = new TextEncoder().encode('fake-file-bytes');
  return {
    file: () => ({
      write: async (): Promise<number> => bytes.byteLength,
      arrayBuffer: async (): Promise<ArrayBuffer> => bytes.buffer.slice(0),
    }),
  };
}
