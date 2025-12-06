import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EditorContentType } from '@storige/types';

@Entity('editor_contents')
export class EditorContent {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({
    type: 'enum',
    enum: ['template', 'frame', 'image', 'background', 'element'],
  })
  type: EditorContentType;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'design_url', type: 'varchar', length: 500, nullable: true })
  designUrl: string | null;

  @Column({ name: 'cut_line_url', type: 'varchar', length: 500, nullable: true })
  cutLineUrl: string | null;

  @Column({ type: 'json' })
  tags: string[];

  @Column({ type: 'json' })
  metadata: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
