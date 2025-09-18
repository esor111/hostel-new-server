import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HostelController } from './hostel.controller';
import { HostelService } from './hostel.service';
import { Hostel } from './entities/hostel.entity';
import { HostelContextMiddleware } from './middleware/hostel-context.middleware';
import { HostelAuditService } from './services/hostel-audit.service';
import { HostelContextInterceptor } from './interceptors/hostel-context.interceptor';
import { BusinessIntegrationService } from './services/business-integration.service';

@Module({
  imports: [TypeOrmModule.forFeature([Hostel])],
  controllers: [HostelController],
  providers: [HostelService, HostelContextMiddleware, HostelAuditService, HostelContextInterceptor, BusinessIntegrationService],
  exports: [HostelService, HostelContextMiddleware, HostelAuditService, HostelContextInterceptor, BusinessIntegrationService, TypeOrmModule],
})
export class HostelModule {}