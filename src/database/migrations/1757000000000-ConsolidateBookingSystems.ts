import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsolidateBookingSystems1757000000000 implements MigrationInterface {
  name = 'ConsolidateBookingSystems1757000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🚀 Starting booking system consolidation migration');

    // Step 1: Create backup of existing booking_requests data
    console.log('📦 Creating backup of existing booking_requests data...');
    
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_requests_backup AS 
      SELECT * FROM booking_requests;
    `);

    const backupCount = await queryRunner.query(`
      SELECT COUNT(*) as count FROM booking_requests_backup;
    `);
    console.log(`✅ Backed up ${backupCount[0].count} booking requests`);

    // Step 2: Enhance multi_guest_bookings table with fields from booking_requests
    console.log('🔧 Enhancing multi_guest_bookings table with additional fields...');

    // Add missing columns from booking_requests to multi_guest_bookings
    const columnsToAdd = [
      { name: 'guardian_name', type: 'varchar(255)', nullable: true },
      { name: 'guardian_phone', type: 'varchar(20)', nullable: true },
      { name: 'preferred_room', type: 'varchar(255)', nullable: true },
      { name: 'course', type: 'varchar(255)', nullable: true },
      { name: 'institution', type: 'varchar(255)', nullable: true },
      { name: 'request_date', type: 'date', nullable: false, default: 'CURRENT_DATE' },
      { name: 'address', type: 'text', nullable: true },
      { name: 'id_proof_type', type: 'varchar(50)', nullable: true },
      { name: 'id_proof_number', type: 'varchar(100)', nullable: true },
      { name: 'approved_date', type: 'date', nullable: true },
      { name: 'rejection_reason', type: 'text', nullable: true },
      { name: 'assigned_room', type: 'varchar(50)', nullable: true },
      { name: 'priority_score', type: 'int', nullable: false, default: '0' }
    ];

    for (const column of columnsToAdd) {
      try {
        // Check if column already exists
        const columnExists = await queryRunner.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'multi_guest_bookings' 
            AND column_name = '${column.name}';
        `);

        if (columnExists.length === 0) {
          const defaultClause = column.default ? `DEFAULT ${column.default}` : '';
          const nullableClause = column.nullable ? 'NULL' : 'NOT NULL';
          
          await queryRunner.query(`
            ALTER TABLE multi_guest_bookings 
            ADD COLUMN ${column.name} ${column.type} ${nullableClause} ${defaultClause};
          `);
          console.log(`✅ Added column ${column.name} to multi_guest_bookings`);
        } else {
          console.log(`⏭️ Column ${column.name} already exists in multi_guest_bookings`);
        }
      } catch (error) {
        console.error(`❌ Failed to add column ${column.name}: ${error.message}`);
        throw error;
      }
    }

    // Step 3: Enhance booking_guests table with personal information fields
    console.log('🔧 Enhancing booking_guests table with personal information fields...');

    const guestColumnsToAdd = [
      { name: 'guardian_name', type: 'varchar(255)', nullable: true },
      { name: 'guardian_phone', type: 'varchar(20)', nullable: true },
      { name: 'course', type: 'varchar(255)', nullable: true },
      { name: 'institution', type: 'varchar(255)', nullable: true },
      { name: 'address', type: 'text', nullable: true },
      { name: 'id_proof_type', type: 'varchar(50)', nullable: true },
      { name: 'id_proof_number', type: 'varchar(100)', nullable: true },
      { name: 'phone', type: 'varchar(20)', nullable: true },
      { name: 'email', type: 'varchar(255)', nullable: true }
    ];

    for (const column of guestColumnsToAdd) {
      try {
        const columnExists = await queryRunner.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'booking_guests' 
            AND column_name = '${column.name}';
        `);

        if (columnExists.length === 0) {
          const nullableClause = column.nullable ? 'NULL' : 'NOT NULL';
          
          await queryRunner.query(`
            ALTER TABLE booking_guests 
            ADD COLUMN ${column.name} ${column.type} ${nullableClause};
          `);
          console.log(`✅ Added column ${column.name} to booking_guests`);
        } else {
          console.log(`⏭️ Column ${column.name} already exists in booking_guests`);
        }
      } catch (error) {
        console.error(`❌ Failed to add column ${column.name}: ${error.message}`);
        throw error;
      }
    }

    // Step 4: Migrate data from booking_requests to multi_guest_bookings
    console.log('📊 Migrating booking_requests data to multi_guest_bookings...');

    const bookingRequests = await queryRunner.query(`
      SELECT * FROM booking_requests ORDER BY "createdAt";
    `);

    console.log(`Found ${bookingRequests.length} booking requests to migrate`);

    let migratedCount = 0;
    const migrationErrors = [];

    for (const booking of bookingRequests) {
      try {
        // Generate booking reference
        const timestamp = new Date(booking.createdAt).getTime().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const bookingReference = `MGB${timestamp}${random}`;

        // Map booking status
        let multiGuestStatus = 'Pending';
        switch (booking.status) {
          case 'Approved':
            multiGuestStatus = 'Confirmed';
            break;
          case 'Rejected':
          case 'Cancelled':
            multiGuestStatus = 'Cancelled';
            break;
          case 'Expired':
            multiGuestStatus = 'Cancelled';
            break;
          default:
            multiGuestStatus = 'Pending';
        }

        // Insert into multi_guest_bookings
        const insertResult = await queryRunner.query(`
          INSERT INTO multi_guest_bookings (
            id, contact_name, contact_phone, contact_email,
            guardian_name, guardian_phone, preferred_room,
            course, institution, request_date, check_in_date,
            duration, status, notes, emergency_contact,
            address, id_proof_type, id_proof_number,
            approved_date, processed_by, rejection_reason,
            assigned_room, priority_score, source,
            total_guests, confirmed_guests, booking_reference,
            "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
          ) RETURNING id;
        `, [
          booking.id, // Keep original ID for reference tracking
          booking.name,
          booking.phone,
          booking.email,
          booking.guardianName,
          booking.guardianPhone,
          booking.preferredRoom,
          booking.course,
          booking.institution,
          booking.requestDate,
          booking.checkInDate,
          booking.duration,
          multiGuestStatus,
          booking.notes,
          booking.emergencyContact,
          booking.address,
          booking.idProofType,
          booking.idProofNumber,
          booking.approvedDate,
          booking.processedBy,
          booking.rejectionReason,
          booking.assignedRoom,
          booking.priorityScore || 0,
          booking.source || 'website',
          1, // total_guests (single guest)
          multiGuestStatus === 'Confirmed' ? 1 : 0, // confirmed_guests
          bookingReference,
          booking.createdAt,
          booking.updatedAt
        ]);

        // Create corresponding booking_guest record
        await queryRunner.query(`
          INSERT INTO booking_guests (
            id, booking_id, bed_id, guest_name, age, gender,
            status, guardian_name, guardian_phone, course,
            institution, address, id_proof_type, id_proof_number,
            phone, email, assigned_room_number, assigned_bed_number,
            "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19
          );
        `, [
          booking.id, // booking_id (same as multi_guest_booking id)
          booking.assignedRoom || 'auto-assign', // bed_id
          booking.name, // guest_name
          18, // age (default, as not available in booking_requests)
          'Any', // gender (default, as not available in booking_requests)
          multiGuestStatus === 'Confirmed' ? 'Confirmed' : 
          multiGuestStatus === 'Cancelled' ? 'Cancelled' : 'Pending', // status
          booking.guardianName,
          booking.guardianPhone,
          booking.course,
          booking.institution,
          booking.address,
          booking.idProofType,
          booking.idProofNumber,
          booking.phone,
          booking.email,
          booking.assignedRoom,
          booking.assignedRoom, // Use room as bed for now
          booking.createdAt,
          booking.updatedAt
        ]);

        migratedCount++;
        
        if (migratedCount % 10 === 0) {
          console.log(`📊 Migrated ${migratedCount}/${bookingRequests.length} booking requests...`);
        }
      } catch (error) {
        const errorMsg = `Failed to migrate booking ${booking.id}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        migrationErrors.push(errorMsg);
      }
    }

    console.log(`✅ Successfully migrated ${migratedCount} booking requests to multi-guest bookings`);
    
    if (migrationErrors.length > 0) {
      console.warn(`⚠️ Migration had ${migrationErrors.length} errors:`);
      migrationErrors.forEach(error => console.warn(`  - ${error}`));
    }

    // Step 5: Update students table to remove booking_request_id dependency
    console.log('🔧 Removing booking_request_id column from students table...');

    // First, let's see how many students have booking_request_id
    const studentsWithBookingId = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM students 
      WHERE booking_request_id IS NOT NULL;
    `);
    console.log(`Found ${studentsWithBookingId[0].count} students with booking_request_id`);

    // Check if the column exists before trying to drop it
    const bookingIdColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'students' 
        AND column_name = 'booking_request_id';
    `);

    if (bookingIdColumnExists.length > 0) {
      // Drop the foreign key constraint first if it exists
      try {
        await queryRunner.query(`
          ALTER TABLE students 
          DROP CONSTRAINT IF EXISTS "FK_students_booking_request";
        `);
        console.log('✅ Dropped foreign key constraint FK_students_booking_request');
      } catch (error) {
        console.log('⏭️ Foreign key constraint FK_students_booking_request does not exist or already dropped');
      }

      // Drop the column
      await queryRunner.query(`
        ALTER TABLE students 
        DROP COLUMN booking_request_id;
      `);
      console.log('✅ Removed booking_request_id column from students table');
    } else {
      console.log('⏭️ booking_request_id column does not exist in students table');
    }

    // Step 6: Drop booking_requests table
    console.log('🗑️ Dropping booking_requests table...');

    // Check if table exists
    const tableExists = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'booking_requests';
    `);

    if (tableExists.length > 0) {
      await queryRunner.query(`DROP TABLE booking_requests CASCADE;`);
      console.log('✅ Dropped booking_requests table');
    } else {
      console.log('⏭️ booking_requests table does not exist');
    }

    // Step 7: Create indexes for performance
    console.log('📈 Creating performance indexes...');

    const indexesToCreate = [
      'CREATE INDEX IF NOT EXISTS idx_multi_guest_bookings_request_date ON multi_guest_bookings(request_date);',
      'CREATE INDEX IF NOT EXISTS idx_multi_guest_bookings_priority_score ON multi_guest_bookings(priority_score);',
      'CREATE INDEX IF NOT EXISTS idx_multi_guest_bookings_source ON multi_guest_bookings(source);',
      'CREATE INDEX IF NOT EXISTS idx_booking_guests_phone ON booking_guests(phone);',
      'CREATE INDEX IF NOT EXISTS idx_booking_guests_email ON booking_guests(email);'
    ];

    for (const indexQuery of indexesToCreate) {
      try {
        await queryRunner.query(indexQuery);
        console.log(`✅ Created index: ${indexQuery.split(' ')[5]}`);
      } catch (error) {
        console.log(`⏭️ Index already exists or failed to create: ${error.message}`);
      }
    }

    // Step 8: Update statistics
    console.log('📊 Generating migration statistics...');

    const finalStats = await queryRunner.query(`
      SELECT 
        (SELECT COUNT(*) FROM multi_guest_bookings) as total_multi_guest_bookings,
        (SELECT COUNT(*) FROM booking_guests) as total_booking_guests,
        (SELECT COUNT(*) FROM multi_guest_bookings WHERE total_guests = 1) as single_guest_bookings,
        (SELECT COUNT(*) FROM multi_guest_bookings WHERE total_guests > 1) as multi_guest_bookings_actual,
        (SELECT COUNT(*) FROM booking_requests_backup) as original_booking_requests;
    `);

    const stats = finalStats[0];
    console.log('📊 Migration Statistics:');
    console.log(`  - Original booking requests: ${stats.original_booking_requests}`);
    console.log(`  - Total multi-guest bookings: ${stats.total_multi_guest_bookings}`);
    console.log(`  - Single guest bookings: ${stats.single_guest_bookings}`);
    console.log(`  - Actual multi-guest bookings: ${stats.multi_guest_bookings_actual}`);
    console.log(`  - Total booking guests: ${stats.total_booking_guests}`);

    console.log('🎉 Booking system consolidation migration completed successfully!');
    console.log('💡 Note: booking_requests_backup table preserved for rollback purposes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back booking system consolidation...');

    // Step 1: Restore booking_requests table from backup
    console.log('📦 Restoring booking_requests table from backup...');

    const backupExists = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'booking_requests_backup';
    `);

    if (backupExists.length > 0) {
      // Recreate booking_requests table from backup
      await queryRunner.query(`
        CREATE TABLE booking_requests AS 
        SELECT * FROM booking_requests_backup;
      `);

      // Recreate primary key and constraints
      await queryRunner.query(`
        ALTER TABLE booking_requests 
        ADD CONSTRAINT pk_booking_requests PRIMARY KEY (id);
      `);

      // Recreate indexes
      await queryRunner.query(`
        CREATE INDEX idx_booking_requests_status ON booking_requests(status);
      `);
      await queryRunner.query(`
        CREATE INDEX idx_booking_requests_request_date ON booking_requests("requestDate");
      `);
      await queryRunner.query(`
        CREATE INDEX idx_booking_requests_check_in_date ON booking_requests("checkInDate");
      `);
      await queryRunner.query(`
        CREATE INDEX idx_booking_requests_phone ON booking_requests(phone);
      `);
      await queryRunner.query(`
        CREATE INDEX idx_booking_requests_email ON booking_requests(email);
      `);

      console.log('✅ Restored booking_requests table from backup');
    } else {
      console.error('❌ No backup table found! Cannot restore booking_requests');
      throw new Error('Cannot rollback: booking_requests_backup table not found');
    }

    // Step 2: Restore booking_request_id column to students table
    console.log('🔧 Restoring booking_request_id column to students table...');

    const columnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'students' 
        AND column_name = 'booking_request_id';
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE students 
        ADD COLUMN booking_request_id varchar;
      `);

      // Recreate foreign key constraint
      await queryRunner.query(`
        ALTER TABLE students 
        ADD CONSTRAINT "FK_students_booking_request" 
        FOREIGN KEY (booking_request_id) REFERENCES booking_requests(id);
      `);

      console.log('✅ Restored booking_request_id column to students table');
    } else {
      console.log('⏭️ booking_request_id column already exists in students table');
    }

    // Step 3: Remove migrated data from multi_guest_bookings and booking_guests
    console.log('🗑️ Removing migrated data from multi-guest booking tables...');

    // Remove booking guests that were migrated from booking_requests (single guest bookings)
    const deletedGuests = await queryRunner.query(`
      DELETE FROM booking_guests 
      WHERE booking_id IN (
        SELECT id FROM multi_guest_bookings 
        WHERE total_guests = 1 
          AND source != 'mobile_app'
      );
    `);

    // Remove multi-guest bookings that were migrated from booking_requests
    const deletedBookings = await queryRunner.query(`
      DELETE FROM multi_guest_bookings 
      WHERE total_guests = 1 
        AND source != 'mobile_app';
    `);

    console.log(`✅ Removed migrated data: ${deletedBookings.length} bookings and ${deletedGuests.length} guests`);

    // Step 4: Remove added columns from multi_guest_bookings
    console.log('🔧 Removing added columns from multi_guest_bookings...');

    const columnsToRemove = [
      'guardian_name', 'guardian_phone', 'preferred_room', 'course', 'institution',
      'request_date', 'address', 'id_proof_type', 'id_proof_number',
      'approved_date', 'rejection_reason', 'assigned_room', 'priority_score'
    ];

    for (const column of columnsToRemove) {
      try {
        await queryRunner.query(`
          ALTER TABLE multi_guest_bookings 
          DROP COLUMN IF EXISTS ${column};
        `);
        console.log(`✅ Removed column ${column} from multi_guest_bookings`);
      } catch (error) {
        console.log(`⏭️ Column ${column} does not exist or failed to remove: ${error.message}`);
      }
    }

    // Step 5: Remove added columns from booking_guests
    console.log('🔧 Removing added columns from booking_guests...');

    const guestColumnsToRemove = [
      'guardian_name', 'guardian_phone', 'course', 'institution',
      'address', 'id_proof_type', 'id_proof_number', 'phone', 'email'
    ];

    for (const column of guestColumnsToRemove) {
      try {
        await queryRunner.query(`
          ALTER TABLE booking_guests 
          DROP COLUMN IF EXISTS ${column};
        `);
        console.log(`✅ Removed column ${column} from booking_guests`);
      } catch (error) {
        console.log(`⏭️ Column ${column} does not exist or failed to remove: ${error.message}`);
      }
    }

    // Step 6: Drop backup table
    console.log('🗑️ Cleaning up backup table...');
    await queryRunner.query(`DROP TABLE IF EXISTS booking_requests_backup;`);

    console.log('✅ Booking system consolidation rollback completed');
  }
}