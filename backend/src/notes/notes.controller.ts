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
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note } from './entities/note.entity';

class PaginatedNoteResponse extends PaginatedResponseDto<Note> {
  @ApiProperty({ type: [Note] })
  declare data: Note[];
}

@ApiTags('Notes')
@ApiBearerAuth()
@Controller('notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly cacheService: CacheService,
  ) {}

  @Post()
  @Permissions('notes.create')
  @ApiOperation({ summary: 'Create a note' })
  @ApiResponse({ status: 201, type: Note })
  @UseInterceptors(NoFilesInterceptor())
  async create(@Body() dto: CreateNoteDto) {
    const result = await this.notesService.create(dto);
    await this.cacheService.clearKeys('*/notes*');
    return result;
  }

  @Get()
  @Permissions('notes.read')
  @ApiOperation({ summary: 'Get all notes' })
  @ApiResponse({ status: 200, type: PaginatedNoteResponse })
  @UseInterceptors(CacheInterceptor)
  findAll(@Query() params: PaginationParamsDto) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    if (params.paginated) {
      return this.notesService.findAllPaginated(
        page, limit, params.search, params.sort, params.direction,
      );
    }
    return this.notesService.findAll();
  }

  @Get(':id')
  @Permissions('notes.read')
  @ApiResponse({ status: 200, type: Note })
  @UseInterceptors(CacheInterceptor)
  findOne(@Param('id') id: string) {
    return this.notesService.findOne(+id);
  }

  @Patch(':id')
  @Permissions('notes.update')
  @ApiResponse({ status: 200, type: Note })
  @UseInterceptors(NoFilesInterceptor())
  async update(@Param('id') id: string, @Body() dto: UpdateNoteDto) {
    const result = await this.notesService.update(+id, dto);
    await this.cacheService.clearKeys('*/notes*');
    return result;
  }

  @Delete(':id')
  @Permissions('notes.delete')
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    const result = await this.notesService.remove(+id);
    await this.cacheService.clearKeys('*/notes*');
    return result;
  }
}