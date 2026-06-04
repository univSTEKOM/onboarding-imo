import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { Media } from '../media/entities/media.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BaseService } from '../common/services/base.service';

@Injectable()
export class UsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
  ) {
    super(usersRepository, 'User', ['email', 'fullname']);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['roles', 'roles.permissions', 'permissions', 'avatar'],
    });
  }

  override async create(
    userData: CreateUserDto,
    options?: { autoVerify?: boolean },
  ): Promise<User> {
    const password = userData.password;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
    });

    if (options?.autoVerify) {
      newUser.emailVerifiedAt = new Date();
    }

    if (userData.roleIds) {
      const roles = await this.rolesRepository.findBy({
        id: In(userData.roleIds),
      });
      newUser.roles = roles;
    }

    if (userData.permissionIds) {
      const permissions = await this.permissionsRepository.findBy({
        id: In(userData.permissionIds),
      });
      newUser.permissions = permissions;
    }

    if (userData.avatarId) {
      const media = await this.mediaRepository.findOneBy({
        id: userData.avatarId,
      });
      if (media) {
        newUser.avatar = media;
      }
    }

    try {
      const saved = await this.usersRepository.save(newUser);
      this.eventEmitter.emit('user.created', {
        userId: saved.id,
        fullname: saved.fullname || saved.email,
        email: saved.email,
        emailVerified: !!options?.autoVerify,
      });
      return saved;
    } catch (error) {
      this.handleDbError(error);
    }
  }

  override async findAllPaginated(
    page: number,
    limit: number,
    search?: string,
    sort: string = 'createdAt',
    direction: string = 'DESC',
  ) {
    return super.findAllPaginated(page, limit, search, sort, direction, [
      'roles',
      'permissions',
      'avatar',
    ]);
  }

  override async findAll(): Promise<User[]> {
    return super.findAll([
      'roles',
      'roles.permissions',
      'permissions',
      'avatar',
    ]);
  }

  override async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.usersRepository.preload({
      id,
      ...updateUserDto,
    });

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.roleIds) {
      const roles = await this.rolesRepository.findBy({
        id: In(updateUserDto.roleIds),
      });
      user.roles = roles;
    }

    if (updateUserDto.permissionIds) {
      const permissions = await this.permissionsRepository.findBy({
        id: In(updateUserDto.permissionIds),
      });
      user.permissions = permissions;
    }

    if (updateUserDto.avatarId) {
      const media = await this.mediaRepository.findOneBy({
        id: updateUserDto.avatarId,
      });
      if (media) {
        user.avatar = media;
      }
    }

    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      this.handleDbError(error);
    }
  }

  override async findOne(id: number): Promise<User> {
    return super.findOne(id, [
      'roles',
      'roles.permissions',
      'permissions',
      'avatar',
    ]);
  }

  override async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.softRemove(user);
    this.eventEmitter.emit('user.deleted', {
      userId: user.id,
      fullname: user.fullname || user.email,
    });
  }

  // Role Management
  async syncRoles(id: number, roleIds: number[]) {
    const user = await this.findOne(id);
    const roles = await this.rolesRepository.findBy({ id: In(roleIds) });
    user.roles = roles;
    const saved = await this.usersRepository.save(user);
    this.eventEmitter.emit('user.roles_updated', {
      userId: user.id,
      fullname: user.fullname || user.email,
    });
    return saved;
  }

  async attachRoles(id: number, roleIds: number[]) {
    const user = await this.findOne(id);
    const roles = await this.rolesRepository.findBy({ id: In(roleIds) });
    const existingIds = user.roles.map((r) => r.id);
    const newRoles = roles.filter((r) => !existingIds.includes(r.id));
    user.roles = [...user.roles, ...newRoles];
    const saved = await this.usersRepository.save(user);
    this.eventEmitter.emit('user.roles_updated', {
      userId: user.id,
      fullname: user.fullname || user.email,
    });
    return saved;
  }

  async detachRoles(id: number, roleIds: number[]) {
    const user = await this.findOne(id);
    user.roles = user.roles.filter((r) => !roleIds.includes(r.id));
    const saved = await this.usersRepository.save(user);
    this.eventEmitter.emit('user.roles_updated', {
      userId: user.id,
      fullname: user.fullname || user.email,
    });
    return saved;
  }

  // Permission Management
  async syncPermissions(id: number, permissionIds: number[]) {
    const user = await this.findOne(id);
    const permissions = await this.permissionsRepository.findBy({
      id: In(permissionIds),
    });
    user.permissions = permissions;
    const saved = await this.usersRepository.save(user);
    this.eventEmitter.emit('user.roles_updated', {
      userId: user.id,
      fullname: user.fullname || user.email,
    });
    return saved;
  }

  async attachPermissions(id: number, permissionIds: number[]) {
    const user = await this.findOne(id);
    const permissions = await this.permissionsRepository.findBy({
      id: In(permissionIds),
    });
    const existingIds = user.permissions.map((p) => p.id);
    const newPermissions = permissions.filter(
      (p) => !existingIds.includes(p.id),
    );
    user.permissions = [...user.permissions, ...newPermissions];
    const saved = await this.usersRepository.save(user);
    this.eventEmitter.emit('user.roles_updated', {
      userId: user.id,
      fullname: user.fullname || user.email,
    });
    return saved;
  }

  async detachPermissions(id: number, permissionIds: number[]) {
    const user = await this.findOne(id);
    user.permissions = user.permissions.filter(
      (p) => !permissionIds.includes(p.id),
    );
    const saved = await this.usersRepository.save(user);
    this.eventEmitter.emit('user.roles_updated', {
      userId: user.id,
      fullname: user.fullname || user.email,
    });
    return saved;
  }

  async markEmailVerified(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
      emailVerifiedAt: new Date(),
    });
  }

  protected override handleDbError(error: any): never {
    const dbError = error as { code?: string };
    if (dbError.code === '23505') {
      throw new ConflictException('User with this email already exists');
    }
    super.handleDbError(error);
  }
}
