import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hostel_profiles')
export class HostelProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hostel_name' })
  hostelName: string;

  @Column({ name: 'owner_name' })
  ownerName: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  address: string;

  @Column()
  province: string;

  @Column()
  district: string;

  @Column('text')
  description: string;

  @Column('json')
  amenities: Array<{
    id: string;
    label: string;
    checked: boolean;
  }>;

  @Column('json')
  policies: {
    checkInTime: string;
    checkOutTime: string;
    cancelationPolicy: string;
    smokingPolicy: string;
    petPolicy: string;
    visitorPolicy: string;
  };

  @Column('json')
  pricing: {
    dormBed: number;
    privateRoom: number;
    laundryService: number;
    foodService: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}