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
 * Fake Depot `DepotClient`. `upload` returns a fake `MediaFile`, `getUrl` a
 * fake signed URL, and `delete` is a no-op — so upload / view / stream / delete
 * endpoints behave end-to-end without touching Depot or S3.
 */
export function makeFakeDepot() {
  let nextId = 1;
  return {
    upload: async (input: { name: string; mime: string; size?: number }) => ({
      id: nextId++,
      appId: 1,
      folderId: null,
      name: input.name,
      s3Key: `uploads/${Date.now()}-${input.name}`,
      contentHash: null,
      mime: input.mime,
      size: input.size ?? 0,
      status: 'ready' as const,
      ownerUserId: null,
      tags: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    getUrl: async (fileId: number) => ({
      url: `https://depot.test/signed/${fileId}`,
      expiresIn: 900,
    }),
    delete: async () => ({}),
  };
}
