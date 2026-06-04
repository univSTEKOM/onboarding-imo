import { DataSource } from 'typeorm';

/**
 * Roles and permissions seeded by `SeederService` — these are preserved across
 * cleans so the superadmin keeps its full permission set and IDs stay stable.
 */
const SEEDED_ROLE_NAMES = ['superadmin', 'user'];
const SEEDED_PERMISSION_NAMES = [
  'menu.dashboard',
  'menu.users',
  'menu.database',
  'menu.roles',
  'menu.permissions',
  'menu.media',
  'menu.invitations',
  'users.invite',
  'users.read',
  'users.update',
  'users.delete',
  'users.manage_roles',
  'users.manage_permissions',
  'roles.create',
  'roles.read',
  'roles.update',
  'roles.delete',
  'roles.manage_permissions',
  'permissions.create',
  'permissions.read',
  'permissions.update',
  'permissions.delete',
  'media.create',
  'media.read',
  'media.read_all',
  'media.delete_all',
  'media.delete',
];

/**
 * Resets volatile state between tests while preserving the seeded superadmin,
 * roles and permissions.
 *
 * `TRUNCATE ... CASCADE` is deliberately avoided: `users.avatarId` references
 * `media`, so cascading from `media` would also wipe `users` (including the
 * admin). Ordered `DELETE`s sidestep that — avatars are detached first so media
 * rows can be removed, then non-admin users and any test-created roles /
 * permissions are deleted (cascading through the junction tables). Raw deletes
 * also clear soft-deleted rows, so unique names are freed for re-creation.
 */
export async function cleanDatabase(
  dataSource: DataSource,
  adminEmail: string,
): Promise<void> {
  await dataSource.query('UPDATE users SET "avatarId" = NULL');
  await dataSource.query('DELETE FROM media');
  await dataSource.query('DELETE FROM notifications');
  await dataSource.query('DELETE FROM invitations');
  await dataSource.query('DELETE FROM blacklisted_tokens');
  await dataSource.query('DELETE FROM password_reset_tokens');
  await dataSource.query('DELETE FROM email_verification_tokens');
  await dataSource.query('DELETE FROM users WHERE email != $1', [adminEmail]);

  // Test-created roles (cascades user_roles + role_permissions).
  await dataSource.query('DELETE FROM roles WHERE name <> ALL($1::text[])', [
    SEEDED_ROLE_NAMES,
  ]);

  // Test-created permissions: detach from junction tables first, then delete.
  await dataSource.query(
    'DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE name <> ALL($1::text[]))',
    [SEEDED_PERMISSION_NAMES],
  );
  await dataSource.query(
    'DELETE FROM user_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE name <> ALL($1::text[]))',
    [SEEDED_PERMISSION_NAMES],
  );
  await dataSource.query(
    'DELETE FROM permissions WHERE name <> ALL($1::text[])',
    [SEEDED_PERMISSION_NAMES],
  );
}
