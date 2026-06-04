# Data Layer

Persistence is owned by **TypeORM** over **PostgreSQL**. This doc covers entities, the
`BaseService<T>` CRUD contract, override patterns, pagination, soft deletes, the
DTO/validation pattern, and seeding. For the controller half of a request, see
[REQUEST_LIFECYCLE.md](./REQUEST_LIFECYCLE.md).

> Generic CRUD lives in `BaseService<T>` — inherit it, don't re-implement. Load relations
> and add side-effects by `override`-ing a method. Never hard-delete: `remove()` calls
> `softRemove()` and every entity has a `@DeleteDateColumn`.

## Where does the logic go?

```text
Need to … 
  ├─ standard create/read/update/delete?      → inherit BaseService<T> unchanged
  ├─ load relations on read?                   → override findOne / findAll / findAllPaginated
  ├─ hash a field, sync a M2M relation?        → override create / update (see UsersService, RolesService)
  ├─ a bespoke query?                          → add a new method to the service
  └─ validate against the DB (uniqueness)?     → @IsUnique on the DTO (custom validator)
```

## Entities

Entities are plain classes decorated with TypeORM + Swagger decorators. They live in
`<feature>/entities/*.entity.ts` and are auto-discovered by the glob in `app.module.ts`.

```ts
// src/roles/entities/role.entity.ts
@Entity('roles')
export class Role {
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

  @ApiProperty({ type: () => [Permission] })
  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date; // soft delete — no @ApiProperty, kept out of responses
}
```

Conventions:

- **Timestamps** on every entity: `@CreateDateColumn`, `@UpdateDateColumn`.
- **Soft delete** on every entity: `@DeleteDateColumn() deletedAt`. TypeORM excludes
  soft-deleted rows from normal reads automatically.
- **`@Index()`** on frequently searched/looked-up columns (`name`, `email`).
- **`@ApiProperty()`** on every field you want in the Swagger schema. Omit it (and add
  `@Exclude()` from `class-transformer`) for secrets:

  ```ts
  // src/users/entities/user.entity.ts
  @Exclude()
  @Column()
  password: string;   // never serialized to the client
  ```

- **Join tables** are named explicitly: `role_permissions`, `user_roles`,
  `user_permissions`. Both roles **and** direct permissions attach to a user
  (`@ManyToMany`), which is how effective permissions are computed — see [AUTH.md](./AUTH.md).

## `BaseService<T>`

Every feature service extends `BaseService<T>` (`src/common/services/base.service.ts`). The
constructor takes the repository, a human entity name (used in error messages and event
titles), and the list of columns that free-text search matches with `ILIKE`.

```ts
// src/roles/roles.service.ts
@Injectable()
export class RolesService extends BaseService<Role> {
  constructor(
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepository: Repository<Permission>,
  ) {
    super(roleRepository, 'Role', ['name', 'description']); // repo, entityName, searchFields
  }
}
```

| Method | Behaviour | Emits |
|--------|-----------|-------|
| `findAllPaginated(page, limit, search?, sort?, direction?, relations?)` | Returns `{ data, meta: { total, page, last_page } }`; `search` matches `searchFields` via `ILIKE` | — |
| `findAll(relations?)` | All rows | — |
| `findOne(id, relations?)` | One row; **throws `NotFoundException`** if missing | — |
| `create(dto)` | Insert; on DB error calls `handleDbError` | `system.create` |
| `update(id, dto)` | `preload` + save; throws `NotFoundException` if missing | `system.update` |
| `remove(id)` | `softRemove` (sets `deletedAt`) | `system.delete` |
| `handleDbError(error)` | Maps PG `23505` (unique violation) → `ConflictException`; rethrows otherwise | — |

`create`/`update`/`remove` emit `system.*` events through `EventEmitter2` automatically —
see [EVENTS_AND_REALTIME.md](./EVENTS_AND_REALTIME.md). Because `findOne` throws on a miss,
services never need manual null checks.

## Overriding for relations & side-effects

`override` a base method when you need eager relations or custom logic. `RolesService`
loads `permissions` on every read and syncs the M2M relation with `In([...])`:

