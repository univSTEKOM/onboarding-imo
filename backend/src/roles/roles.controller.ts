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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ManagePermissionsDto } from './dto/manage-permissions.dto';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { NoFilesInterceptor } from '@nestjs/platform-express';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CacheService } from '../common/cache/cache.service';
import { PaginationParamsDto } from '../common/dto/pagination-params.dto';
import { Role } from './entities/role.entity';
import { PaginatedResponseDto } from '../common/services/base.service';

class PaginatedRoleResponse extends PaginatedResponseDto<Role> {
  @ApiProperty({ type: [Role] })
  declare data: Role[];
}

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly cacheService: CacheService,
  ) {}

  @Post()
  @Permissions('roles.create')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, type: Role })
  @UseInterceptors(NoFilesInterceptor())
  async create(@Body() createRoleDto: CreateRoleDto) {
    const result = await this.rolesService.createRole(createRoleDto);
    await this.cacheService.clearKeys('*/roles*');
    return result;
  }

  @Get()
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, type: PaginatedRoleResponse })
  @UseInterceptors(CacheInterceptor)
  findAll(@Query() params: PaginationParamsDto) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    if (params.paginated) {
      return this.rolesService.findAllPaginated(
        page,
        limit,
        params.search,
        params.sort,
        params.direction,
      );
    }
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiResponse({ status: 200, type: Role })
  @UseInterceptors(CacheInterceptor)
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(+id);
  }

  @Patch(':id')
  @Permissions('roles.update')
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, type: Role })
  @UseInterceptors(NoFilesInterceptor())
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    const result = await this.rolesService.updateRole(+id, updateRoleDto);
    await this.cacheService.clearKeys('*/roles*');
    return result;
  }

  @Delete(':id')
  @Permissions('roles.delete')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    const result = await this.rolesService.remove(+id);
    await this.cacheService.clearKeys('*/roles*');
    return result;
  }

  @Post(':id/permissions/sync')
  @Permissions('roles.manage_permissions')
  @ApiOperation({ summary: 'Sync role permissions' })
  @ApiResponse({ status: 200, type: Role })
  @UseInterceptors(NoFilesInterceptor())
  async syncPermissions(
    @Param('id') id: string,
    @Body() dto: ManagePermissionsDto,
  ) {
    const result = await this.rolesService.syncPermissions(
      +id,
      dto.permissions,
    );
    await this.cacheService.clearKeys('*/roles*');
    return result;
  }

  @Post(':id/permissions/attach')
  @Permissions('roles.manage_permissions')
  @ApiOperation({ summary: 'Attach permissions to role' })
  @ApiResponse({ status: 200, type: Role })
  @UseInterceptors(NoFilesInterceptor())
  async attachPermissions(
    @Param('id') id: string,
    @Body() dto: ManagePermissionsDto,
  ) {
    const result = await this.rolesService.attachPermissions(
      +id,
      dto.permissions,
    );
    await this.cacheService.clearKeys('*/roles*');
    return result;
  }

  @Post(':id/permissions/detach')
  @Permissions('roles.manage_permissions')
  @ApiOperation({ summary: 'Detach permissions from role' })
  @ApiResponse({ status: 200, type: Role })
  @UseInterceptors(NoFilesInterceptor())
  async detachPermissions(
    @Param('id') id: string,
    @Body() dto: ManagePermissionsDto,
  ) {
    const result = await this.rolesService.detachPermissions(
      +id,
      dto.permissions,
    );
    await this.cacheService.clearKeys('*/roles*');
    return result;
  }
}
