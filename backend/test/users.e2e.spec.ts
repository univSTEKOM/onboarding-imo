import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'bun:test';
import request from 'supertest';
import type { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { setupTestApp, type TestContext } from './utils/setup-app';
import { adminEmail, adminToken, createUser, tokenFor } from './utils/auth';
import { cleanDatabase } from './utils/db-clean';
import { Role } from '@/roles/entities/role.entity';
import { Permission } from '@/permissions/entities/permission.entity';
import { User } from '@/users/entities/user.entity';

describe('Users (e2e)', () => {
  let ctx: TestContext;
  let server: App;
  let admin: string;

  beforeAll(async () => {
    ctx = await setupTestApp();
    server = ctx.app.getHttpServer() as App;
    admin = await adminToken(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.dataSource, adminEmail());
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('GET /users', () => {
    it('lists users for a caller with users.read', async () => {
      await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${admin}`)
        .expect(200);
    });

    it('forbids a caller without users.read with 403', async () => {
      const user = await createUser(ctx, { email: 'noperm@b.com' });
      await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokenFor(ctx, user.id, user.email)}`)
        .expect(403);
    });

    it('rejects an unauthenticated request with 401', async () => {
      await request(server).get('/api/users').expect(401);
    });
  });

  describe('GET /users/:id', () => {
    it('lets a user read their own record (owner) without users.read', async () => {
      const user = await createUser(ctx, { email: 'owner@b.com' });
      await request(server)
        .get(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${tokenFor(ctx, user.id, user.email)}`)
        .expect(200);
    });

    it('forbids reading another user without users.read with 403', async () => {
      const user = await createUser(ctx, { email: 'owner@b.com' });
      const other = await createUser(ctx, { email: 'other@b.com' });
      await request(server)
        .get(`/api/users/${other.id}`)
        .set('Authorization', `Bearer ${tokenFor(ctx, user.id, user.email)}`)
        .expect(403);
    });

    it('returns 404 for a missing user (admin)', async () => {
      await request(server)
        .get('/api/users/999999')
        .set('Authorization', `Bearer ${admin}`)
        .expect(404);
    });
  });

  describe('PATCH /users/:id', () => {
    it('lets an admin update a user', async () => {
      const user = await createUser(ctx, { email: 'patch@b.com' });
      const res = await request(server)
        .patch(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${admin}`)
        .field('fullname', 'Patched Name')
        .expect(200);

      expect(res.body.fullname).toBe('Patched Name');
    });

    it('strips role changes when a non-admin updates themselves', async () => {
      const roleRepo = ctx.app.get<Repository<Role>>(getRepositoryToken(Role));
      const userRole = await roleRepo.findOneByOrFail({ name: 'user' });
      const user = await createUser(ctx, { email: 'selfpatch@b.com' });

      await request(server)
        .patch(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${tokenFor(ctx, user.id, user.email)}`)
        .field('fullname', 'Self Name')
        .field('roleIds[]', String(userRole.id))
        .expect(200);

      const userRepo = ctx.app.get<Repository<User>>(getRepositoryToken(User));
      const refreshed = await userRepo.findOneOrFail({
        where: { id: user.id },
        relations: ['roles'],
      });
      expect(refreshed.roles).toHaveLength(0);
    });

    it('rejects an invalid email with 400', async () => {
      const user = await createUser(ctx, { email: 'patch@b.com' });
      await request(server)
        .patch(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${admin}`)
        .field('email', 'not-an-email')
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('lets an admin delete a user', async () => {
      const user = await createUser(ctx, { email: 'todelete@b.com' });
      await request(server)
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${admin}`)
        .expect(200);
    });

    it('forbids deletion without users.delete with 403', async () => {
      const actor = await createUser(ctx, { email: 'actor@b.com' });
      const victim = await createUser(ctx, { email: 'victim@b.com' });
      await request(server)
        .delete(`/api/users/${victim.id}`)
        .set('Authorization', `Bearer ${tokenFor(ctx, actor.id, actor.email)}`)
        .expect(403);
    });

    it('returns 404 for a missing user', async () => {
      await request(server)
        .delete('/api/users/999999')
        .set('Authorization', `Bearer ${admin}`)
        .expect(404);
    });
  });

  describe('role & permission management', () => {
    it('syncs roles for a user (users.manage_roles)', async () => {
      const roleRepo = ctx.app.get<Repository<Role>>(getRepositoryToken(Role));
      const userRole = await roleRepo.findOneByOrFail({ name: 'user' });
      const user = await createUser(ctx, { email: 'syncrole@b.com' });

      await request(server)
        .post(`/api/users/${user.id}/roles/sync`)
        .set('Authorization', `Bearer ${admin}`)
        .send({ roles: [userRole.id] })
        .expect(201);

      const userRepo = ctx.app.get<Repository<User>>(getRepositoryToken(User));
      const refreshed = await userRepo.findOneOrFail({
        where: { id: user.id },
        relations: ['roles'],
      });
      expect(refreshed.roles.map((r) => r.id)).toContain(userRole.id);
    });

    it('forbids role management without the permission with 403', async () => {
      const actor = await createUser(ctx, { email: 'actor2@b.com' });
      const user = await createUser(ctx, { email: 'target@b.com' });
      await request(server)
        .post(`/api/users/${user.id}/roles/sync`)
        .set('Authorization', `Bearer ${tokenFor(ctx, actor.id, actor.email)}`)
        .send({ roles: [] })
        .expect(403);
    });

    it('syncs permissions for a user (users.manage_permissions)', async () => {
      const permRepo = ctx.app.get<Repository<Permission>>(
        getRepositoryToken(Permission),
      );
      const perm = await permRepo.findOneByOrFail({ name: 'media.read' });
      const user = await createUser(ctx, { email: 'syncperm@b.com' });

      await request(server)
        .post(`/api/users/${user.id}/permissions/sync`)
        .set('Authorization', `Bearer ${admin}`)
        .send({ permissions: [perm.id] })
        .expect(201);

      const userRepo = ctx.app.get<Repository<User>>(getRepositoryToken(User));
      const refreshed = await userRepo.findOneOrFail({
        where: { id: user.id },
        relations: ['permissions'],
      });
      expect(refreshed.permissions.map((p) => p.id)).toContain(perm.id);
    });

    it('rejects a malformed roles payload with 400', async () => {
      const user = await createUser(ctx, { email: 'badpayload@b.com' });
      await request(server)
        .post(`/api/users/${user.id}/roles/sync`)
        .set('Authorization', `Bearer ${admin}`)
        .send({ roles: ['not-a-number'] })
        .expect(400);
    });
  });
});
