import { IsString, IsOptional } from 'class-validator';

export class BaseNoteDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  content?: string;
}