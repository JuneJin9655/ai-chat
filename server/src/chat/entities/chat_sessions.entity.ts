import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatMessage } from './chat_messages.entity';

@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column({ nullable: true })
  title?: string;

  @OneToMany(() => ChatMessage, (message) => message.chat, { cascade: true })
  messages!: ChatMessage[];

  @CreateDateColumn()
  createdAt!: Date;
}
