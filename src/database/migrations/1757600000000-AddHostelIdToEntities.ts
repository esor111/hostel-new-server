import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHostelIdToEntities1757600000000 implements MigrationInterface {
    name = 'AddHostelIdToEntities1757600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('Starting multi-hostel migration...');

        // Step 1: Create hostels table if it doesn't exist (using hostel_profiles as the hostel table)
        const hostelTableExists = await queryRunner.hasTable('hostel_profiles');
        if (!hostelTableExists) {
            await queryRunner.query(`
                CREATE TABLE "hostel_profiles" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "business_id" character varying NOT NULL,
                    "hostel_name" character varying NOT NULL,
                    "is_active" boolean NOT NULL DEFAULT true,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_hostel_profiles" PRIMARY KEY ("id")
                )
            `);
        } else {
            // Check if the table has the old schema and needs to be updated
            console.log('Checking existing hostel_profiles table schema...');
            const columns = await queryRunner.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'hostel_profiles' 
                ORDER BY ordinal_position
            `);
            
            console.log('Current columns:', columns);
            
            // If table exists with old schema, we need to handle it appropriately
            // For now, we'll just proceed with the migration assuming the table exists
        }

        // Step 2: Create default hostel record if no hostels exist
        const existingHostels = await queryRunner.query(`SELECT COUNT(*) as count FROM "hostel_profiles"`);
        let defaultHostelId: string;
        
        if (parseInt(existingHostels[0].count) === 0) {
            console.log('Creating default hostel record...');
            
            // First, check what columns actually exist in the table
            const columnInfo = await queryRunner.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'hostel_profiles' 
                ORDER BY ordinal_position
            `);
            
            const columnNames = columnInfo.map(col => col.column_name);
            console.log('Available columns:', columnNames);
            
            // Determine which column names to use based on what exists
            if (columnNames.includes('business_id')) {
                // New schema
                console.log('Using new schema for hostel_profiles');
                const defaultHostelResult = await queryRunner.query(`
                    INSERT INTO "hostel_profiles" (
                        "business_id", "hostel_name"
                    ) VALUES (
                        'default-hostel-id', 'Default Hostel'
                    ) RETURNING "id"
                `);
                defaultHostelId = defaultHostelResult[0].id;
            } else if (columnNames.includes('hostel_name')) {
                // Old schema - use the old column names but with minimal data
                console.log('Using old schema for hostel_profiles');
                const defaultHostelResult = await queryRunner.query(`
                    INSERT INTO "hostel_profiles" (
                        "hostel_name", "owner_name", "email", "phone", "address", 
                        "province", "district", "description", "amenities", "policies", "pricing"
                    ) VALUES (
                        'Default Hostel', 'System Admin', 'admin@defaulthostel.com', '+1234567890', 
                        'Default Address', 'Default Province', 'Default District', 
                        'Default hostel created during multi-hostel migration',
                        '[]', '{}', '{}'
                    ) RETURNING "id"
                `);
                defaultHostelId = defaultHostelResult[0].id;
            } else {
                // Fallback - try to insert with whatever columns might exist
                console.log('Using fallback approach for hostel_profiles');
                // This is a simplified approach - in a real scenario, you might want to alter the table structure
                throw new Error('Unable to determine hostel_profiles table schema');
            }
        } else {
            // Use the first existing hostel as default
            const firstHostel = await queryRunner.query(`SELECT "id" FROM "hostel_profiles" LIMIT 1`);
            defaultHostelId = firstHostel[0].id;
        }

        console.log(`Using default hostel ID: ${defaultHostelId}`);

        // Step 3: Add hostelId columns (nullable initially) to all required tables
        const tables = [
            'rooms', 'students', 'beds', 'multi_guest_bookings', 'invoices', 
            'payments', 'ledger_entries', 'discounts', 'admin_charges', 'reports'
        ];

        for (const table of tables) {
            const tableExists = await queryRunner.hasTable(table);
            if (tableExists) {
                const columnExists = await queryRunner.hasColumn(table, 'hostelId');
                if (!columnExists) {
                    console.log(`Adding hostelId column to ${table}...`);
                    await queryRunner.query(`ALTER TABLE "${table}" ADD "hostelId" uuid`);
                }
            }
        }

        // Step 4: Update all existing records with default hostelId
        for (const table of tables) {
            const tableExists = await queryRunner.hasTable(table);
            if (tableExists) {
                console.log(`Updating existing records in ${table} with default hostelId...`);
                await queryRunner.query(`UPDATE "${table}" SET "hostelId" = $1 WHERE "hostelId" IS NULL`, [defaultHostelId]);
            }
        }

        // Step 5: Make hostelId columns non-nullable and add foreign key constraints
        for (const table of tables) {
            const tableExists = await queryRunner.hasTable(table);
            if (tableExists) {
                console.log(`Making hostelId non-nullable and adding constraints for ${table}...`);
                
                // Make column non-nullable
                await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "hostelId" SET NOT NULL`);
                
                // Add foreign key constraint
                const constraintName = `FK_${table}_hostelId`;
                await queryRunner.query(`
                    ALTER TABLE "${table}" 
                    ADD CONSTRAINT "${constraintName}" 
                    FOREIGN KEY ("hostelId") REFERENCES "hostel_profiles"("id") 
                    ON DELETE RESTRICT ON UPDATE CASCADE
                `);
            }
        }

        // Step 6: Add indexes for performance
        for (const table of tables) {
            const tableExists = await queryRunner.hasTable(table);
            if (tableExists) {
                console.log(`Adding index for ${table}.hostelId...`);
                const indexName = `IDX_${table}_hostelId`;
                await queryRunner.query(`CREATE INDEX "${indexName}" ON "${table}" ("hostelId")`);
            }
        }

        // Step 7: Handle beds table special case - hostelId should be derived from room
        const bedsTableExists = await queryRunner.hasTable('beds');
        const roomsTableExists = await queryRunner.hasTable('rooms');
        
        if (bedsTableExists && roomsTableExists) {
            console.log('Updating beds hostelId from room relationship...');
            await queryRunner.query(`
                UPDATE "beds" 
                SET "hostelId" = "rooms"."hostelId" 
                FROM "rooms" 
                WHERE "beds"."room_id" = "rooms"."id"
            `);
        }

        console.log('Multi-hostel migration completed successfully!');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('Rolling back multi-hostel migration...');

        const tables = [
            'reports', 'admin_charges', 'discounts', 'ledger_entries', 
            'payments', 'invoices', 'multi_guest_bookings', 'beds', 'students', 'rooms'
        ];

        // Remove foreign key constraints, indexes, and columns in reverse order
        for (const table of tables) {
            const tableExists = await queryRunner.hasTable(table);
            if (tableExists) {
                const columnExists = await queryRunner.hasColumn(table, 'hostelId');
                if (columnExists) {
                    console.log(`Removing hostelId constraints and column from ${table}...`);
                    
                    // Drop foreign key constraint
                    const constraintName = `FK_${table}_hostelId`;
                    try {
                        await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${constraintName}"`);
                    } catch (error) {
                        console.log(`Constraint ${constraintName} may not exist, continuing...`);
                    }
                    
                    // Drop index
                    const indexName = `IDX_${table}_hostelId`;
                    try {
                        await queryRunner.query(`DROP INDEX "${indexName}"`);
                    } catch (error) {
                        console.log(`Index ${indexName} may not exist, continuing...`);
                    }
                    
                    // Drop column
                    await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "hostelId"`);
                }
            }
        }

        // Note: We don't drop the hostel_profiles table as it might contain important data
        // and other hostels might be using the system
        console.log('Multi-hostel migration rollback completed!');
        console.log('Note: hostel_profiles table was not dropped to preserve data integrity');
    }
}