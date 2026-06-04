import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { BaseService } from '../common/services/base.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService extends BaseService<Role> {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {
    super(roleRepository, 'Role', ['name', 'description']);
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description,
    });

    if (dto.permissions) {
      const permissions = await this.permissionRepository.findBy({
        id: In(dto.permissions),
      });
      role.permissions = permissions;
    }

    return this.roleRepository.save(role);
  }

  async updateRole(id: number, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    if (dto.name) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;

    if (dto.permissions) {
      const permissions = await this.permissionRepository.findBy({
        id: In(dto.permissions),
      });
      role.permissions = permissions;
    }

    return this.roleRepository.save(role);
  }
  override async findAllPaginated(
    page: number,
    limit: number,
    search?: string,
    sort: string = 'createdAt',
    direction: string = 'DESC',
  ) {
    return super.findAllPaginated(page, limit, search, sort, direction, [
      'permissions',
    ]);
  }

  override async findAll(): Promise<Role[]> {
    return super.findAll(['permissions']);
  }

  override async findOne(id: number): Promise<Role> {
    return super.findOne(id, ['permissions']);
  }

  async syncPermissions(roleId: number, permissionIds: number[]) {
    const role = await this.findOne(roleId);
    const permissions = await this.permissionRepository.findBy({
      id: In(permissionIds),
    });
    role.permissions = permissions;
    return this.roleRepository.save(role);
  }

  async attachPermissions(roleId: number, permissionIds: number[]) {
    const role = await this.findOne(roleId);
    const permissions = await this.permissionRepository.findBy({
      id: In(permissionIds),
    });
    const existingIds = role.permissions.map((p) => p.id);
    const newPermissions = permissions.filter(
      (p) => !existingIds.includes(p.id),
    );
    role.permissions = [...role.permissions, ...newPermissions];
    return this.roleRepository.save(role);
  }

  async detachPermissions(roleId: number, permissionIds: number[]) {
    const role = await this.findOne(roleId);
    role.permissions = role.permissions.filter(
      (p) => !permissionIds.includes(p.id),
    );
    return this.roleRepository.save(role);
  }
}
