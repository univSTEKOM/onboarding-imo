import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from 'bun:test';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { Media } from '../media/entities/media.entity';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: Repository<User>;
  let rolesRepository: Repository<Role>;
  let permissionsRepository: Repository<Permission>;
  let mediaRepository: Repository<Media>;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn().mockResolvedValue([[], 0]),
            create: jest.fn((dto: Partial<User>) => ({ ...dto })),
            save: jest.fn((entity: Partial<User>) =>
              Promise.resolve({ id: 1, ...entity }),
            ),
            preload: jest.fn(),
            softRemove: jest.fn(),
            update: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: { findBy: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: { findBy: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(Media),
          useValue: { findOneBy: jest.fn() },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    rolesRepository = module.get(getRepositoryToken(Role));
    permissionsRepository = module.get(getRepositoryToken(Permission));
    mediaRepository = module.get(getRepositoryToken(Media));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneByEmail', () => {
    it('should query by email with the full relation set', async () => {
      const user = { id: 1, email: 'a@b.com' } as User;
      (usersRepository.findOne as jest.Mock).mockResolvedValue(user);

      const result = await service.findOneByEmail('a@b.com');

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
        relations: ['roles', 'roles.permissions', 'permissions', 'avatar'],
      });
      expect(result).toBe(user);
    });
  });

  describe('create', () => {
    it('should hash the password and emit user.created (unverified)', async () => {
      const result = await service.create({
        email: 'new@b.com',
        password: 'plain-password',
      });

      const created = (usersRepository.create as jest.Mock).mock
        .calls[0][0] as User;
      expect(created.password).not.toBe('plain-password');
      expect(created.password.startsWith('$2')).toBe(true);
      expect(result.emailVerifiedAt).toBeUndefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({ email: 'new@b.com', emailVerified: false }),
      );
    });

    it('should mark email verified and emit emailVerified:true when autoVerify', async () => {
      await service.create(
        { email: 'inv@b.com', password: 'plain-password' },
        { autoVerify: true },
      );

      const saved = (usersRepository.save as jest.Mock).mock
        .calls[0][0] as User;
      expect(saved.emailVerifiedAt).toBeInstanceOf(Date);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({ emailVerified: true }),
      );
    });

    it('should resolve roles, permissions and avatar when ids are supplied', async () => {
      (rolesRepository.findBy as jest.Mock).mockResolvedValue([{ id: 1 }]);
      (permissionsRepository.findBy as jest.Mock).mockResolvedValue([
        { id: 2 },
      ]);
      (mediaRepository.findOneBy as jest.Mock).mockResolvedValue({ id: 3 });

      await service.create({
        email: 'x@b.com',
        password: 'plain-password',
        roleIds: [1],
        permissionIds: [2],
        avatarId: 3,
      });

      expect(rolesRepository.findBy).toHaveBeenCalled();
      expect(permissionsRepository.findBy).toHaveBeenCalled();
      expect(mediaRepository.findOneBy).toHaveBeenCalledWith({ id: 3 });
    });

    it('should translate a unique-violation into ConflictException', async () => {
      (usersRepository.save as jest.Mock).mockRejectedValue({ code: '23505' });

      await expect(
        service.create({ email: 'dup@b.com', password: 'plain-password' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when the user does not exist', async () => {
      (usersRepository.preload as jest.Mock).mockResolvedValue(undefined);

      await expect(service.update(999, { fullname: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should hash a new password before saving', async () => {
      (usersRepository.preload as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'a@b.com',
      });

      await service.update(1, { password: 'brand-new-password' });

      const saved = (usersRepository.save as jest.Mock).mock
        .calls[0][0] as User;
      expect(saved.password).not.toBe('brand-new-password');
      expect(saved.password.startsWith('$2')).toBe(true);
    });
  });

  describe('markEmailVerified', () => {
    it('should set emailVerifiedAt via repository update', async () => {
      await service.markEmailVerified(7);
      expect(usersRepository.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ emailVerifiedAt: expect.any(Date) }),
      );
    });
  });

  describe('role management', () => {
    it('attachRoles should append only the roles not already present', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        roles: [{ id: 1 }],
        email: 'a@b.com',
      });
      (rolesRepository.findBy as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);

      await service.attachRoles(1, [1, 2]);

      const saved = (usersRepository.save as jest.Mock).mock
        .calls[0][0] as User;
      expect(saved.roles.map((r) => r.id)).toEqual([1, 2]);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'user.roles_updated',
        expect.any(Object),
      );
    });

    it('detachRoles should remove the given role ids', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        roles: [{ id: 1 }, { id: 2 }],
        email: 'a@b.com',
      });

      await service.detachRoles(1, [1]);

      const saved = (usersRepository.save as jest.Mock).mock
        .calls[0][0] as User;
      expect(saved.roles.map((r) => r.id)).toEqual([2]);
    });

    it('syncRoles should replace the role set entirely', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        roles: [{ id: 9 }],
        email: 'a@b.com',
      });
      (rolesRepository.findBy as jest.Mock).mockResolvedValue([{ id: 1 }]);

      await service.syncRoles(1, [1]);

      const saved = (usersRepository.save as jest.Mock).mock
        .calls[0][0] as User;
      expect(saved.roles.map((r) => r.id)).toEqual([1]);
    });
  });

  describe('permission management', () => {
    it('syncPermissions should replace the permission set', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        permissions: [{ id: 9 }],
        email: 'a@b.com',
      });
      (permissionsRepository.findBy as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);

      await service.syncPermissions(1, [1, 2]);

      const saved = (usersRepository.save as jest.Mock).mock
        .calls[0][0] as User;
      expect(saved.permissions.map((p) => p.id)).toEqual([1, 2]);
    });
  });

  describe('remove', () => {
    it('should soft-remove the user and emit user.deleted', async () => {
      const user = { id: 1, email: 'a@b.com', fullname: 'A' } as User;
      (usersRepository.findOne as jest.Mock).mockResolvedValue(user);

      await service.remove(1);

      expect(usersRepository.softRemove).toHaveBeenCalledWith(user);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'user.deleted',
        expect.objectContaining({ userId: 1 }),
      );
    });
  });
});
