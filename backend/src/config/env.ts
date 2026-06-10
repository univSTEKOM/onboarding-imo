import { z } from 'zod';

export const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_SYNCHRONIZE: z.coerce.boolean().default(false),
  DB_SEED: z.coerce.boolean().default(true),

  // JWT
  JWT_SECRET: z.string().min(16),

  // Admin seed
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),

  // S3 (required)
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),

  // Redis (optional)
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_TTL: z.coerce.number().default(3600),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // OAuth / CAPTCHA (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  TURNSTILE_SECRET: z.string().optional(),

  // SSO / OIDC (optional — enables "Sign in with SSO"). Omit SSO_ISSUER to disable.
  SSO_ISSUER: z.string().url().optional(),
  SSO_CLIENT_ID: z.string().optional(),
  SSO_CLIENT_SECRET: z.string().optional(),
  SSO_REDIRECT_URI: z.string().url().optional(),
  SSO_POST_LOGOUT_URI: z.string().url().optional(),
  SSO_SUCCESS_REDIRECT: z.string().default('/'),
  SSO_DEFAULT_ROLE: z.string().default('user'),

  // Mail (optional)
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MAILGUN_FROM: z.string().optional(),
  MAILGUN_URL: z.string().url().default('https://api.mailgun.net'),

  // Rate limiting
  THROTTLE_TTL: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(100),

  // App
  APP_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().default('*'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const messages = result.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`❌  Environment validation failed:\n${messages}`);
}

export default result.data;
