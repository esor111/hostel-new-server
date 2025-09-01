import 'reflect-metadata';
import dataSource from './src/database/data-source';

async function runMigrations() {
  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();
    
    console.log('Running migrations...');
    await dataSource.runMigrations();
    
    console.log('Migrations completed successfully!');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runMigrations();