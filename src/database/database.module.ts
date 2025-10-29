import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      // Override specific settings if needed
      synchronize: true, // Always false to prevent accidental schema changes
      logging: process.env.NODE_ENV === 'development',
    }),
  ],
})
export class DatabaseModule { }