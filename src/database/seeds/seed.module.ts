import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../database.module';

import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

// Import all entities
import { Student } from '../../students/entities/student.entity';
import { StudentContact } from '../../students/entities/student-contact.entity';
import { StudentAcademicInfo } from '../../students/entities/student-academic-info.entity';
import { StudentFinancialInfo } from '../../students/entities/student-financial-info.entity';

import { Room } from '../../rooms/entities/room.entity';
import { Building } from '../../rooms/entities/building.entity';
import { RoomType } from '../../rooms/entities/room-type.entity';
import { Amenity } from '../../rooms/entities/amenity.entity';
import { RoomAmenity } from '../../rooms/entities/room-amenity.entity';
import { RoomOccupant } from '../../rooms/entities/room-occupant.entity';
import { RoomLayout } from '../../rooms/entities/room-layout.entity';

import { Invoice } from '../../invoices/entities/invoice.entity';
import { InvoiceItem } from '../../invoices/entities/invoice-item.entity';

import { Payment } from '../../payments/entities/payment.entity';
import { PaymentInvoiceAllocation } from '../../payments/entities/payment-invoice-allocation.entity';

import { LedgerEntry } from '../../ledger/entities/ledger-entry.entity';

import { Discount } from '../../discounts/entities/discount.entity';
import { DiscountType } from '../../discounts/entities/discount-type.entity';

import { BookingRequest } from '../../bookings/entities/booking-request.entity';

import { Report } from '../../reports/entities/report.entity';
import { AdminCharge } from '../../admin-charges/entities/admin-charge.entity';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([
      // Student entities
      Student,
      StudentContact,
      StudentAcademicInfo,
      StudentFinancialInfo,
      
      // Room entities
      Room,
      Building,
      RoomType,
      Amenity,
      RoomAmenity,
      RoomOccupant,
      RoomLayout,
      
      // Financial entities
      Invoice,
      InvoiceItem,
      Payment,
      PaymentInvoiceAllocation,
      LedgerEntry,
      
      // Discount entities
      Discount,
      DiscountType,
      
      // Booking entities
      BookingRequest,
      
      // Report entities
      Report,
      
      // Admin charges entities
      AdminCharge,
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}