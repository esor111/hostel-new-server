import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  getHello(): string {
    return 'Kaha Hostel Management API is running!';
  }

  async getHealthStatus() {
    try {
      // Check database connection
      const isConnected = this.dataSource.isInitialized;
      
      if (isConnected) {
        // Test query to ensure database is responsive
        await this.dataSource.query('SELECT 1');
      }

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: {
          connected: isConnected,
          type: this.dataSource.options.type,
          database: this.dataSource.options.database,
        },
        environment: process.env.NODE_ENV || 'development',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error.message,
        },
        environment: process.env.NODE_ENV || 'development',
      };
    }
  }
}