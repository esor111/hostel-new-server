import { Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { LedgerV2Module } from '../ledger-v2/ledger-v2.module';
import { AuthModule } from '../auth/auth.module';
import { HostelModule } from '../hostel/hostel.module';

@Module({
  imports: [
    LedgerV2Module,
    AuthModule,
    HostelModule,
  ],
  controllers: [LedgerController],
  providers: [],
  exports: [],
})
export class LedgerModule {}