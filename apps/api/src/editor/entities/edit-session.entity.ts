import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../auth/entities/user.entity';
import { Template } from '../../templates/entities/template.entity';
import { CanvasData } from '@storige/types';

export enum EditSessionStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
}

@Entity('edit_sessions')
export class EditSession {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  userId: string | null;

  @Column({ name: 'template_id', type: 'varchar', length: 36, nullable: true })
  templateId: string | null;

  @Column({ name: 'canvas_data', type: 'json' })
  canvasData: CanvasData;

  @Column({ name: 'order_options', type: 'json', nullable: true })
  orderOptions: any;

  @Column({
    type: 'enum',
    enum: EditSessionStatus,
    default: EditSessionStatus.DRAFT,
  })
  status: EditSessionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Template, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.status) {
      this.status = EditSessionStatus.DRAFT;
    }
  }
}
