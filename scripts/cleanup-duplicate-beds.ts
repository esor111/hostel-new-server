import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function cleanupDuplicateBeds() {
  console.log('🧹 Starting duplicate bed cleanup...');

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

    // Step 1: Find all beds grouped by room and bed number
    console.log('🔍 Analyzing bed duplicates...');
    const bedAnalysis = await queryRunner.query(`
      SELECT 
        r."roomNumber",
        b.bed_number,
        COUNT(*) as bed_count,
        ARRAY_AGG(b.id ORDER BY b."createdAt") as bed_ids,
        ARRAY_AGG(b.bed_identifier ORDER BY b."createdAt") as bed_identifiers,
        ARRAY_AGG(b.status ORDER BY b."createdAt") as bed_statuses
      FROM beds b
      JOIN rooms r ON b.room_id = r.id
      GROUP BY r."roomNumber", b.bed_number
      HAVING COUNT(*) > 1
      ORDER BY r."roomNumber", b.bed_number
    `);

    console.log(`📊 Found ${bedAnalysis.length} bed numbers with duplicates`);

    if (bedAnalysis.length === 0) {
      console.log('✅ No duplicate beds found');
      return;
    }

    // Step 2: Show examples of duplicates
    console.log('📋 Examples of duplicate beds:');
    bedAnalysis.slice(0, 5).forEach(analysis => {
      console.log(`   - Room ${analysis.roomNumber}, Bed ${analysis.bed_number}: ${analysis.bed_count} duplicates`);
      console.log(`     Identifiers: ${analysis.bed_identifiers.join(', ')}`);
    });

    // Step 3: Clean up duplicates - keep the first (oldest) bed, remove others
    console.log('🛠️ Cleaning up duplicate beds...');
    let removedCount = 0;

    for (const analysis of bedAnalysis) {
      const bedIds = analysis.bed_ids;
      const bedIdentifiers = analysis.bed_identifiers;
      
      // Keep the first bed (oldest), remove the rest
      const bedToKeep = bedIds[0];
      const bedsToRemove = bedIds.slice(1);
      
      console.log(`🔧 Room ${analysis.roomNumber}, Bed ${analysis.bed_number}:`);
      console.log(`   Keeping: ${bedIdentifiers[0]} (${bedToKeep})`);
      console.log(`   Removing: ${bedsToRemove.length} duplicates`);

      // Remove duplicate beds
      for (let i = 0; i < bedsToRemove.length; i++) {
        const bedId = bedsToRemove[i];
        const bedIdentifier = bedIdentifiers[i + 1];
        
        try {
          await queryRunner.query(`DELETE FROM beds WHERE id = $1`, [bedId]);
          console.log(`   ✅ Removed: ${bedIdentifier} (${bedId})`);
          removedCount++;
        } catch (error) {
          console.error(`   ❌ Failed to remove bed ${bedId}: ${error.message}`);
        }
      }

      // Update the kept bed to have a clean identifier
      const correctIdentifier = `${analysis.roomNumber}-bed${analysis.bed_number}`;
      try {
        await queryRunner.query(`
          UPDATE beds 
          SET bed_identifier = $1 
          WHERE id = $2
        `, [correctIdentifier, bedToKeep]);
        console.log(`   ✅ Updated kept bed identifier to: ${correctIdentifier}`);
      } catch (error) {
        console.error(`   ❌ Failed to update bed identifier: ${error.message}`);
      }
    }

    // Step 4: Fix any remaining malformed identifiers
    console.log('🔧 Fixing remaining malformed identifiers...');
    const remainingMalformed = await queryRunner.query(`
      SELECT 
        b.id,
        b.bed_identifier,
        b.bed_number,
        r."roomNumber"
      FROM beds b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.bed_identifier LIKE '%-%-%-%' 
         OR b.bed_identifier LIKE '%-R-%'
         OR b.bed_identifier NOT LIKE r."roomNumber" || '-bed%'
      ORDER BY r."roomNumber", b.bed_number
    `);

    console.log(`📊 Found ${remainingMalformed.length} beds with malformed identifiers`);

    for (const bed of remainingMalformed) {
      const correctIdentifier = `${bed.roomNumber}-bed${bed.bed_number}`;
      
      try {
        // Check if correct identifier already exists
        const existing = await queryRunner.query(`
          SELECT id FROM beds WHERE bed_identifier = $1 AND id != $2
        `, [correctIdentifier, bed.id]);

        if (existing.length > 0) {
          // If correct identifier exists, this is a duplicate - remove it
          await queryRunner.query(`DELETE FROM beds WHERE id = $1`, [bed.id]);
          console.log(`   🗑️ Removed duplicate: ${bed.bed_identifier} (${bed.id})`);
          removedCount++;
        } else {
          // Update to correct identifier
          await queryRunner.query(`
            UPDATE beds 
            SET bed_identifier = $1 
            WHERE id = $2
          `, [correctIdentifier, bed.id]);
          console.log(`   ✅ Fixed: ${bed.bed_identifier} → ${correctIdentifier}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to fix bed ${bed.id}: ${error.message}`);
      }
    }

    // Step 5: Final verification
    console.log('🔍 Final verification...');
    const finalCheck = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM beds 
      WHERE bed_identifier LIKE '%-%-%-%' 
         OR bed_identifier LIKE '%-R-%'
    `);

    console.log(`📊 Remaining malformed identifiers: ${finalCheck[0].count}`);

    // Show sample of clean identifiers
    const sampleClean = await queryRunner.query(`
      SELECT 
        b.bed_identifier,
        r."roomNumber"
      FROM beds b
      JOIN rooms r ON b.room_id = r.id
      ORDER BY r."roomNumber", b.bed_number
      LIMIT 10
    `);

    console.log('📋 Sample of current bed identifiers:');
    sampleClean.forEach(bed => {
      console.log(`   - Room ${bed.roomNumber}: ${bed.bed_identifier}`);
    });

    await queryRunner.release();

    console.log(`🎉 Cleanup completed! Removed ${removedCount} duplicate/malformed beds`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
cleanupDuplicateBeds()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });