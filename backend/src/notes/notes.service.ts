import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity';
import { BaseService } from '../common/services/base.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Injectable()
export class NotesService extends BaseService<Note> {
  constructor(
    @InjectRepository(Note) private readonly noteRepository: Repository<Note>,
  ) {
    super(noteRepository, 'Note', ['title', 'content']);
  }

  override async create(dto: CreateNoteDto): Promise<Note> {
    const note = await super.create(dto);
    this.eventEmitter.emit('note.created', { note, actorId: null });
    return note;
  }
}