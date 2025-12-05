import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Category } from './category.entity';
import type { ProductSpecs } from '@storige/types';

@Entity('template_sets')
export class TemplateSet {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'category_id', type: 'varchar', length: 36 })
  categoryId: string;

  @Column({ name: 'product_specs', type: 'json', nullable: true })
  productSpecs: ProductSpecs | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => TemplateSetItem, (item) => item.templateSet)
  items: TemplateSetItem[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}

@Entity('template_set_items')
export class TemplateSetItem {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'template_set_id', type: 'varchar', length: 36 })
  templateSetId: string;

  @Column({ name: 'template_id', type: 'varchar', length: 36 })
  templateId: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  // Relations
  @ManyToOne(() => TemplateSet, (set) => set.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_set_id' })
  templateSet: TemplateSet;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
