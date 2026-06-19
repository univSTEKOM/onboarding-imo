import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity';
import { BaseService } from '../common/services/base.service';

@Injectable()
export class NotesService extends BaseService<Note> {
  constructor(
    @InjectRepository(Note) private readonly noteRepository: Repository<Note>,
  ) {
    super(noteRepository, 'Note', ['title', 'content']);
  }
}