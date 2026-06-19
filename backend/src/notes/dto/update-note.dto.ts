import { PartialType } from '@nestjs/mapped-types';
import { BaseNoteDto } from './base-note.dto';

export class UpdateNoteDto extends PartialType(BaseNoteDto) {}