```ts
// src/roles/roles.service.ts (excerpt)
override async findOne(id: number): Promise<Role> {
  return super.findOne(id, ['permissions']);
}

override async findAllPaginated(page, limit, search?, sort = 'createdAt', direction = 'DESC') {
  return super.findAllPaginated(page, limit, search, sort, direction, ['permissions']);
}

async syncPermissions(roleId: number, permissionIds: number[]) {
  const role = await this.findOne(roleId);
  role.permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
  return this.roleRepository.save(role); // replace the relation wholesale
}
```

`UsersService` follows the same shape for bcrypt hashing on create and for syncing the
`roles` / `permissions` relations.

## Pagination

Read query params arrive as a `PaginationParamsDto` (`src/common/dto/pagination-params.dto.ts`)
— `page`, `limit`, `search`, `sort`, `direction` (`ASC`/`DESC`), and `paginated` (a boolean
the controller branches on). Numeric/boolean coercion happens via `@Type` / `@Transform`
because query strings are strings.

The paginated response shape is uniform:

```json
{
  "data": [ /* T[] */ ],
  "meta": { "total": 42, "page": 1, "last_page": 5 }
}
```

For Swagger, each controller declares a typed subclass of `PaginatedResponseDto<T>`:

```ts
// in roles.controller.ts
class PaginatedRoleResponse extends PaginatedResponseDto<Role> {
  @ApiProperty({ type: [Role] })
  declare data: Role[];
}
// ...
@ApiResponse({ status: 200, type: PaginatedRoleResponse })
```

## Soft deletes

> Nothing is hard-deleted. `BaseService.remove()` calls `repository.softRemove(entity)`,
> which sets `deletedAt`. Reads automatically skip soft-deleted rows.

If you genuinely need a hard delete (rare — e.g. clearing tokens), use the repository's
`delete()`/`remove()` directly in a service method and document why.

## DTOs & validation

The pattern is three files: a base with the shared validated fields, a create DTO that adds
DB-level uniqueness, and an update DTO that makes everything optional.

```ts
// dto/base-role.dto.ts
export class BaseRoleDto {
  @IsString() name: string;
  @IsString() @IsOptional() description?: string;
  @IsArray() @IsNumber({}, { each: true }) @IsOptional() permissions?: number[];
}

// dto/create-role.dto.ts
export class CreateRoleDto extends BaseRoleDto {
  @IsUnique(Role)          // async DB check; column defaults to 'name'
  declare name: string;
}

// dto/update-role.dto.ts
export class UpdateRoleDto extends PartialType(BaseRoleDto) {}  // from @nestjs/mapped-types
```

- The global `ValidationPipe` (`transform: true, whitelist: true`) runs these on every
  request and strips unknown properties.
- For numeric query/body fields use `@Type(() => Number)` so coercion works.
- **`@IsUnique(Entity, column?)`** (`src/common/validators/is-unique.validator.ts`) is an
  async validator that counts rows in the DB. It depends on Nest DI, which is why `main.ts`
  calls `useContainer(app.select(AppModule), { fallbackOnErrors: true })` and `AuthModule`
  provides `IsUniqueConstraint`. A duplicate surfaces as a **400** at validation time
  (before the service runs); a race that slips past it is caught by `handleDbError` as a
  **409**.

## Seeding

`SeederService` (`src/database/seeder/seeder.service.ts`) implements
`OnApplicationBootstrap` and runs on app start unless `DB_SEED=false`. It is **idempotent** —
it checks for existing rows before inserting:

- **Permissions** — the full catalogue (`menu.*`, `users.*`, `roles.*`, `permissions.*`,
  `media.*`).
- **Roles** — `superadmin` (all permissions) and `user` (`menu.dashboard`, `media.read`).
- **Admin user** — from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, bcrypt-hashed, pre-verified.

Run it manually with `bun run seed`, or rebuild the schema with `bun run migrate:fresh`
(`:seed` to reseed afterward). When you add a new permission, add it both to the
`PermissionType` union and to the seeder's `permissionsData` array.

## Next

- Add a complete new entity + service + DTOs: [ADDING_FEATURES.md](./ADDING_FEATURES.md).
- See how the service is consumed by a controller: [REQUEST_LIFECYCLE.md](./REQUEST_LIFECYCLE.md).
- See the `system.*` events `BaseService` emits: [EVENTS_AND_REALTIME.md](./EVENTS_AND_REALTIME.md).
