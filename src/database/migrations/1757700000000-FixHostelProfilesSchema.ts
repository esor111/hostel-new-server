import { MigrationInterface, QueryRunner } from "typeorm";

export class FixHostelProfilesSchema1757700000000 implements MigrationInterface {
    name = 'FixHostelProfilesSchema1757700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔧 Fixing hostel_profiles table schema...');
        
        // Check if business_id column exists
        const businessIdExists = await queryRunner.hasColumn('hostel_profiles', 'business_id');
        
        if (!businessIdExists) {
            console.log('Adding business_id column...');
            
            // Add business_id column
            await queryRunner.query(`ALTER TABLE "hostel_profiles" ADD "business_id" character varying`);
            
            // Update existing records with a default business_id based on their ID
            await queryRunner.query(`
                UPDATE "hostel_profiles" 
                SET "business_id" = 'default-hostel-' || "id"::text 
                WHERE "business_id" IS NULL
            `);
            
            // Make it NOT NULL and add unique constraint
            await queryRunner.query(`ALTER TABLE "hostel_profiles" ALTER COLUMN "business_id" SET NOT NULL`);
            await queryRunner.query(`ALTER TABLE "hostel_profiles" ADD CONSTRAINT "UQ_hostel_business_id" UNIQUE ("business_id")`);
            
            console.log('✅ Added business_id column');
        } else {
            console.log('business_id column already exists');
        }
        
        // Check if is_active column exists
        const isActiveExists = await queryRunner.hasColumn('hostel_profiles', 'is_active');
        
        if (!isActiveExists) {
            console.log('Adding is_active column...');
            await queryRunner.query(`ALTER TABLE "hostel_profiles" ADD "is_active" boolean NOT NULL DEFAULT true`);
            console.log('✅ Added is_active column');
        } else {
            console.log('is_active column already exists');
        }
        
        // Check if createdAt column exists (BaseEntity columns)
        const createdAtExists = await queryRunner.hasColumn('hostel_profiles', 'createdAt');
        
        if (!createdAtExists) {
            console.log('Adding BaseEntity columns...');
            await queryRunner.query(`ALTER TABLE "hostel_profiles" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
            await queryRunner.query(`ALTER TABLE "hostel_profiles" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
            console.log('✅ Added BaseEntity columns');
        } else {
            console.log('BaseEntity columns already exist');
        }
        
        console.log('🎉 hostel_profiles schema fix completed!');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the columns we added
        const businessIdExists = await queryRunner.hasColumn('hostel_profiles', 'business_id');
        if (businessIdExists) {
            await queryRunner.query(`ALTER TABLE "hostel_profiles" DROP CONSTRAINT IF EXISTS "UQ_hostel_business_id"`);
            await queryRunner.query(`ALTER TABLE "hostel_profiles" DROP COLUMN "business_id"`);
        }
        
        const isActiveExists = await queryRunner.hasColumn('hostel_profiles', 'is_active');
        if (isActiveExists) {
            await queryRunner.query(`ALTER TABLE "hostel_profiles" DROP COLUMN "is_active"`);
        }
        
        // Note: We don't remove createdAt/updatedAt as they might be used by other parts
    }
}