import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestPlaygroundController } from './test-playground.controller';
import { TestPlaygroundService } from './test-playground.service';
import { Bed } from '../rooms/entities/bed.entity';
import { Hostel } from '../hostel/entities/hostel.entity';
import { Room } from '../rooms/entities/room.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bed, Hostel, Room])
  ],
  controllers: [TestPlaygroundController],
  providers: [TestPlaygroundService]
})
export class TestPlaygroundModule {}
