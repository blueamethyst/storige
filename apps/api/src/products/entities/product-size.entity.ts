import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_sizes')
export class ProductSize {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @ManyToOne(() => Product, (product) => product.sizes)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int' })
  sizeNo: number;

  @Column({ length: 100, nullable: true })
  sizeName: string;

  @Column({ type: 'float' })
  width: number;

  @Column({ type: 'float' })
  height: number;

  @Column({ type: 'float', default: 0 })
  cutSize: number;

  @Column({ type: 'float', nullable: true })
  safeSize: number;

  @Column({ default: false })
  nonStandard: boolean;

  @Column({ type: 'json', nullable: true })
  reqWidth: { min: number; max: number };

  @Column({ type: 'json', nullable: true })
  reqHeight: { min: number; max: number };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
