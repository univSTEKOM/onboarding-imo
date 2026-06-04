import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ unique: true })
  token: string;

  @Column()
  userId: number;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
