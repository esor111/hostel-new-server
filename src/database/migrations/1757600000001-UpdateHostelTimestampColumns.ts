import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateHostelTimestampColumns1757600000001 implements MigrationInterface {
    name = 'UpdateHostelTimestampColumns1757600000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the columns exist with old names
        const columns = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'hostel_profiles' 
            AND column_name IN ('created_at', 'updated_at')
        `);
        
        if (columns.length > 0) {
            console.log('Renaming timestamp columns in hostel_profiles table...');
            
            // Rename created_at to createdAt
            const hasCreatedAt = await queryRunner.hasColumn('hostel_profiles', 'created_at');
            if (hasCreatedAt) {
                await queryRunner.query(`ALTER TABLE "hostel_profiles" RENAME COLUMN "created_at" TO "createdAt"`);
                console.log('Renamed created_at to createdAt');
            }
            
            // Rename updated_at to updatedAt
            const hasUpdatedAt = await queryRunner.hasColumn('hostel_profiles', 'updated_at');
            if (hasUpdatedAt) {
                await queryRunner.query(`ALTER TABLE "hostel_profiles" RENAME COLUMN "updated_at" TO "updatedAt"`);
                console.log('Renamed updated_at to updatedAt');
            }
        } else {
            console.log('Columns already have correct names');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Check if the columns exist with new names
        const columns = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'hostel_profiles' 
            AND column_name IN ('createdAt', 'updatedAt')
        `);
        
        if (columns.length > 0) {
            console.log('Reverting timestamp column names in hostel_profiles table...');
            
            // Rename createdAt to created_at
            const hasCreatedAt = await queryRunner.hasColumn('hostel_profiles', 'createdAt');
            if (hasCreatedAt) {
                await queryRunner.query(`ALTER TABLE "hostel_profiles" RENAME COLUMN "createdAt" TO "created_at"`);
                console.log('Renamed createdAt to created_at');
            }
            
            // Rename updatedAt to updated_at
            const hasUpdatedAt = await queryRunner.hasColumn('hostel_profiles', 'updatedAt');
            if (hasUpdatedAt) {
                await queryRunner.query(`ALTER TABLE "hostel_profiles" RENAME COLUMN "updatedAt" TO "updated_at"`);
                console.log('Renamed updatedAt to updated_at');
            }
        } else {
            console.log('Columns already have correct names');
        }
    }
}