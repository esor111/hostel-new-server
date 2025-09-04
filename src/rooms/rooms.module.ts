import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { BedSyncService } from './bed-sync.service';
import { BedService } from './bed.service';
import { Room } from './entities/room.entity';
import { Building } from './entities/building.entity';
import { RoomType } from './entities/room-type.entity';
import { Amenity } from './entities/amenity.entity';
import { RoomAmenity } from './entities/room-amenity.entity';
import { RoomOccupant } from './entities/room-occupant.entity';
import { RoomLayout } from './entities/room-layout.entity';
import { Student } from '../students/entities/student.entity';
import { Bed } from './entities/bed.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Room,
    Building,
    RoomType,
    Amenity,
    RoomAmenity,
    RoomOccupant,
    RoomLayout,
    Student,
    Bed
  ])],
  controllers: [RoomsController],
  providers: [RoomsService, BedSyncService, BedService],
  exports: [RoomsService, BedSyncService, BedService],
})
export class RoomsModule {}