import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HostelController } from './hostel.controller';
import { HostelService } from './hostel.service';
import { HostelProfile } from './entities/hostel-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HostelProfile])],
  controllers: [HostelController],
  providers: [HostelService],
  exports: [HostelService],
})
export class HostelModule {}