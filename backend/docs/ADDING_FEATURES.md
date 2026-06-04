# Adding a New CRUD Feature

A step-by-step recipe to add a resource (here: **`widgets`**) end-to-end, following the
existing roles/users/permissions pattern. **Copy the `roles/` folder and rename** — it's the
cleanest CRUD example and the fastest path. The order below matches how the layers stack
(permission → entity → DTOs → service → controller → module → wire-up → tests).

For the concepts behind each step, see [DATA_LAYER.md](./DATA_LAYER.md) (entities/service/DTOs)
and [REQUEST_LIFECYCLE.md](./REQUEST_LIFECYCLE.md) (controller/guards).

## 0. Permissions — `src/auth/permissions.type.ts` + seeder

Add the permission strings to the union (so `@Permissions(...)` type-checks):

```ts
// src/auth/permissions.type.ts
export type PermissionType =
  | /* …existing… */
  | 'widgets.create'
  | 'widgets.read'
  | 'widgets.update'
  | 'widgets.delete';
```

Then add them to the seeder so they exist in the DB:

```ts
// src/database/seeder/seeder.service.ts → permissionsData
{ name: 'widgets.create', description: 'Create widgets' },
{ name: 'widgets.read',   description: 'Read widgets' },
{ name: 'widgets.update', description: 'Update widgets' },
{ name: 'widgets.delete', description: 'Delete widgets' },
```

Re-seed with `bun run seed`.

## 1. Entity — `src/widgets/entities/widget.entity.ts`

```ts
import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('widgets')
export class Widget {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Index()
  @Column({ unique: true })
  name: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true })
  description: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
```

The file ends in `.entity.ts`, so the TypeORM glob in `app.module.ts` discovers it
automatically.

## 2. DTOs — `src/widgets/dto/`

```ts
// dto/base-widget.dto.ts
import { IsString, IsOptional } from 'class-validator';
export class BaseWidgetDto {
  @IsString() name: string;
  @IsString() @IsOptional() description?: string;
}

// dto/create-widget.dto.ts
import { IsUnique } from '../../common/validators/is-unique.validator';
import { Widget } from '../entities/widget.entity';
import { BaseWidgetDto } from './base-widget.dto';
export class CreateWidgetDto extends BaseWidgetDto {
  @IsUnique(Widget)
  declare name: string;
}

// dto/update-widget.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { BaseWidgetDto } from './base-widget.dto';
export class UpdateWidgetDto extends PartialType(BaseWidgetDto) {}
```

## 3. Service — `src/widgets/widgets.service.ts`

Extend `BaseService<Widget>` and you inherit `findAll`, `findOne`, `findAllPaginated`,
`create`, `update`, `remove` (with `system.*` events and `handleDbError`) for free:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Widget } from './entities/widget.entity';
import { BaseService } from '../common/services/base.service';

@Injectable()
export class WidgetsService extends BaseService<Widget> {
  constructor(
    @InjectRepository(Widget) private readonly widgetRepository: Repository<Widget>,
  ) {
    super(widgetRepository, 'Widget', ['name', 'description']); // repo, name, searchFields
  }
}
```

Add bespoke methods or `override` a base method only when you need relations or side-effects
(see `RolesService` in [DATA_LAYER.md](./DATA_LAYER.md)).

## 4. Controller — `src/widgets/widgets.controller.ts`

```ts
import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { NoFilesInterceptor } from '@nestjs/platform-express';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { CacheService } from '../common/cache/cache.service';
import { PaginationParamsDto } from '../common/dto/pagination-params.dto';
import { PaginatedResponseDto } from '../common/services/base.service';
import { WidgetsService } from './widgets.service';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { Widget } from './entities/widget.entity';

class PaginatedWidgetResponse extends PaginatedResponseDto<Widget> {
  @ApiProperty({ type: [Widget] })
  declare data: Widget[];
}

