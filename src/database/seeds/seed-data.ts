import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { SeedService } from './seed.service';

async function bootstrap() {
  console.log('🌱 Starting database seeding...');
  
  try {
    const app = await NestFactory.createApplicationContext(SeedModule);
    const seedService = app.get(SeedService);

    // Check current seed status
    console.log('📊 Checking current seed status...');
    const status = await seedService.checkSeedStatus();
    console.log('Current database status:', status);

    // Run complete seeding
    console.log('🚀 Running complete database seeding...');
    const result = await seedService.seedAll(true); // Force seeding to create more data
    
    console.log('✅ Seeding completed successfully!');
    console.log('Seeding results:', result);

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

bootstrap();