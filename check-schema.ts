import 'reflect-metadata';
import dataSource from './src/database/data-source';

async function checkSchema() {
  try {
    console.log('Connecting to database...');
    await dataSource.initialize();
    
    console.log('Checking buildings table schema...');
    const result = await dataSource.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'buildings' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Buildings table columns:');
    console.table(result);
    
    console.log('Checking room_types table schema...');
    const roomTypesResult = await dataSource.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'room_types' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Room types table columns:');
    console.table(roomTypesResult);
    
    console.log('Checking amenities table schema...');
    const amenitiesResult = await dataSource.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'amenities' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Amenities table columns:');
    console.table(amenitiesResult);
    
    console.log('Checking amenity category enum values...');
    const enumResult = await dataSource.query(`
      SELECT e.enumlabel AS value 
      FROM pg_enum e 
      INNER JOIN pg_type t ON t.oid = e.enumtypid 
      INNER JOIN pg_namespace n ON n.oid = t.typnamespace 
      WHERE n.nspname = 'public' AND t.typname = 'amenity_category_enum'
      ORDER BY e.enumsortorder;
    `);
    
    console.log('Available enum values for amenity_category_enum:');
    console.table(enumResult);
    
    console.log('Checking rooms table schema...');
    const roomsResult = await dataSource.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'rooms' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Rooms table columns:');
    console.table(roomsResult);
    
    console.log('Checking room status enum values...');
    const roomStatusResult = await dataSource.query(`
      SELECT e.enumlabel AS value 
      FROM pg_enum e 
      INNER JOIN pg_type t ON t.oid = e.enumtypid 
      INNER JOIN pg_namespace n ON n.oid = t.typnamespace 
      WHERE n.nspname = 'public' AND t.typname = 'room_status_enum'
      ORDER BY e.enumsortorder;
    `);
    
    console.log('Available enum values for room_status_enum:');
    console.table(roomStatusResult);
    
    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();