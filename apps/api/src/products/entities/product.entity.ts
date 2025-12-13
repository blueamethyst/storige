import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { ProductSize } from './product-size.entity';
import { TemplateSet } from '../../templates/entities/template-set.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 255, nullable: true })
  productId: string; // External product ID (e.g., WowPress)

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  template: {
    editorPreset?: {
      settings: {
        dpi?: number;
        guideline?: { cutLine?: boolean; safeLine?: boolean };
        page?: { count?: number; min?: number; max?: number; interval?: number };
        size?: { width?: number; height?: number; cutSize?: number; safeSize?: number };
        unit?: string;
        exportOption?: { colorMode?: 'RGB' | 'CMYK' };
        menu?: unknown[];
      };
      defaultTemplate?: { id: string } | null;
      editorTemplates?: Array<{
        id: string;
        name: string;
        sizeNo?: number;
        image?: { image?: { url?: string } };
        design?: { document?: { url?: string } };
        cutLineTemplate?: { image?: { url?: string } };
        tags?: Array<{ id?: string; name?: string }>;
      }> | null;
    } | null;
  };

  @Column({ type: 'json', nullable: true })
  editorTemplates: Array<{
    id: string;
    name: string;
    sizeNo?: number;
    image?: { image?: { url?: string } };
    design?: { document?: { url?: string } };
    cutLineTemplate?: { image?: { url?: string } };
    tags?: Array<{ id?: string; name?: string }>;
  }>;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => TemplateSet, { nullable: true })
  @JoinColumn({ name: 'template_set_id' })
  templateSet: TemplateSet;

  @RelationId((product: Product) => product.templateSet)
  templateSetId: string | null;

  @OneToMany(() => ProductSize, (size) => size.product)
  sizes: ProductSize[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
