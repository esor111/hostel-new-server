import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsNewController } from './rooms-new.controller';
import { RoomsNewService } from './rooms-new.service';
import { RoomsOptimizedController } from './rooms-optimized.controller';
import { RoomsOptimizedService } from './rooms-optimized.service';
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
import { Hostel } from '../hostel/entities/hostel.entity';
import { HostelModule } from '../hostel/hostel.module';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Room,
      Building,
      RoomType,
      Amenity,
      RoomAmenity,
      RoomOccupant,
      RoomLayout,
      Student,
      Bed,
      Hostel
    ]),
    HostelModule
  ],
  controllers: [RoomsController, RoomsNewController, RoomsOptimizedController],
  providers: [RoomsService, RoomsNewService, RoomsOptimizedService, BedSyncService, BedService, HostelAuthWithContextGuard],
  exports: [RoomsService, RoomsNewService, RoomsOptimizedService, BedSyncService, BedService],
})
export class RoomsModule {}