import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { StudentsModule } from './students/students.module';
import { RoomsModule } from './rooms/rooms.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { LedgerModule } from './ledger/ledger.module';
import { BookingsModule } from './bookings/bookings.module';
import { DiscountsModule } from './discounts/discounts.module';
import { ReportsModule } from './reports/reports.module';
import { HostelModule } from './hostel/hostel.module';
import { MaintenanceModule } from './maintenance/maintenance.module';

import { AnalyticsModule } from './analytics/analytics.module';
import { SeedModule } from './database/seeds/seed.module';
import { AdminChargesModule } from './admin-charges/admin-charges.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BillingModule } from './billing/billing.module';
import { NotificationCommunicationModule } from './notification-communication/notification-communication.module';
import { AuthModule } from './auth/auth.module';
import { HostelContextMiddleware } from './hostel/middleware/hostel-context.middleware';

@Module({
  imports: [
    // Configuration module for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Database module with TypeORM
    DatabaseModule,
    
    // Feature modules
    StudentsModule,
    RoomsModule,
    InvoicesModule,
    PaymentsModule,
    LedgerModule,
    BookingsModule,
    DiscountsModule,
    ReportsModule,
    HostelModule,
    MaintenanceModule,
    AnalyticsModule,
    SeedModule,
    AdminChargesModule,
    DashboardModule,
    BillingModule,
    NotificationCommunicationModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HostelContextMiddleware)
      .forRoutes(
        'students',
        'rooms', 
        'invoices',
        'payments',
        'ledger',
        'bookings',
        'discounts',
        'reports',
        'maintenance',
        'admin-charges',
        'billing'
      );
  }
}