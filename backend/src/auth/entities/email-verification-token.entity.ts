import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('email_verification_tokens')
export class EmailVerificationToken {
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
