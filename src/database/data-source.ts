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

import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';

import { Payment } from '../payments/entities/payment.entity';
import { PaymentInvoiceAllocation } from '../payments/entities/payment-invoice-allocation.entity';

import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';

import { Discount } from '../discounts/entities/discount.entity';
import { DiscountType } from '../discounts/entities/discount-type.entity';

import { BookingRequest } from '../bookings/entities/booking-request.entity';

import { Report } from '../reports/entities/report.entity';

import { HostelProfile } from '../hostel/entities/hostel-profile.entity';
import { MaintenanceRequest } from '../maintenance/entities/maintenance-request.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { AdminCharge } from '../admin-charges/entities/admin-charge.entity';

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
    
    // Hostel entities
    HostelProfile,
    MaintenanceRequest,
    Notification,
    
    // Admin charges entities
    AdminCharge,
  ],
  migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false, // Always false in production
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  migrationsRun: false, // Disable auto-run migrations on startup
  migrationsTableName: 'typeorm_migrations',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;