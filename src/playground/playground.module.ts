import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaygroundController } from './playground.controller';
import { PlaygroundService } from './playground.service';
import { Bed } from '../rooms/entities/bed.entity';
import { Hostel } from '../hostel/entities/hostel.entity';
import { Room } from '../rooms/entities/room.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bed, Hostel, Room])
  ],
  controllers: [PlaygroundController],
  providers: [PlaygroundService],
  exports: [PlaygroundService]
})
export class PlaygroundModule {}
