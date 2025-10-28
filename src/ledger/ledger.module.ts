import { Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { LedgerV2Module } from '../ledger-v2/ledger-v2.module';

@Module({
  imports: [LedgerV2Module],
  controllers: [LedgerController],
  providers: [],
  exports: [],
})
export class LedgerModule {}