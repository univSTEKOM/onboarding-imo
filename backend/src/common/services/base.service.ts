import { NotFoundException, ConflictException, Inject } from '@nestjs/common';
import {
  Repository,
  FindManyOptions,
  ILike,
  ObjectLiteral,
  DeepPartial,
  FindOptionsWhere,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { ApiProperty } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';

export class PaginationMetaDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  last_page: number;
}

export abstract class PaginatedResponseDto<T> {
  data: T[];

  @ApiProperty()
  meta: PaginationMetaDto;
}

export abstract class BaseService<T extends ObjectLiteral> {
  @Inject(EventEmitter2)
  protected readonly eventEmitter: EventEmitter2;

  protected constructor(
    protected readonly repository: Repository<T>,
    protected readonly entityName: string,
    protected readonly searchFields: string[] = [],
  ) {}

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sort: string = 'createdAt',
    direction: string = 'DESC',
    relations: string[] = [],
  ) {
    const currentPage = Math.max(1, page);
    const skip = (currentPage - 1) * limit;

    const findOptions: FindManyOptions<T> = {
      skip,
      take: limit,
      order: {
        [sort]: direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
      } as FindManyOptions<T>['order'],
      relations,
    };

    if (search && this.searchFields.length > 0) {
      findOptions.where = this.searchFields.map((field) => ({
        [field]: ILike(`%${search}%`),
      })) as FindManyOptions<T>['where'];
    }

    const [data, total] = await this.repository.findAndCount(findOptions);

    return {
      data,
      meta: {
        total,
        page: +currentPage,
        last_page: Math.ceil(total / limit),
      },
    };
  }

  async findAll(relations: string[] = []): Promise<T[]> {
    return this.repository.find({ relations });
  }

  async findOne(id: number, relations: string[] = []): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id: id as unknown } as FindOptionsWhere<T>,
      relations,
    });
    if (!entity) {
      throw new NotFoundException(`${this.entityName} #${id} not found`);
    }
    return entity;
  }

  async create(dto: DeepPartial<T>): Promise<T> {
    try {
      const entity = this.repository.create(dto);
      const saved = await this.repository.save(entity);

      if (this.eventEmitter) {
        this.eventEmitter.emit('system.create', {
          title: `New ${this.entityName} Created`,
          message: `A new ${this.entityName} has been created.`,
          entity: saved,
        });
      }

      return saved;
    } catch (error) {
      this.handleDbError(error);
    }
  }

  async update(id: number, dto: QueryDeepPartialEntity<T>): Promise<T> {
    const preloadDto = {
      id,
      ...dto,
    } as unknown as DeepPartial<T>;

    const entity = await this.repository.preload(preloadDto);

    if (!entity) {
      throw new NotFoundException(`${this.entityName} #${id} not found`);
    }

    try {
      const saved = await this.repository.save(entity);

      if (this.eventEmitter) {
        this.eventEmitter.emit('system.update', {
          title: `${this.entityName} Updated`,
          message: `${this.entityName} #${id} has been updated.`,
          entity: saved,
        });
      }

      return saved;
    } catch (error) {
      this.handleDbError(error);
    }
  }

  async remove(id: number): Promise<void> {
    const entity = await this.findOne(id);
    await this.repository.softRemove(entity);

    if (this.eventEmitter) {
      this.eventEmitter.emit('system.delete', {
        title: `${this.entityName} Deleted`,
        message: `${this.entityName} #${id} has been deleted.`,
      });
    }
  }

  protected handleDbError(error: any): never {
    const dbError = error as { code?: string };
    if (dbError.code === '23505') {
      throw new ConflictException(`${this.entityName} already exists`);
    }
    throw error;
  }
}
