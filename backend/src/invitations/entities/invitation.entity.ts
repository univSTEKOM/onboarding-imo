import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('invitations')
export class Invitation {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ unique: true })
  token: string;

  @ApiProperty()
  @Index()
  @Column()
  email: string;

  @ApiPropertyOptional({ type: [Number] })
  @Column({ type: 'simple-json', nullable: true })
  roleIds: number[] | null;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  invitedBy: number | null;

  @ApiProperty()
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @ApiPropertyOptional()
  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