@ApiTags('Widgets')
@ApiBearerAuth()
@Controller('widgets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WidgetsController {
  constructor(
    private readonly widgetsService: WidgetsService,
    private readonly cacheService: CacheService,
  ) {}

  @Post()
  @Permissions('widgets.create')
  @ApiOperation({ summary: 'Create a widget' })
  @ApiResponse({ status: 201, type: Widget })
  @UseInterceptors(NoFilesInterceptor())
  async create(@Body() dto: CreateWidgetDto) {
    const result = await this.widgetsService.create(dto);
    await this.cacheService.clearKeys('*/widgets*');
    return result;
  }

  @Get()
  @Permissions('widgets.read')
  @ApiOperation({ summary: 'Get all widgets' })
  @ApiResponse({ status: 200, type: PaginatedWidgetResponse })
  @UseInterceptors(CacheInterceptor)
  findAll(@Query() params: PaginationParamsDto) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    if (params.paginated) {
      return this.widgetsService.findAllPaginated(
        page, limit, params.search, params.sort, params.direction,
      );
    }
    return this.widgetsService.findAll();
  }

  @Get(':id')
  @Permissions('widgets.read')
  @ApiResponse({ status: 200, type: Widget })
  @UseInterceptors(CacheInterceptor)
  findOne(@Param('id') id: string) {
    return this.widgetsService.findOne(+id);
  }

  @Patch(':id')
  @Permissions('widgets.update')
  @ApiResponse({ status: 200, type: Widget })
  @UseInterceptors(NoFilesInterceptor())
  async update(@Param('id') id: string, @Body() dto: UpdateWidgetDto) {
    const result = await this.widgetsService.update(+id, dto);
    await this.cacheService.clearKeys('*/widgets*');
    return result;
  }

  @Delete(':id')
  @Permissions('widgets.delete')
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    const result = await this.widgetsService.remove(+id);
    await this.cacheService.clearKeys('*/widgets*');
    return result;
  }
}
```

## 5. Module — `src/widgets/widgets.module.ts`

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WidgetsService } from './widgets.service';
import { WidgetsController } from './widgets.controller';
import { Widget } from './entities/widget.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Widget])],
  controllers: [WidgetsController],
  providers: [WidgetsService],
  exports: [WidgetsService], // only if another module injects it
})
export class WidgetsModule {}
```

## 6. Register — `src/app.module.ts`

Add `WidgetsModule` to the root module's `imports` array. (The entity needs no manual
registration — the glob finds it.)

## 7. (Optional) Events — emit + listen

If a widget change should notify someone, emit a domain event from the service and add an
`@OnEvent` handler — don't call the gateway directly:

```ts
this.eventEmitter.emit('widget.created', { /* … */, actorId });
```

See [EVENTS_AND_REALTIME.md](./EVENTS_AND_REALTIME.md).

## 8. Tests

**Unit** — `src/widgets/widgets.service.spec.ts` (`bun:test`), mocking the repository and
`EventEmitter2` (copy `roles.service.spec.ts`):

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { describe, beforeEach, it, expect, jest } from 'bun:test';
import { WidgetsService } from './widgets.service';
import { Widget } from './entities/widget.entity';

describe('WidgetsService', () => {
  let service: WidgetsService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WidgetsService,
        { provide: getRepositoryToken(Widget), useValue: {
            findAndCount: jest.fn().mockResolvedValue([[], 0]),
            create: jest.fn((d) => d),
            save: jest.fn((e) => Promise.resolve({ id: 1, ...e })),
            findOne: jest.fn(), find: jest.fn(),
        } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get(WidgetsService);
  });

  it('is defined', () => expect(service).toBeDefined());
});
```

**E2E** — `test/widgets.e2e.spec.ts`, using the shared helpers (copy `roles.e2e.spec.ts`):

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import request from 'supertest';
import type { App } from 'supertest/types';
import { setupTestApp, type TestContext } from './utils/setup-app';
import { adminEmail, adminToken } from './utils/auth';
import { cleanDatabase } from './utils/db-clean';

describe('Widgets (e2e)', () => {
  let ctx: TestContext; let server: App; let admin: string;
  beforeAll(async () => { ctx = await setupTestApp(); server = ctx.app.getHttpServer() as App; admin = await adminToken(ctx); });
  beforeEach(async () => { await cleanDatabase(ctx.dataSource, adminEmail()); });
  afterAll(async () => { await ctx.app.close(); });

  it('creates a widget for an admin', async () => {
    const res = await request(server)
      .post('/api/widgets')
      .set('Authorization', `Bearer ${admin}`)
      .send({ name: 'e2e-widget', description: 'test' })
      .expect(201);
    expect(res.body.name).toBe('e2e-widget');
  });
});
```

## 9. Verify

```bash
bun run lint
bun run test            # unit + e2e
bun run spec:generate   # refresh swagger.json so the frontend types update
# browse http://localhost:3000/api/docs to confirm the Widgets endpoints
```

## Checklist

- [ ] Permission strings added to `permissions.type.ts` **and** the seeder
- [ ] Entity in `entities/*.entity.ts` (timestamps + `@DeleteDateColumn`)
- [ ] `BaseDto` → `CreateDto` (`@IsUnique`) → `UpdateDto` (`PartialType`)
- [ ] Service `extends BaseService<T>` with `super(repo, 'Name', [searchFields])`
- [ ] Controller guarded (`JwtAuthGuard` + `PermissionsGuard`), `@Permissions`, pagination branch, cache invalidation, Swagger decorators
- [ ] Module with `TypeOrmModule.forFeature([...])`, registered in `app.module.ts`
- [ ] (Optional) events emitted from the service + `@OnEvent` handler
- [ ] Unit spec + e2e spec
- [ ] `bun run lint && bun run test` green; `bun run spec:generate` run
