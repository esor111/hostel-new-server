import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HostelController } from './hostel.controller';
import { HostelService } from './hostel.service';
import { Hostel } from './entities/hostel.entity';
import { HostelContextMiddleware } from './middleware/hostel-context.middleware';
import { HostelAuditService } from './services/hostel-audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([Hostel])],
  controllers: [HostelController],
  providers: [HostelService, HostelContextMiddleware, HostelAuditService],
  exports: [HostelService, HostelContextMiddleware, HostelAuditService, TypeOrmModule],
})
export class HostelModule {}