import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Discount } from './discount.entity';

export enum DiscountCategory {
  ACADEMIC = 'academic',
  FINANCIAL_HARDSHIP = 'financial_hardship',
  EARLY_PAYMENT = 'early_payment',
  LOYALTY = 'loyalty',
  PROMOTIONAL = 'promotional',
  STAFF = 'staff',
  SIBLING = 'sibling'
}

@Entity('discount_types')
@Index(['name'], { unique: true })
@Index(['category'])
@Index(['isActive'])
export class DiscountType extends BaseEntity {
  @Column({ length: 100, unique: true })
  name: string; // Academic Excellence, Early Payment, etc.

  @Column({
    type: 'enum',
    enum: DiscountCategory
  })
  category: DiscountCategory;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'default_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  defaultAmount: number;

  @Column({ name: 'is_percentage', default: false })
  isPercentage: boolean;

  @Column({ name: 'percentage_value', type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentageValue: number;

  @Column({ name: 'max_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxAmount: number;

  @Column({ name: 'requires_approval', default: false })
  requiresApproval: boolean;

  @Column({ name: 'auto_apply', default: false })
  autoApply: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, any>; // Eligibility conditions

  // Relations
  @OneToMany(() => Discount, discount => discount.discountType)
  discounts: Discount[];
}