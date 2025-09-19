import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('hostel_profiles')
@Index(['businessId'], { unique: true })
export class Hostel extends BaseEntity {
  @Column({ name: 'business_id', unique: true })
  businessId: string; // This maps to businessId from JWT tokens

  @Column({ name: 'hostel_name', length: 255 })
  name: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Relations - using forward references to avoid circular imports
  @OneToMany('Room', 'hostel')
  rooms: any[];

  @OneToMany('Student', 'hostel')
  students: any[];

  @OneToMany('MultiGuestBooking', 'hostel')
  multiGuestBookings: any[];

  @OneToMany('Invoice', 'hostel')
  invoices: any[];

  @OneToMany('Payment', 'hostel')
  payments: any[];

  @OneToMany('LedgerEntry', 'hostel')
  ledgerEntries: any[];

  @OneToMany('Discount', 'hostel')
  discounts: any[];

  @OneToMany('AdminCharge', 'hostel')
  adminCharges: any[];

  @OneToMany('Report', 'hostel')
  reports: any[];

  @OneToMany('MealPlan', 'hostel')
  mealPlans: any[];
}