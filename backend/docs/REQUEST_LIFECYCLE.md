# Request Lifecycle

An HTTP request is owned by the **controller layer**. This doc traces a request from the
validation pipe to the response: guards, the thin controller, caching, throttling,
serialization, errors, and Swagger. For the service/DB half, see
[DATA_LAYER.md](./DATA_LAYER.md). For what the guards actually check, see [AUTH.md](./AUTH.md).

> Controllers parse the request, call **one** service method, invalidate cache on writes,
> and return the payload. No business logic, no direct DB access, no event emission.

## The pipeline

Every route under the global `/api` prefix runs through this chain:

```text
Request ─▶ ValidationPipe ─▶ Guards ─▶ Interceptors (in) ─▶ Controller handler
                                                                   │ calls service
                                                                   ▼
Response ◀─ AllExceptionsFilter ◀─ Interceptors (out) ◀─ ─── ─── ─┘
```

- **ValidationPipe** (global, `transform: true, whitelist: true`) — builds and validates the
  DTO, coerces types, strips unknown properties.
- **Guards** — `JwtAuthGuard` then a permission guard (see below).
- **Interceptors** — `CacheInterceptor` on reads, `ClassSerializerInterceptor` for
  `@Exclude`, `FileInterceptor` for uploads.
- **AllExceptionsFilter** — wraps everything; shapes the error response.

## Thin controllers

A controller method parses params, delegates to the service, busts cache, and returns:

```ts
// src/roles/roles.controller.ts
@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)   // class-level: applies to every route
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly cacheService: CacheService,
  ) {}

  @Post()
  @Permissions('roles.create')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, type: Role })
  @UseInterceptors(NoFilesInterceptor())     // accept multipart form without files
  async create(@Body() createRoleDto: CreateRoleDto) {
    const result = await this.rolesService.createRole(createRoleDto);
    await this.cacheService.clearKeys('*/roles*');   // invalidate cached reads
    return result;
  }
}
```

`+id` converts the string route param to a number; the service's `findOne` throws
`NotFoundException` if the row is missing, so the controller doesn't null-check.

## Guards on a route

Guards compose. The class-level `@UseGuards(JwtAuthGuard)` authenticates every route;
individual methods add the authorization guard and the required permission. `UsersController`
mixes two authorization guards depending on the action:

```ts
// src/users/users.controller.ts (excerpt)
@Controller('users')
@UseGuards(JwtAuthGuard)                  // authenticate everything
export class UsersController {

  @Get()
  @UseGuards(PermissionsGuard)            // must hold the permission
  @Permissions('users.read')
  findAll(@Query() params: PaginationParamsDto) { /* … */ }

  @Patch(':id')
  @UseGuards(OwnerOrPermissionGuard)      // own record OR superadmin OR permission
  @Permissions('users.update')
  update(@Param('id') id: string, /* … */) { /* … */ }
}
```

The semantics of each guard (and the email-verification gate baked into `JwtAuthGuard`) are
documented in [AUTH.md](./AUTH.md).

## Validation & transformation

The global `ValidationPipe` runs the DTO's `class-validator` decorators. Because query
strings arrive as strings, list/number/boolean params need `class-transformer` hints — all
already present on `PaginationParamsDto`:

```ts
@Type(() => Number) @IsInt() @Min(1) page?: number = 1;
@Transform(({ value }) => value === 'true' || value === true) @IsBoolean() paginated?: boolean;
```

`whitelist: true` strips any property not declared on the DTO, so clients can't smuggle
extra fields into a `@Body()`.

## Pagination branch

List endpoints accept `PaginationParamsDto` and branch on `paginated`:

```ts
@Get()
@Permissions('roles.read')
@UseInterceptors(CacheInterceptor)
findAll(@Query() params: PaginationParamsDto) {
  const page = params.page || 1;
  const limit = params.limit || 10;
  if (params.paginated) {
    return this.rolesService.findAllPaginated(
      page, limit, params.search, params.sort, params.direction,
    );
  }
  return this.rolesService.findAll();
}
```

`paginated=true` returns `{ data, meta }`; otherwise the full list. See
[DATA_LAYER.md](./DATA_LAYER.md) for the response shape.

## Serialization & file uploads

- **`ClassSerializerInterceptor`** applies entity `@Exclude()` rules (e.g. the user password
  never leaves the server). `UsersController` and `AuthController` opt in with
  `@UseInterceptors(ClassSerializerInterceptor)`.
- **Multipart uploads** use `FileInterceptor('<field>')` plus Swagger's `@ApiConsumes('multipart/form-data')`:

  ```ts
  // src/media/media.controller.ts (excerpt)
  @Post('upload')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('media.create')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: IAuthRequest) {
    const result = await this.mediaService.uploadFile(file, req.user.userId);
    await this.cacheService.clearKeys('*/media*');
    return result;
  }
  ```

  Endpoints that take a form body but no file use `@UseInterceptors(NoFilesInterceptor())`.
  See [INTEGRATIONS.md](./INTEGRATIONS.md) for the Depot storage side.

## Caching

Reads are cached and writes invalidate them:

- **Read** — `@UseInterceptors(CacheInterceptor)` caches the response (Redis when configured,
  otherwise in-memory — transparent to the controller).
- **Write** — after a create/update/delete the controller calls
  `await this.cacheService.clearKeys('*/<resource>*')` (e.g. `'*/roles*'`,
  `'*/users*'`, `'*/media*'`). `CacheService.clearKeys` (`src/common/cache/cache.service.ts`)
  uses a Redis `SCAN` loop, or a `keys`/`del` fallback for the memory store.

## Throttling

A global `ThrottlerGuard` (registered in `app.module.ts`) limits every IP to
`THROTTLE_LIMIT` requests per `THROTTLE_TTL`. Tighten a sensitive route locally:

```ts
@Throttle({ default: { limit: 10, ttl: 60_000 } })   // auth/login
@Throttle({ default: { limit: 5,  ttl: 60_000 } })   // forgot/reset-password
```

…or opt a route out entirely with `@SkipThrottle()` (the health controller does this).

## Error handling

`AllExceptionsFilter` (global) shapes every error:

- A thrown `HttpException` (`NotFoundException`, `ForbiddenException`, `ConflictException`,
  validation `BadRequestException`, …) passes through with its original status and body.
- Anything else is logged via pino and returned as a generic **500** so internals never leak.
- **Success responses are not wrapped** — the handler's return value *is* the response body.

So services just `throw new NotFoundException(...)` (or let `BaseService` do it); there's no
manual try/catch in controllers.

## Swagger

Document endpoints with the `@nestjs/swagger` decorators already used throughout:

```ts
@ApiTags('Roles')                          // groups the controller in the UI
@ApiBearerAuth()                           // marks routes as requiring a JWT
@ApiOperation({ summary: '…' })            // per-route description
@ApiResponse({ status: 200, type: Role })  // response schema
@ApiConsumes('multipart/form-data')        // for uploads
```

- Browse the live UI at `/api/docs` (non-production only).
- `bun run spec:generate` writes `swagger.json`; the frontend turns it into typed API
  clients. Regenerate it whenever you change a route or DTO — **don't hand-edit
  `swagger.json`**.

## Health

`GET /api/health` (`src/health/health.controller.ts`, `@SkipThrottle()`) runs a Terminus
check: a Postgres `pingCheck` and a 300 MB heap check. See [INTEGRATIONS.md](./INTEGRATIONS.md).
