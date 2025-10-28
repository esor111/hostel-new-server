import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Import all entities
import { Student } from '../students/entities/student.entity';
import { StudentContact } from '../students/entities/student-contact.entity';
import { StudentAcademicInfo } from '../students/entities/student-academic-info.entity';
import { StudentFinancialInfo } from '../students/entities/student-financial-info.entity';

import { Room } from '../rooms/entities/room.entity';
import { Building } from '../rooms/entities/building.entity';
import { RoomType } from '../rooms/entities/room-type.entity';
import { Amenity } from '../rooms/entities/amenity.entity';
import { RoomAmenity } from '../rooms/entities/room-amenity.entity';
import { RoomOccupant } from '../rooms/entities/room-occupant.entity';
import { RoomLayout } from '../rooms/entities/room-layout.entity';
import { Bed } from '../rooms/entities/bed.entity';

import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';

import { Payment } from '../payments/entities/payment.entity';
import { PaymentInvoiceAllocation } from '../payments/entities/payment-invoice-allocation.entity';

import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { LedgerEntryV2 } from '../ledger-v2/entities/ledger-entry-v2.entity';

import { Discount } from '../discounts/entities/discount.entity';
import { DiscountType } from '../discounts/entities/discount-type.entity';

// Removed: import { BookingRequest } from '../bookings/entities/booking-request.entity';
import { MultiGuestBooking } from '../bookings/entities/multi-guest-booking.entity';
import { BookingGuest } from '../bookings/entities/booking-guest.entity';

import { Report } from '../reports/entities/report.entity';

import { MaintenanceRequest } from '../maintenance/entities/maintenance-request.entity';

import { AdminCharge } from '../admin-charges/entities/admin-charge.entity';
import { Hostel } from '../hostel/entities/hostel.entity';
import { MealPlan } from '../meal-plans/entities/meal-plan.entity';

// Load environment variables
config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'kaha_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'kaha_hostel_db',
  entities: [
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
    Bed,
    
    // Financial entities
    Invoice,
    InvoiceItem,
    Payment,
    PaymentInvoiceAllocation,
    LedgerEntry,
    LedgerEntryV2,
    
    // Discount entities
    Discount,
    DiscountType,
    
    // Booking entities
    // Removed: BookingRequest,
    MultiGuestBooking,
    BookingGuest,
    
    // Report entities
    Report,

    MaintenanceRequest,
    
    // Admin charges entities
    AdminCharge,
    
    // Hostel entities
    Hostel,
    
    // Meal Plan entities
    MealPlan,
  ],
  // Migrations disabled - using synchronize mode for development
  migrations: [],
  synchronize: process.env.NODE_ENV === 'development', // Auto-sync schema in development only
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  migrationsRun: false,
  migrationsTableName: 'typeorm_migrations',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;