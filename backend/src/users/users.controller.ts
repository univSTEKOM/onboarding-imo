import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiProperty,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ManageRolesDto } from './dto/manage-roles.dto';
import { ManageUserPermissionsDto } from './dto/manage-user-permissions.dto';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { OwnerOrPermissionGuard } from '../auth/owner-or-permission.guard';
import { FileInterceptor, NoFilesInterceptor } from '@nestjs/platform-express';
import { MediaService } from '../media/media.service';
import { CacheService } from '../common/cache/cache.service';
import { CacheInterceptor } from '@nestjs/cache-manager';
import type { IAuthRequest } from '../auth/interfaces/auth-request.interface';
import { PaginationParamsDto } from '../common/dto/pagination-params.dto';
import { User } from './entities/user.entity';
import { PaginatedResponseDto } from '../common/services/base.service';

class PaginatedUserResponse extends PaginatedResponseDto<User> {
  @ApiProperty({ type: [User] })
  declare data: User[];
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly mediaService: MediaService,
    private readonly cacheService: CacheService,
  ) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, type: PaginatedUserResponse })
  @UseInterceptors(CacheInterceptor)
  findAll(@Query() params: PaginationParamsDto) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    if (params.paginated) {
      return this.usersService.findAllPaginated(
        page,
        limit,
        params.search,
        params.sort,
        params.direction,
      );
    }
    return this.usersService.findAll();
  }

  @Patch(':id')
  @UseGuards(OwnerOrPermissionGuard)
  @Permissions('users.update')
  @ApiOperation({ summary: 'Update a user' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, type: User })
  @UseInterceptors(FileInterceptor('avatar'))
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: IAuthRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // If not admin and updating own profile, restrict certain fields
    const isOwner = req.user.userId === +id;
    const isAdmin = req.user.roles.includes('superadmin');

    if (isOwner && !isAdmin) {
      // Users can only update their own basic info, not roles/permissions
      delete updateUserDto.roleIds;
      delete updateUserDto.permissionIds;
    }

    if (file) {
      const media = await this.mediaService.uploadFile(file, req.user.userId);
      updateUserDto.avatarId = media.id;
    }
    const result = await this.usersService.update(+id, updateUserDto);
    await this.cacheService.clearKeys('*/users*');
    return result;
  }

  @Get(':id')
  @UseGuards(OwnerOrPermissionGuard)
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, type: User })
  @UseInterceptors(CacheInterceptor)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('users.delete')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    const result = await this.usersService.remove(+id);
    await this.cacheService.clearKeys('*/users*');
    return result;
  }

  // Role Management Endpoints
  @Post(':id/roles/sync')
  @UseGuards(PermissionsGuard)
  @Permissions('users.manage_roles')
  @ApiOperation({ summary: 'Sync user roles' })
  @ApiResponse({ status: 200, type: User })
  @UseInterceptors(NoFilesInterceptor())
  async syncRoles(@Param('id') id: string, @Body() dto: ManageRolesDto) {
    const result = await this.usersService.syncRoles(+id, dto.roles);
    await this.cacheService.clearKeys('*/users*');
    return result;
  }

  @Post(':id/roles/attach')
  @UseGuards(PermissionsGuard)
  @Permissions('users.manage_roles')
  @ApiOperation({ summary: 'Attach roles to user' })
  @ApiResponse({ status: 200, type: User })
  @UseInterceptors(NoFilesInterceptor())
  async attachRoles(@Param('id') id: string, @Body() dto: ManageRolesDto) {
    const result = await this.usersService.attachRoles(+id, dto.roles);
    await this.cacheService.clearKeys('*/users*');
    return result;
  }

  @Post(':id/roles/detach')
  @UseGuards(PermissionsGuard)
  @Permissions('users.manage_roles')
  @ApiOperation({ summary: 'Detach roles from user' })
  @ApiResponse({ status: 200, type: User })
  @UseInterceptors(NoFilesInterceptor())
  async detachRoles(@Param('id') id: string, @Body() dto: ManageRolesDto) {
    const result = await this.usersService.detachRoles(+id, dto.roles);
    await this.cacheService.clearKeys('*/users*');
    return result;
  }

  // Permission Management Endpoints
  @Post(':id/permissions/sync')
  @UseGuards(PermissionsGuard)
  @Permissions('users.manage_permissions')
  @ApiOperation({ summary: 'Sync user permissions' })
  @ApiResponse({ status: 200, type: User })
  @UseInterceptors(NoFilesInterceptor())
  async syncPermissions(
    @Param('id') id: string,
    @Body() dto: ManageUserPermissionsDto,
  ) {
    const result = await this.usersService.syncPermissions(
      +id,
      dto.permissions,
    );
    await this.cacheService.clearKeys('*/users*');
    return result;
  }

  @Post(':id/permissions/attach')
  @UseGuards(PermissionsGuard)
  @Permissions('users.manage_permissions')
  @ApiOperation({ summary: 'Attach permissions to user' })
  @ApiResponse({ status: 200, type: User })
  @UseInterceptors(NoFilesInterceptor())
  async attachPermissions(
    @Param('id') id: string,
    @Body() dto: ManageUserPermissionsDto,
  ) {
    const result = await this.usersService.attachPermissions(
      +id,
      dto.permissions,
    );
    await this.cacheService.clearKeys('*/users*');
    return result;
  }

  @Post(':id/permissions/detach')
  @UseGuards(PermissionsGuard)
  @Permissions('users.manage_permissions')
  @ApiOperation({ summary: 'Detach permissions from user' })
  @ApiResponse({ status: 200, type: User })
  @UseInterceptors(NoFilesInterceptor())
  async detachPermissions(
    @Param('id') id: string,
    @Body() dto: ManageUserPermissionsDto,
  ) {
    const result = await this.usersService.detachPermissions(
      +id,
      dto.permissions,
    );
    await this.cacheService.clearKeys('*/users*');
    return result;
  }
}
