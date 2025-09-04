import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateBedEntitiesFromLayout1756966400000 implements MigrationInterface {
  name = 'MigrateBedEntitiesFromLayout1756966400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This migration creates Bed entities from existing bedPositions in room layouts
    // It uses raw SQL to avoid dependency on services during migration
    
    console.log('🚀 Starting migration: Creating Bed entities from existing bedPositions');

    // First, let's get all rooms with layouts that have bedPositions
    const roomsWithLayouts = await queryRunner.query(`
      SELECT 
        r.id as room_id,
        r.name as room_name,
        r."roomNumber" as room_number,
        r."bedCount" as bed_count,
        r."monthlyRate" as monthly_rate,
        r.gender,
        rl."bedPositions"
      FROM rooms r
      LEFT JOIN room_layouts rl ON r.id = rl.room_id
      WHERE rl."bedPositions" IS NOT NULL 
        AND jsonb_array_length(rl."bedPositions") > 0
    `);

    console.log(`Found ${roomsWithLayouts.length} rooms with bed positions to migrate`);

    let totalBedsCreated = 0;
    const errors = [];

    for (const room of roomsWithLayouts) {
      try {
        const bedPositions = room.bedPositions;
        
        if (!Array.isArray(bedPositions) || bedPositions.length === 0) {
          console.log(`Skipping room ${room.room_number}: no valid bed positions`);
          continue;
        }

        console.log(`Processing room ${room.room_number} with ${bedPositions.length} bed positions`);

        // Check if beds already exist for this room
        const existingBeds = await queryRunner.query(`
          SELECT COUNT(*) as count FROM beds WHERE room_id = $1
        `, [room.room_id]);

        if (parseInt(existingBeds[0].count) > 0) {
          console.log(`Room ${room.room_number} already has beds, skipping`);
          continue;
        }

        // Create bed entities for each bed position
        for (const position of bedPositions) {
          if (!position.id || !position.id.match(/^bed\d+$/)) {
            console.warn(`Invalid bed identifier in room ${room.room_number}: ${position.id}`);
            continue;
          }

          // Generate bed number from identifier (bed1 -> 1, bed2 -> 2, etc.)
          const bedNumber = position.id.replace('bed', '');

          // Determine bed gender (use position gender, fallback to room gender, then 'Any')
          let bedGender = 'Any';
          if (position.gender && ['Male', 'Female', 'Any'].includes(position.gender)) {
            bedGender = position.gender;
          } else if (room.gender && ['Male', 'Female', 'Any'].includes(room.gender)) {
            bedGender = room.gender;
          }

          // Create bed entity
          await queryRunner.query(`
            INSERT INTO beds (
              id,
              room_id,
              bed_number,
              bed_identifier,
              status,
              gender,
              monthly_rate,
              description,
              current_occupant_id,
              current_occupant_name,
              occupied_since,
              "createdAt",
              "updatedAt"
            ) VALUES (
              gen_random_uuid(),
              $1,
              $2,
              $3,
              'Available',
              $4,
              $5,
              $6,
              NULL,
              NULL,
              NULL,
              NOW(),
              NOW()
            )
          `, [
            room.room_id,
            bedNumber,
            position.id,
            bedGender,
            room.monthly_rate,
            `Bed ${bedNumber} in ${room.room_name}`
          ]);

          totalBedsCreated++;
        }

        console.log(`✅ Created ${bedPositions.length} beds for room ${room.room_number}`);
      } catch (error) {
        const errorMsg = `Failed to migrate room ${room.room_number}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Now handle rooms without layouts but with bed count
    const roomsWithoutLayouts = await queryRunner.query(`
      SELECT 
        r.id as room_id,
        r.name as room_name,
        r."roomNumber" as room_number,
        r."bedCount" as bed_count,
        r."monthlyRate" as monthly_rate,
        r.gender
      FROM rooms r
      LEFT JOIN room_layouts rl ON r.id = rl.room_id
      WHERE (rl."bedPositions" IS NULL OR jsonb_array_length(rl."bedPositions") = 0)
        AND r."bedCount" > 0
    `);

    console.log(`Found ${roomsWithoutLayouts.length} rooms without layouts to create default beds`);

    for (const room of roomsWithoutLayouts) {
      try {
        // Check if beds already exist for this room
        const existingBeds = await queryRunner.query(`
          SELECT COUNT(*) as count FROM beds WHERE room_id = $1
        `, [room.room_id]);

        if (parseInt(existingBeds[0].count) > 0) {
          console.log(`Room ${room.room_number} already has beds, skipping`);
          continue;
        }

        console.log(`Creating ${room.bed_count} default beds for room ${room.room_number}`);

        // Create default beds based on bed count
        for (let i = 1; i <= room.bed_count; i++) {
          const bedGender = room.gender && ['Male', 'Female', 'Any'].includes(room.gender) ? room.gender : 'Any';
          const uniqueBedIdentifier = `${room.room_number}-bed${i}`;

          await queryRunner.query(`
            INSERT INTO beds (
              id,
              room_id,
              bed_number,
              bed_identifier,
              status,
              gender,
              monthly_rate,
              description,
              current_occupant_id,
              current_occupant_name,
              occupied_since,
              "createdAt",
              "updatedAt"
            ) VALUES (
              gen_random_uuid(),
              $1,
              $2,
              $3,
              'Available',
              $4,
              $5,
              $6,
              NULL,
              NULL,
              NULL,
              NOW(),
              NOW()
            )
          `, [
            room.room_id,
            i.toString(),
            uniqueBedIdentifier,
            bedGender,
            room.monthly_rate,
            `Bed ${i} in ${room.room_name}`
          ]);

          totalBedsCreated++;
        }

        console.log(`✅ Created ${room.bed_count} default beds for room ${room.room_number}`);
      } catch (error) {
        const errorMsg = `Failed to create default beds for room ${room.room_number}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`🎉 Migration completed: Created ${totalBedsCreated} bed entities`);
    
    if (errors.length > 0) {
      console.warn(`⚠️ Migration had ${errors.length} errors:`);
      errors.forEach(error => console.warn(`  - ${error}`));
    }

    // Now let's assign existing students to beds based on their room assignments
    console.log('🔄 Assigning existing students to beds...');

    const studentsWithRooms = await queryRunner.query(`
      SELECT 
        s.id as student_id,
        s.name as student_name,
        s.room_id as room_id,
        r."roomNumber" as room_number
      FROM students s
      INNER JOIN rooms r ON s.room_id = r.id
      WHERE s.room_id IS NOT NULL
    `);

    console.log(`Found ${studentsWithRooms.length} students with room assignments`);

    let studentsAssigned = 0;
    for (const student of studentsWithRooms) {
      try {
        // Find an available bed in the student's room
        const availableBed = await queryRunner.query(`
          SELECT id, bed_identifier, bed_number
          FROM beds 
          WHERE room_id = $1 
            AND status = 'Available' 
            AND current_occupant_id IS NULL
          ORDER BY bed_number::int
          LIMIT 1
        `, [student.room_id]);

        if (availableBed.length > 0) {
          const bed = availableBed[0];

          // Assign student to bed
          await queryRunner.query(`
            UPDATE beds 
            SET 
              status = 'Occupied',
              current_occupant_id = $1,
              current_occupant_name = $2,
              occupied_since = NOW(),
              "updatedAt" = NOW()
            WHERE id = $3
          `, [student.student_id, student.student_name, bed.id]);

          studentsAssigned++;
          console.log(`✅ Assigned student ${student.student_name} to bed ${bed.bed_identifier} in room ${student.room_number}`);
        } else {
          console.warn(`⚠️ No available beds found for student ${student.student_name} in room ${student.room_number}`);
        }
      } catch (error) {
        console.error(`❌ Failed to assign student ${student.student_name}: ${error.message}`);
      }
    }

    console.log(`🎉 Student assignment completed: Assigned ${studentsAssigned} students to beds`);

    // Update room occupancy based on bed assignments
    console.log('🔄 Updating room occupancy based on bed assignments...');

    await queryRunner.query(`
      UPDATE rooms 
      SET occupancy = bed_occupancy.occupied_count,
          "updatedAt" = NOW()
      FROM (
        SELECT 
          room_id,
          COUNT(*) FILTER (WHERE status = 'Occupied') as occupied_count
        FROM beds
        GROUP BY room_id
      ) as bed_occupancy
      WHERE rooms.id = bed_occupancy.room_id
    `);

    console.log('✅ Room occupancy updated based on bed assignments');
    console.log('🎉 Bed entity migration completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back bed entity migration...');

    // Remove all bed entities (this will cascade and clean up relationships)
    await queryRunner.query(`DELETE FROM beds`);

    // Reset room occupancy to original values (best effort)
    await queryRunner.query(`
      UPDATE rooms 
      SET occupancy = COALESCE((
        SELECT COUNT(*) 
        FROM room_occupants ro 
        WHERE ro."roomId" = rooms.id 
          AND ro.status = 'Active'
      ), 0)
    `);

    console.log('✅ Bed entity migration rolled back');
  }
}