import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatSession } from './chat_sessions.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ChatSession, (chat) => chat.messages, {
    onDelete: 'CASCADE',
  })
  chat!: ChatSession;

  @Column()
  role!: 'user' | 'assistant';

  @Column('text')
  content!: string;

  @CreateDateColumn()
  timestamp!: Date;
}
