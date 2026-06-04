/**
 * Test environment bootstrap (loaded via `bunfig.toml` preload).
 *
 * Runs before any test module — and therefore before the NestJS AppModule,
 * its TypeORM connection factory, and `@nestjs/config` — is imported. Values
 * set on `process.env` here win over the project's `.env` (dotenv does not
 * override existing variables), so this is where we pin the E2E database and
 * silence noisy options.
 */

// Reuse the developer's `.env` for credentials, but force a dedicated database
// and never the working `stekomflow` database.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'nestplate';
process.env.DB_SYNCHRONIZE = 'true';
process.env.DB_SEED = process.env.DB_SEED ?? 'true';

// Throttling is disabled at the guard level in the harness; raise the limit too
// as a belt-and-suspenders guard against rate-limit flakiness.
process.env.THROTTLE_LIMIT = '100000';

// Keep the test output readable — pino accepts `silent`.
process.env.LOG_LEVEL = 'silent';

// Hard guard: refuse to run the suite against anything but the test database.
if (process.env.DB_NAME !== 'nestplate') {
  throw new Error(
    `E2E tests must run against the "nestplate" database (got "${process.env.DB_NAME}")`,
  );
}
