import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from 'bun:test';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';

describe('RolesService', () => {
  let service: RolesService;
  let roleRepository: Repository<Role>;
  let permissionRepository: Repository<Permission>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findAndCount: jest.fn().mockResolvedValue([[], 0]),
            create: jest.fn((dto: Partial<Role>) => dto),
            save: jest.fn((entity: Partial<Role>) =>
              Promise.resolve({ id: 1, ...entity }),
            ),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: { findBy: jest.fn().mockResolvedValue([]) },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    permissionRepository = module.get<Repository<Permission>>(
      getRepositoryToken(Permission),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRole', () => {
    it('should create a role without permissions', async () => {
      const dto = { name: 'editor', description: 'Editor role' };

      const result = await service.createRole(dto);

      expect(roleRepository.create).toHaveBeenCalledWith({
        name: 'editor',
        description: 'Editor role',
      });
      expect(roleRepository.save).toHaveBeenCalled();
      expect(result).toMatchObject(dto);
      expect(permissionRepository.findBy).not.toHaveBeenCalled();
    });

    it('should resolve and attach permissions when ids are provided', async () => {
      const perms = [{ id: 1 }, { id: 2 }] as Permission[];
      (permissionRepository.findBy as jest.Mock).mockResolvedValue(perms);

      await service.createRole({ name: 'editor', permissions: [1, 2] });

      expect(permissionRepository.findBy).toHaveBeenCalled();
      const saved = (roleRepository.save as jest.Mock).mock.calls[0][0] as Role;
      expect(saved.permissions).toEqual(perms);
    });
  });

  describe('updateRole', () => {
    it('should update the existing role fields', async () => {
      const role = {
        id: 1,
        name: 'old',
        description: 'old',
        permissions: [],
      } as unknown as Role;
      (roleRepository.findOne as jest.Mock).mockResolvedValue(role);

      await service.updateRole(1, { name: 'new', description: 'new desc' });

      const saved = (roleRepository.save as jest.Mock).mock.calls[0][0] as Role;
      expect(saved.name).toBe('new');
      expect(saved.description).toBe('new desc');
    });

    it('should throw NotFoundException when the role does not exist', async () => {
      (roleRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.updateRole(999, { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('syncPermissions', () => {
    it('should replace the role permissions wholesale', async () => {
      const role = { id: 1, permissions: [{ id: 9 }] } as unknown as Role;
      (roleRepository.findOne as jest.Mock).mockResolvedValue(role);
      const perms = [{ id: 1 }, { id: 2 }] as Permission[];
      (permissionRepository.findBy as jest.Mock).mockResolvedValue(perms);

      await service.syncPermissions(1, [1, 2]);

      const saved = (roleRepository.save as jest.Mock).mock.calls[0][0] as Role;
      expect(saved.permissions).toEqual(perms);
    });
  });

  describe('attachPermissions', () => {
    it('should append only permissions not already present', async () => {
      const role = { id: 1, permissions: [{ id: 1 }] } as unknown as Role;
      (roleRepository.findOne as jest.Mock).mockResolvedValue(role);
      (permissionRepository.findBy as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ] as Permission[]);

      await service.attachPermissions(1, [1, 2]);

      const saved = (roleRepository.save as jest.Mock).mock.calls[0][0] as Role;
      expect(saved.permissions.map((p) => p.id)).toEqual([1, 2]);
    });
  });

  describe('detachPermissions', () => {
    it('should remove the specified permissions', async () => {
      const role = {
        id: 1,
        permissions: [{ id: 1 }, { id: 2 }],
      } as unknown as Role;
      (roleRepository.findOne as jest.Mock).mockResolvedValue(role);

      await service.detachPermissions(1, [1]);

      const saved = (roleRepository.save as jest.Mock).mock.calls[0][0] as Role;
      expect(saved.permissions.map((p) => p.id)).toEqual([2]);
    });
  });

  describe('findAllPaginated', () => {
    it('should default to createdAt DESC ordering', async () => {
      await service.findAllPaginated(1, 10);
      expect(roleRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
    });
  });
});
