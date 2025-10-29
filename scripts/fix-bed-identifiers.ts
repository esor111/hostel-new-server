import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function fixBedIdentifiers() {
    console.log('🔧 Starting bed identifier fix...');

    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'kaha_user',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'kaha_hostel_db',
        synchronize: false,
        logging: true,
    });

    try {
        await dataSource.initialize();
        console.log('✅ Database connection established');

        const queryRunner = dataSource.createQueryRunner();

        // Step 1: Find all beds with malformed identifiers
        console.log('🔍 Finding beds with malformed identifiers...');
        const malformedBeds = await queryRunner.query(`
      SELECT 
        b.id,
        b.bed_identifier,
        b.bed_number,
        r."roomNumber",
        r.id as room_id
      FROM beds b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.bed_identifier LIKE '%-%-%-%' -- Identifiers with multiple dashes (malformed)
      ORDER BY r."roomNumber", b.bed_number
    `);

        console.log(`📊 Found ${malformedBeds.length} beds with malformed identifiers`);

        if (malformedBeds.length === 0) {
            console.log('✅ No malformed bed identifiers found');
            return;
        }

        // Step 2: Show examples of malformed identifiers
        console.log('📋 Examples of malformed identifiers:');
        malformedBeds.slice(0, 5).forEach(bed => {
            console.log(`   - Room ${bed.roomNumber}: ${bed.bed_identifier} (should be ${bed.roomNumber}-bed${bed.bed_number})`);
        });

        // Step 3: Fix the identifiers
        console.log('🛠️ Fixing bed identifiers...');
        let fixedCount = 0;

        for (const bed of malformedBeds) {
            // Generate correct identifier: ROOM_NUMBER-bed + BED_NUMBER
            const correctIdentifier = `${bed.roomNumber}-bed${bed.bed_number}`;

            try {
                // Check if the correct identifier already exists
                const existingBed = await queryRunner.query(`
          SELECT id FROM beds WHERE bed_identifier = $1 AND id != $2
        `, [correctIdentifier, bed.id]);

                if (existingBed.length > 0) {
                    console.log(`⚠️ Identifier ${correctIdentifier} already exists, skipping bed ${bed.id}`);
                    continue;
                }

                // Update the bed identifier
                await queryRunner.query(`
          UPDATE beds 
          SET bed_identifier = $1 
          WHERE id = $2
        `, [correctIdentifier, bed.id]);

                console.log(`✅ Fixed: ${bed.bed_identifier} → ${correctIdentifier}`);
                fixedCount++;

            } catch (error) {
                console.error(`❌ Failed to fix bed ${bed.id}: ${error.message}`);
            }
        }

        // Step 4: Verify the fix
        console.log('🔍 Verifying fix...');
        const remainingMalformed = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM beds 
      WHERE bed_identifier LIKE '%-%-%-%'
    `);

        console.log(`📊 Remaining malformed identifiers: ${remainingMalformed[0].count}`);

        // Step 5: Show sample of fixed identifiers
        const sampleFixed = await queryRunner.query(`
      SELECT 
        b.bed_identifier,
        r."roomNumber"
      FROM beds b
      JOIN rooms r ON b.room_id = r.id
      ORDER BY r."roomNumber", b.bed_number
      LIMIT 10
    `);

        console.log('📋 Sample of current bed identifiers:');
        sampleFixed.forEach(bed => {
            console.log(`   - Room ${bed.roomNumber}: ${bed.bed_identifier}`);
        });

        await queryRunner.release();

        console.log(`🎉 Bed identifier fix completed! Fixed ${fixedCount} beds`);

    } catch (error) {
        console.error('❌ Error during bed identifier fix:', error);
        throw error;
    } finally {
        await dataSource.destroy();
        console.log('🔌 Database connection closed');
    }
}

// Run the script
fixBedIdentifiers()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });