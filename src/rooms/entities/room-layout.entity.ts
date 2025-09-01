import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Room } from './room.entity';

@Entity('room_layouts')
export class RoomLayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id', unique: true })
  roomId: string;

  @Column({ name: 'layout_type', length: 50, default: 'standard' })
  layoutType: string;

  @Column({ type: 'jsonb', nullable: true })
  layoutData: any;

  @Column({ type: 'jsonb', nullable: true })
  bedPositions: any;

  @Column({ type: 'jsonb', nullable: true })
  furnitureLayout: any;

  @Column({ type: 'jsonb', nullable: true })
  dimensions: any;

  @Column({ type: 'jsonb', nullable: true })
  floorPlan: any;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', length: 100, nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', length: 100, nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => Room, room => room.layout, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;
}